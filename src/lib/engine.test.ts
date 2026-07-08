/**
 * Engine invariant checks. Run with: node src/lib/engine.test.ts
 * (Node 22+ strips types natively.)
 */
import assert from 'node:assert';
import {
  completeSession,
  exerciseCountFor,
  fmtDuration,
  fmtPace,
  generateProgram,
  nextCardioTarget,
  nextStrengthWeight,
  scoreCardio,
  scoreStrength,
  sessionsThisWeek,
  type Baseline,
} from './engine.ts';
import { EXERCISES } from './exercises.ts';
import type { AppState, CardioSlot, StrengthSlot } from './types.ts';

const baseline: Baseline = {
  squat: { weightKg: 100, reps: 5 },
  bench: { weightKg: 80, reps: 5 },
  deadlift: { weightKg: 120, reps: 5 },
  paceSecPerKm: 360, // 6:00/km
};

// --- program generation ---
for (const freq of [2, 3, 4, 5]) {
  const p = generateProgram('hypertrophy', freq, baseline, new Date('2026-01-05'));
  const expected = { 2: 3, 3: 3, 4: 4, 5: 5 }[freq];
  assert.equal(p.workouts.length, expected, `freq ${freq} rotation size`);
  assert.ok(p.workouts.some((w) => w.domain === 'cardio'), `freq ${freq} has a cardio slot`);
  for (const w of p.workouts) for (const id of w.slotIds) assert.ok(p.slots[id], `slot ${id} exists`);
}
const prog = generateProgram('hypertrophy', 3, baseline, new Date('2026-01-05'));
assert.equal(new Date(prog.blockEndsAt).getMonth(), 3, 'block ends 3 months out');

// --- session-duration volume sizing ---
assert.ok(exerciseCountFor('strength', 30) < exerciseCountFor('strength', 90), 'longer sessions get more exercises');
assert.ok(exerciseCountFor('hypertrophy', 60) >= 3, 'a 60min session always fits at least 3 exercises');
const shortProg = generateProgram('hypertrophy', 3, baseline, new Date('2026-01-05'), { sessionMinutes: 30 });
const longProg = generateProgram('hypertrophy', 3, baseline, new Date('2026-01-05'), { sessionMinutes: 90 });
const strengthSlotCount = (p: typeof prog) =>
  p.workouts.filter((w) => w.domain === 'strength').reduce((acc, w) => acc + w.slotIds.length, 0);
assert.ok(strengthSlotCount(shortProg) < strengthSlotCount(longProg), '90min program has more total volume than 30min');

// --- custom goal (physique-inspired) falls back cleanly ---
const customProg = generateProgram('custom', 3, baseline, new Date('2026-01-05'), { physiqueRef: 'Chris Hemsworth' });
assert.equal(customProg.physiqueRef, 'Chris Hemsworth');
assert.ok(customProg.workouts.every((w) => w.slotIds.length > 0), 'custom goal still produces complete workouts');

// --- equipment filtering ---
const bodyweightOnly = generateProgram('health', 3, baseline, new Date('2026-01-05'), { equipment: ['bodyweight'] });
const bwSlots = Object.values(bodyweightOnly.slots).filter((s) => s.domain === 'strength') as StrengthSlot[];
assert.ok(bwSlots.length > 0, 'equipment filter still yields exercises');
for (const s of bwSlots) {
  const def = EXERCISES.find((e) => e.name === s.name)!;
  assert.ok(def.equipment.includes('bodyweight'), `${s.name} respects the bodyweight-only filter`);
}

// --- strength scoring ---
assert.equal(prog.sessionMinutes, 60, 'default session length is 60 min');
const squat = Object.values(prog.slots).find((s) => s.domain === 'strength' && s.name === 'Back Squat') as StrengthSlot;
assert.ok(squat.weightKg > 0 && squat.weightKg % 1.25 === 0, 'weight is plate-loadable');
const w = squat.weightKg;
assert.equal(scoreStrength(squat, [
  { weightKg: w, reps: 12 }, { weightKg: w, reps: 12 }, { weightKg: w, reps: 12 },
]), 'beat');
assert.equal(scoreStrength(squat, [
  { weightKg: w, reps: 10 }, { weightKg: w, reps: 9 }, { weightKg: w, reps: 8 },
]), 'hit');
assert.equal(scoreStrength(squat, [
  { weightKg: w, reps: 12 }, { weightKg: w, reps: 10 }, { weightKg: w, reps: 6 },
]), 'held');
assert.equal(scoreStrength(squat, [{ weightKg: w, reps: 5 }]), 'missed');

// --- progression rules ---
assert.ok(nextStrengthWeight(squat, 'beat', 'hypertrophy') > w, 'beat increases');
assert.ok(nextStrengthWeight(squat, 'hit', 'hypertrophy') >= w, 'hit nudges');
assert.equal(nextStrengthWeight(squat, 'held', 'hypertrophy'), w, 'held repeats');
assert.ok(nextStrengthWeight(squat, 'missed', 'hypertrophy') < w, 'missed deloads');

// --- cardio scoring ---
const run = Object.values(prog.slots).find((s) => s.domain === 'cardio') as CardioSlot;
assert.equal(scoreCardio(run, run.targetSec - 60, run.distanceKm), 'beat');
assert.equal(scoreCardio(run, run.targetSec * 1.04, run.distanceKm), 'hit');
assert.equal(scoreCardio(run, run.targetSec, run.distanceKm * 0.8), 'held');
assert.equal(scoreCardio(run, run.targetSec, run.distanceKm * 0.3), 'missed');
assert.ok(nextCardioTarget(run, 'beat') < run.targetSec, 'beat tightens target');
assert.ok(nextCardioTarget(run, 'missed') > run.targetSec, 'missed eases target');

// --- completeSession: rotation advance, prescriptions, PRs ---
let state: AppState = { program: prog, logs: [], athlete: 'Test' };
const day1 = new Date('2026-01-05T10:00:00');

// Session 1 (workout A: Upper) — beat everything
const wA = prog.workouts[0];
state = completeSession(
  state,
  wA.slotIds.map((slotId) => {
    const s = prog.slots[slotId] as StrengthSlot;
    return { slotId, sets: Array.from({ length: s.sets }, () => ({ weightKg: s.weightKg, reps: s.repRange[1] })) };
  }),
  [],
  day1,
);
assert.equal(state.logs.length, 1);
assert.equal(state.program!.cursor, 1, 'cursor advanced');
assert.ok(state.logs[0].results.every((r) => r.outcome === 'beat'));
assert.ok(state.logs[0].results.every((r) => !r.isPr), 'no PR on first exposure');
const benchA = wA.slotIds.find((id) => id.includes('bench'))!;
const oldBench = (prog.slots[benchA] as StrengthSlot).weightKg;
const newBench = (state.program!.slots[benchA] as StrengthSlot).weightKg;
assert.ok(newBench > oldBench, 'beat slot got a heavier prescription');

// Sessions 2+3 to come back around to A
state = completeSession(state, state.program!.workouts[1].slotIds.map((slotId) => {
  const s = state.program!.slots[slotId] as StrengthSlot;
  return { slotId, sets: [{ weightKg: s.weightKg, reps: s.repRange[0] }] };
}), [], new Date('2026-01-07T10:00:00'));
const runSlot = state.program!.workouts[2].slotIds[0];
const runTarget = (state.program!.slots[runSlot] as CardioSlot).targetSec;
state = completeSession(state, [], [
  { slotId: runSlot, durationSec: runTarget - 30, distanceKm: (state.program!.slots[runSlot] as CardioSlot).distanceKm },
], new Date('2026-01-09T10:00:00'));
assert.equal(state.program!.cursor, 0, 'rotation wraps back to A');

// Session 4: beat the heavier bench → should be a PR now
const s4bench = state.program!.slots[benchA] as StrengthSlot;
state = completeSession(state, [
  { slotId: benchA, sets: Array.from({ length: s4bench.sets }, () => ({ weightKg: s4bench.weightKg, reps: s4bench.repRange[1] })) },
], [], new Date('2026-01-12T10:00:00'));
const benchResult = state.logs.at(-1)!.results.find((r) => r.slotId === benchA)!;
assert.ok(benchResult.isPr, 'beating a heavier prescription is a PR');

// --- weekly count ---
assert.equal(sessionsThisWeek(state.logs, new Date('2026-01-07T12:00:00')), 3, 'Jan 5/7/9 fall in week of Jan 5; Jan 12 does not');

// --- formatting ---
assert.equal(fmtDuration(95), '1:35');
assert.equal(fmtDuration(3725), '1:02:05');
assert.equal(fmtPace(330), `5'30"`);

console.log('✓ all engine tests passed');
