/**
 * The comparability engine: program generation, slot-based rotation,
 * rule-based progressive overload, and PR detection.
 *
 * All functions are pure — no I/O, no dates read from the clock unless
 * passed in — so the whole thing is testable with plain node.
 */

import type {
  AppState,
  CardioResult,
  CardioSlot,
  Goal,
  Program,
  SessionLog,
  SetEntry,
  Slot,
  SlotResult,
  StrengthResult,
  StrengthSlot,
  Workout,
} from './types';

// ---------------------------------------------------------------------------
// Prescription parameters per goal
// ---------------------------------------------------------------------------

export const GOAL_PARAMS: Record<
  Goal,
  {
    label: string;
    sets: number;
    repRange: [number, number];
    restSec: number;
    /** working weight as a fraction of estimated 1RM */
    workingPct: number;
    /** weight bump when a slot is beaten */
    incrementPct: number;
    cardio: { intensity: 'easy' | 'steady' | 'tempo'; distanceKm: number };
  }
> = {
  strength: {
    label: 'Strength',
    sets: 4,
    repRange: [3, 5],
    restSec: 180,
    workingPct: 0.85,
    incrementPct: 0.025,
    cardio: { intensity: 'tempo', distanceKm: 3 },
  },
  hypertrophy: {
    label: 'Hypertrophy',
    sets: 3,
    repRange: [8, 12],
    restSec: 90,
    workingPct: 0.7,
    incrementPct: 0.025,
    cardio: { intensity: 'steady', distanceKm: 4 },
  },
  health: {
    label: 'General health',
    sets: 3,
    repRange: [10, 15],
    restSec: 60,
    workingPct: 0.6,
    incrementPct: 0.025,
    cardio: { intensity: 'easy', distanceKm: 5 },
  },
};

// ---------------------------------------------------------------------------
// Baselines
// ---------------------------------------------------------------------------

export interface Baseline {
  /** best recent set for the three anchor lifts */
  squat: SetEntry;
  bench: SetEntry;
  deadlift: SetEntry;
  /** recent comfortable pace, seconds per km */
  paceSecPerKm: number;
}

/** Epley estimated one-rep max. */
export function est1Rm(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  return weightKg * (1 + reps / 30);
}

/** Round a load to a realistically plate-loadable increment. */
export function roundLoad(kg: number): number {
  const step = kg >= 60 ? 2.5 : 1.25;
  return Math.max(step, Math.round(kg / step) * step);
}

/**
 * Derive a working weight for an exercise from the three anchor lifts.
 * Ratios are conventional strength-standard heuristics — good enough to
 * start; the progression rules correct any error within 2–3 sessions.
 */
const LIFT_RATIOS: Record<string, { anchor: keyof Omit<Baseline, 'paceSecPerKm'>; ratio: number }> = {
  'Back Squat': { anchor: 'squat', ratio: 1 },
  'Bench Press': { anchor: 'bench', ratio: 1 },
  Deadlift: { anchor: 'deadlift', ratio: 1 },
  'Overhead Press': { anchor: 'bench', ratio: 0.62 },
  'Barbell Row': { anchor: 'deadlift', ratio: 0.55 },
  'Romanian Deadlift': { anchor: 'deadlift', ratio: 0.7 },
  'Front Squat': { anchor: 'squat', ratio: 0.8 },
  'Incline Bench': { anchor: 'bench', ratio: 0.8 },
  'Lat Pulldown': { anchor: 'bench', ratio: 0.65 },
  'Hip Thrust': { anchor: 'squat', ratio: 1.05 },
  'Walking Lunge': { anchor: 'squat', ratio: 0.4 },
  'Dumbbell Curl': { anchor: 'bench', ratio: 0.16 },
  'Seated Cable Row': { anchor: 'deadlift', ratio: 0.5 },
} as const;

export function workingWeight(exercise: string, goal: Goal, baseline: Baseline): number {
  const map = LIFT_RATIOS[exercise] ?? { anchor: 'squat' as const, ratio: 0.5 };
  const anchorSet = baseline[map.anchor];
  const max = est1Rm(anchorSet.weightKg, anchorSet.reps);
  return roundLoad(max * map.ratio * GOAL_PARAMS[goal].workingPct);
}

// ---------------------------------------------------------------------------
// Program generation (frequency → rotation)
// ---------------------------------------------------------------------------

interface WorkoutTemplate {
  title: string;
  focus: string;
  domain: 'strength' | 'cardio';
  exercises?: string[];
  cardio?: { name: string };
}

const ROTATIONS: Record<number, WorkoutTemplate[]> = {
  2: [
    { title: 'Full Body I', focus: 'Squat emphasis', domain: 'strength', exercises: ['Back Squat', 'Bench Press', 'Barbell Row'] },
    { title: 'Roadwork', focus: 'Run', domain: 'cardio', cardio: { name: 'Run' } },
    { title: 'Full Body II', focus: 'Hinge emphasis', domain: 'strength', exercises: ['Deadlift', 'Overhead Press', 'Lat Pulldown'] },
  ],
  3: [
    { title: 'Upper', focus: 'Push + pull', domain: 'strength', exercises: ['Bench Press', 'Barbell Row', 'Overhead Press'] },
    { title: 'Lower', focus: 'Squat + hinge', domain: 'strength', exercises: ['Back Squat', 'Romanian Deadlift', 'Walking Lunge'] },
    { title: 'Roadwork', focus: 'Run', domain: 'cardio', cardio: { name: 'Run' } },
  ],
  4: [
    { title: 'Upper', focus: 'Push + pull', domain: 'strength', exercises: ['Bench Press', 'Barbell Row', 'Overhead Press'] },
    { title: 'Lower', focus: 'Squat + hinge', domain: 'strength', exercises: ['Back Squat', 'Romanian Deadlift', 'Walking Lunge'] },
    { title: 'Roadwork', focus: 'Run', domain: 'cardio', cardio: { name: 'Run' } },
    { title: 'Full Body', focus: 'Heavy compound', domain: 'strength', exercises: ['Deadlift', 'Incline Bench', 'Seated Cable Row'] },
  ],
  5: [
    { title: 'Push', focus: 'Chest + shoulders', domain: 'strength', exercises: ['Bench Press', 'Overhead Press', 'Incline Bench'] },
    { title: 'Pull', focus: 'Back + arms', domain: 'strength', exercises: ['Deadlift', 'Lat Pulldown', 'Dumbbell Curl'] },
    { title: 'Tempo Run', focus: 'Pace work', domain: 'cardio', cardio: { name: 'Tempo Run' } },
    { title: 'Legs', focus: 'Squat + accessories', domain: 'strength', exercises: ['Back Squat', 'Hip Thrust', 'Walking Lunge'] },
    { title: 'Long Run', focus: 'Aerobic base', domain: 'cardio', cardio: { name: 'Long Run' } },
  ],
};

const WORKOUT_KEYS = ['A', 'B', 'C', 'D', 'E'];

export function generateProgram(
  goal: Goal,
  frequency: number,
  baseline: Baseline,
  now: Date = new Date(),
): Program {
  const templates = ROTATIONS[frequency] ?? ROTATIONS[3];
  const params = GOAL_PARAMS[goal];
  const workouts: Workout[] = [];
  const slots: Record<string, Slot> = {};

  templates.forEach((t, i) => {
    const key = WORKOUT_KEYS[i];
    const slotIds: string[] = [];
    if (t.domain === 'strength' && t.exercises) {
      for (const name of t.exercises) {
        const id = `${key}:${name.toLowerCase().replace(/\s+/g, '-')}`;
        slotIds.push(id);
        const slot: StrengthSlot = {
          id,
          domain: 'strength',
          workoutKey: key,
          name,
          sets: params.sets,
          repRange: params.repRange,
          restSec: params.restSec,
          weightKg: workingWeight(name, goal, baseline),
        };
        slots[id] = slot;
      }
    } else if (t.cardio) {
      // Long runs go further; tempo runs go faster.
      const isLong = t.cardio.name === 'Long Run';
      const distanceKm = isLong ? params.cardio.distanceKm + 2 : params.cardio.distanceKm;
      const paceFactor = t.cardio.name === 'Tempo Run' ? 0.94 : isLong ? 1.08 : 1;
      const id = `${key}:${t.cardio.name.toLowerCase().replace(/\s+/g, '-')}`;
      slotIds.push(id);
      const slot: CardioSlot = {
        id,
        domain: 'cardio',
        workoutKey: key,
        name: t.cardio.name,
        distanceKm,
        targetSec: Math.round(baseline.paceSecPerKm * paceFactor * distanceKm),
        intensity: params.cardio.intensity,
      };
      slots[id] = slot;
    }
    workouts.push({ key, title: t.title, focus: t.focus, domain: t.domain, slotIds });
  });

  const blockEnd = new Date(now);
  blockEnd.setMonth(blockEnd.getMonth() + 3);

  return {
    id: `prog-${now.getTime()}`,
    goal,
    frequency,
    startedAt: now.toISOString(),
    blockEndsAt: blockEnd.toISOString(),
    workouts,
    slots,
    cursor: 0,
  };
}

/**
 * Recover a Baseline from a live program, so goal/frequency changes reprint
 * the program at *current* strength — progress carries across reprints.
 * Each strength slot's weight is inverted through its anchor ratio and the
 * estimates per anchor are averaged.
 */
export function baselineFromProgram(program: Program): Baseline {
  const pct = GOAL_PARAMS[program.goal].workingPct;
  const est: Record<'squat' | 'bench' | 'deadlift', number[]> = { squat: [], bench: [], deadlift: [] };
  let paceSum = 0;
  let paceN = 0;
  for (const slot of Object.values(program.slots)) {
    if (slot.domain === 'strength') {
      const map = LIFT_RATIOS[slot.name];
      if (map) est[map.anchor].push(slot.weightKg / (map.ratio * pct));
    } else {
      const factor = slot.name === 'Tempo Run' ? 0.94 : slot.name === 'Long Run' ? 1.08 : 1;
      paceSum += slot.targetSec / slot.distanceKm / factor;
      paceN++;
    }
  }
  const avg = (xs: number[], fallback: number) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : fallback);
  // convert estimated 1RM back to a representative 5-rep baseline set
  const toSet = (oneRm: number): SetEntry => ({ weightKg: roundLoad(oneRm / (1 + 5 / 30)), reps: 5 });
  return {
    squat: toSet(avg(est.squat, 80)),
    bench: toSet(avg(est.bench, 60)),
    deadlift: toSet(avg(est.deadlift, 100)),
    paceSecPerKm: paceN ? Math.round(paceSum / paceN) : 360,
  };
}

// ---------------------------------------------------------------------------
// Outcome scoring + progression rules
// ---------------------------------------------------------------------------

/**
 * Score a strength slot against its prescription.
 *  beat  — every set at (or above) the top of the rep range at prescribed weight
 *  hit   — every set within the rep range
 *  held  — total reps ≥ 75% of target volume
 *  missed— below that, by a real margin
 */
export function scoreStrength(slot: StrengthSlot, sets: SetEntry[]): StrengthResult['outcome'] {
  const [low, high] = slot.repRange;
  const done = sets.filter((s) => s.reps > 0);
  if (done.length === 0) return 'missed';
  const targetVolume = slot.sets * high;
  const volume = done.reduce((acc, s) => acc + s.reps, 0);
  const atWeight = done.every((s) => s.weightKg >= slot.weightKg);
  if (atWeight && done.length >= slot.sets && done.every((s) => s.reps >= high)) return 'beat';
  if (atWeight && done.length >= slot.sets && done.every((s) => s.reps >= low)) return 'hit';
  if (volume >= targetVolume * 0.75) return 'held';
  return 'missed';
}

export function scoreCardio(slot: CardioSlot, durationSec: number, distanceKm: number): CardioResult['outcome'] {
  if (distanceKm <= 0 || durationSec <= 0) return 'missed';
  const targetPace = slot.targetSec / slot.distanceKm;
  const pace = durationSec / distanceKm;
  if (distanceKm >= slot.distanceKm && pace <= targetPace) return 'beat';
  if (distanceKm >= slot.distanceKm * 0.95 && pace <= targetPace * 1.05) return 'hit';
  if (distanceKm >= slot.distanceKm * 0.75) return 'held';
  return 'missed';
}

/** Next prescription for a strength slot given this session's outcome. */
export function nextStrengthWeight(slot: StrengthSlot, outcome: StrengthResult['outcome'], goal: Goal): number {
  const inc = GOAL_PARAMS[goal].incrementPct;
  switch (outcome) {
    case 'beat':
      return roundLoad(slot.weightKg * (1 + inc * 2)); // full jump: +5%
    case 'hit':
      return roundLoad(slot.weightKg * (1 + inc)); // +2.5%
    case 'held':
      return slot.weightKg; // repeat
    case 'missed':
      return roundLoad(slot.weightKg * 0.95); // slight deload, re-attempt
  }
}

/** Next target time for a cardio slot. */
export function nextCardioTarget(slot: CardioSlot, outcome: CardioResult['outcome']): number {
  switch (outcome) {
    case 'beat':
      return Math.round(slot.targetSec * 0.99); // 1% faster
    case 'hit':
      return Math.round(slot.targetSec * 0.995);
    case 'held':
      return slot.targetSec;
    case 'missed':
      return Math.round(slot.targetSec * 1.03); // ease off, rebuild
  }
}

// ---------------------------------------------------------------------------
// PR detection
// ---------------------------------------------------------------------------

export function bestStrengthPr(logs: SessionLog[], slotName: string, slots: Record<string, Slot>): number {
  let best = 0;
  for (const log of logs) {
    for (const r of log.results) {
      if (r.domain !== 'strength') continue;
      const s = slots[r.slotId];
      if (!s || s.name !== slotName) continue;
      if (r.est1Rm > best) best = r.est1Rm;
    }
  }
  return best;
}

export function bestCardioPace(logs: SessionLog[], slotId: string): number {
  let best = Infinity;
  for (const log of logs) {
    for (const r of log.results) {
      if (r.domain === 'cardio' && r.slotId === slotId && r.paceSecPerKm < best) best = r.paceSecPerKm;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Session completion — the single state transition
// ---------------------------------------------------------------------------

export interface StrengthEntry {
  slotId: string;
  sets: SetEntry[];
}
export interface CardioEntry {
  slotId: string;
  durationSec: number;
  distanceKm: number;
}

/**
 * Complete the current workout: score every slot, detect PRs, advance the
 * rotation cursor, and write next-session prescriptions back onto the slots.
 */
export function completeSession(
  state: AppState,
  strengthEntries: StrengthEntry[],
  cardioEntries: CardioEntry[],
  now: Date = new Date(),
): AppState {
  const program = state.program;
  if (!program) return state;
  const workout = program.workouts[program.cursor % program.workouts.length];
  const results: SlotResult[] = [];
  const newSlots: Record<string, Slot> = { ...program.slots };

  for (const entry of strengthEntries) {
    const slot = program.slots[entry.slotId];
    if (!slot || slot.domain !== 'strength') continue;
    const outcome = scoreStrength(slot, entry.sets);
    const bestSet = entry.sets.reduce(
      (acc, s) => (est1Rm(s.weightKg, s.reps) > est1Rm(acc.weightKg, acc.reps) ? s : acc),
      { weightKg: 0, reps: 0 },
    );
    const oneRm = est1Rm(bestSet.weightKg, bestSet.reps);
    const prevBest = bestStrengthPr(state.logs, slot.name, program.slots);
    results.push({
      slotId: slot.id,
      domain: 'strength',
      prescribedWeightKg: slot.weightKg,
      targetReps: slot.repRange[1],
      sets: entry.sets,
      outcome,
      est1Rm: oneRm,
      // a PR requires a previous best to beat — first exposure can't be a PR
      isPr: prevBest > 0 && oneRm > prevBest,
    });
    newSlots[slot.id] = { ...slot, weightKg: nextStrengthWeight(slot, outcome, program.goal) };
  }

  for (const entry of cardioEntries) {
    const slot = program.slots[entry.slotId];
    if (!slot || slot.domain !== 'cardio') continue;
    const outcome = scoreCardio(slot, entry.durationSec, entry.distanceKm);
    const pace = entry.distanceKm > 0 ? entry.durationSec / entry.distanceKm : Infinity;
    const prevBest = bestCardioPace(state.logs, slot.id);
    results.push({
      slotId: slot.id,
      domain: 'cardio',
      prescribedSec: slot.targetSec,
      distanceKm: entry.distanceKm,
      durationSec: entry.durationSec,
      outcome,
      paceSecPerKm: pace,
      // like strength: a PR needs a previous best to beat
      isPr: isFinite(prevBest) && pace < prevBest,
    });
    newSlots[slot.id] = { ...slot, targetSec: nextCardioTarget(slot, outcome) };
  }

  const log: SessionLog = {
    id: `log-${now.getTime()}`,
    workoutKey: workout.key,
    workoutTitle: workout.title,
    date: now.toISOString(),
    results,
  };

  return {
    ...state,
    program: {
      ...program,
      slots: newSlots,
      cursor: (program.cursor + 1) % program.workouts.length,
    },
    logs: [...state.logs, log],
  };
}

// ---------------------------------------------------------------------------
// Derived views (weekly target, block progress, streaks)
// ---------------------------------------------------------------------------

export function startOfWeek(d: Date): Date {
  const out = new Date(d);
  const day = (out.getDay() + 6) % 7; // Monday = 0
  out.setDate(out.getDate() - day);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function sessionsThisWeek(logs: SessionLog[], now: Date = new Date()): number {
  const monday = startOfWeek(now).getTime();
  const nextMonday = monday + 7 * 24 * 3600 * 1000;
  return logs.filter((l) => {
    const t = new Date(l.date).getTime();
    return t >= monday && t < nextMonday;
  }).length;
}

export function blockProgress(program: Program, now: Date = new Date()): number {
  const start = new Date(program.startedAt).getTime();
  const end = new Date(program.blockEndsAt).getTime();
  if (end <= start) return 1;
  return Math.min(1, Math.max(0, (now.getTime() - start) / (end - start)));
}

export function weeksInBlock(program: Program): number {
  const start = new Date(program.startedAt).getTime();
  const end = new Date(program.blockEndsAt).getTime();
  return Math.max(1, Math.round((end - start) / (7 * 24 * 3600 * 1000)));
}

/** Format seconds as m:ss or h:mm:ss. */
export function fmtDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/** Format a pace in sec/km as m'ss" per km. */
export function fmtPace(secPerKm: number): string {
  if (!isFinite(secPerKm) || secPerKm <= 0) return '—';
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
}
