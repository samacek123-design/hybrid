/**
 * AI planning layer — OpenRouter as the "intelligent" program builder and
 * session-to-session re-planner, sitting *on top of* the deterministic rule
 * engine (engine.ts), never replacing it. Every entry point here degrades to
 * `null` on any failure (no key, offline, bad JSON, schema mismatch) so the
 * caller can fall back to `generateProgram()` / keep the engine's own
 * progression — the app must always work without AI.
 *
 * Key resolution: an on-device Settings override wins, else
 * EXPO_PUBLIC_OPENROUTER_API_KEY. The base URL is also overridable
 * (EXPO_PUBLIC_OPENROUTER_BASE_URL) so a server-side proxy can be dropped in
 * before a public launch without touching call sites — the client would
 * never need to hold a real key at that point.
 */
import { roundLoad, slotIdFor, type Baseline } from './engine';
import { ALL_EQUIPMENT, EXERCISES } from './exercises';
import type { AppState, Equipment, Goal, Program, SessionLog, Slot, Workout } from './types';

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'openai/gpt-4o-mini';
const WORKOUT_KEYS = ['A', 'B', 'C', 'D', 'E'];

function resolveApiKey(state: AppState): string | undefined {
  return state.aiSettings?.apiKey || process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || undefined;
}

export function hasAiConfigured(state: AppState): boolean {
  return Boolean(resolveApiKey(state));
}

function resolveModel(state: AppState): string {
  return state.aiSettings?.model || process.env.EXPO_PUBLIC_OPENROUTER_MODEL || DEFAULT_MODEL;
}

function resolveBaseUrl(): string {
  return process.env.EXPO_PUBLIC_OPENROUTER_BASE_URL || DEFAULT_BASE_URL;
}

type ChatMessage = { role: 'system' | 'user'; content: string };

async function callOpenRouter(state: AppState, messages: ChatMessage[]): Promise<string> {
  const apiKey = resolveApiKey(state);
  if (!apiKey) throw new Error('no OpenRouter API key configured');
  const res = await fetch(`${resolveBaseUrl()}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://hybrid.app',
      'X-Title': 'Hybrid',
    },
    body: JSON.stringify({
      model: resolveModel(state),
      messages,
      temperature: 0.4,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter error ${res.status}`);
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new Error('empty AI response');
  return content;
}

/** Best-effort JSON extraction — models occasionally wrap JSON in prose or fences. */
function extractJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    // fall through
  }
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {
      // fall through
    }
  }
  return null;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

// ---------------------------------------------------------------------------
// Program generation
// ---------------------------------------------------------------------------

export interface AIProgramInput {
  goal: Goal;
  frequency: number;
  sessionMinutes: number;
  equipment: Equipment[];
  baseline: Baseline;
  physiqueRef?: string;
}

const PROGRAM_SYSTEM_PROMPT = `You are an expert strength & conditioning coach embedded in a training app called Hybrid.
Return ONLY a single JSON object (no markdown fences, no commentary) matching exactly this shape:
{
  "workouts": [
    {
      "title": string,
      "focus": string,
      "domain": "strength" | "cardio",
      "exercises": [ { "name": string, "sets": number, "repLow": number, "repHigh": number, "restSec": number, "weightKg": number } ],
      "cardio": { "name": string, "distanceKm": number, "targetSec": number, "intensity": "easy" | "steady" | "tempo" }
    }
  ]
}
Rules:
- Return exactly the requested number of workouts, one per training day in the week, in the order they should be trained.
- Include "exercises" (non-empty) when domain is "strength"; include "cardio" when domain is "cardio". Never include both on one workout.
- Size volume (exercise count and sets per exercise) to the given session length so a real person can complete every prescribed set, including rest and a brief warm-up, within that time. Longer sessions should get more exercises and/or accessory work, not just more sets on the same few lifts.
- Balance weekly fatigue: don't hammer the same muscle group hard on back-to-back training days, and minimize redundant exercise overlap across the week.
- Apply progressive overload appropriate to the goal and the athlete's current strength baseline. "weightKg" must be a real, plate-loadable working weight for that specific exercise (not the athlete's estimated one-rep max).
- Prefer exercises the athlete can actually perform with their listed equipment; only suggest something outside it if the goal truly requires it.
- For goal "custom", the athlete has named an admired physique/athlete. Draw on well-known, publicly available information about that person's general training approach (typical split style, volume, favored movements) and adapt it realistically to the athlete's own stats, equipment and available time. Use general, well-established patterns for that kind of physique or sport rather than inventing implausibly specific claims.`;

function buildProgramMessages(input: AIProgramInput): ChatMessage[] {
  const payload = {
    goal: input.goal,
    physiqueRef: input.physiqueRef,
    frequency: input.frequency,
    sessionMinutes: input.sessionMinutes,
    equipment: input.equipment.length ? input.equipment : ALL_EQUIPMENT,
    strengthBaseline: {
      squat: input.baseline.squat,
      bench: input.baseline.bench,
      deadlift: input.baseline.deadlift,
    },
    comfortablePaceSecPerKm: input.baseline.paceSecPerKm,
    knownExercises: EXERCISES.map((e) => ({ name: e.name, group: e.group, equipment: e.equipment })),
  };
  return [
    { role: 'system', content: PROGRAM_SYSTEM_PROMPT },
    { role: 'user', content: JSON.stringify(payload) },
  ];
}

function buildProgramFromAiJson(json: unknown, input: AIProgramInput, now: Date): Program | null {
  if (!json || typeof json !== 'object' || !Array.isArray((json as { workouts?: unknown }).workouts)) return null;
  const rawWorkouts = (json as { workouts: unknown[] }).workouts;
  if (rawWorkouts.length !== input.frequency) return null;

  const workouts: Workout[] = [];
  const slots: Record<string, Slot> = {};

  for (let i = 0; i < rawWorkouts.length; i++) {
    const w = rawWorkouts[i] as Record<string, unknown>;
    if (!w || typeof w.title !== 'string' || typeof w.focus !== 'string') return null;
    if (w.domain !== 'strength' && w.domain !== 'cardio') return null;
    const key = WORKOUT_KEYS[i];
    const slotIds: string[] = [];

    if (w.domain === 'strength') {
      const exercises = w.exercises;
      if (!Array.isArray(exercises) || exercises.length === 0) return null;
      for (const raw of exercises) {
        const ex = raw as Record<string, unknown>;
        if (
          typeof ex?.name !== 'string' ||
          !ex.name.trim() ||
          !isFiniteNumber(ex.sets) ||
          ex.sets < 1 ||
          ex.sets > 10 ||
          !isFiniteNumber(ex.repLow) ||
          !isFiniteNumber(ex.repHigh) ||
          ex.repLow < 1 ||
          ex.repHigh < ex.repLow ||
          ex.repHigh > 50 ||
          !isFiniteNumber(ex.restSec) ||
          ex.restSec < 15 ||
          ex.restSec > 600 ||
          !isFiniteNumber(ex.weightKg) ||
          ex.weightKg < 0 ||
          ex.weightKg > 500
        ) {
          return null;
        }
        const id = slotIdFor(key, ex.name);
        slotIds.push(id);
        slots[id] = {
          id,
          domain: 'strength',
          workoutKey: key,
          name: ex.name,
          sets: Math.round(ex.sets),
          repRange: [Math.round(ex.repLow), Math.round(ex.repHigh)],
          restSec: Math.round(ex.restSec),
          weightKg: roundLoad(ex.weightKg),
        };
      }
    } else {
      const cd = w.cardio as Record<string, unknown> | undefined;
      if (
        !cd ||
        typeof cd.name !== 'string' ||
        !cd.name.trim() ||
        !isFiniteNumber(cd.distanceKm) ||
        cd.distanceKm <= 0 ||
        cd.distanceKm > 100 ||
        !isFiniteNumber(cd.targetSec) ||
        cd.targetSec <= 0 ||
        cd.targetSec > 6 * 3600 ||
        (cd.intensity !== 'easy' && cd.intensity !== 'steady' && cd.intensity !== 'tempo')
      ) {
        return null;
      }
      const id = slotIdFor(key, cd.name);
      slotIds.push(id);
      slots[id] = {
        id,
        domain: 'cardio',
        workoutKey: key,
        name: cd.name,
        distanceKm: cd.distanceKm,
        targetSec: Math.round(cd.targetSec),
        intensity: cd.intensity,
      };
    }

    workouts.push({ key, title: w.title, focus: w.focus, domain: w.domain, slotIds });
  }

  const blockEnd = new Date(now);
  blockEnd.setMonth(blockEnd.getMonth() + 3);

  return {
    id: `prog-ai-${now.getTime()}`,
    goal: input.goal,
    frequency: input.frequency,
    sessionMinutes: input.sessionMinutes,
    equipment: input.equipment,
    physiqueRef: input.physiqueRef,
    aiGenerated: true,
    startedAt: now.toISOString(),
    blockEndsAt: blockEnd.toISOString(),
    workouts,
    slots,
    cursor: 0,
  };
}

/** Returns null on any failure — caller should fall back to `generateProgram()`. */
export async function generateProgramAI(input: AIProgramInput, state: AppState, now: Date = new Date()): Promise<Program | null> {
  if (!hasAiConfigured(state)) return null;
  try {
    const content = await callOpenRouter(state, buildProgramMessages(input));
    const json = extractJson(content);
    return buildProgramFromAiJson(json, input, now);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Session-to-session re-planning
// ---------------------------------------------------------------------------

const REPLAN_SYSTEM_PROMPT = `You are refining next-session prescriptions for an existing training program based on how the last session actually went.
Return ONLY a single JSON object (no markdown fences, no commentary) matching exactly this shape:
{ "updates": [ { "slotId": string, "weightKg": number, "targetSec": number } ] }
Rules:
- Only reference "slotId" values given to you below; never invent new ones.
- For a strength slot, set "weightKg" to its new plate-loadable working weight in kilograms; omit "targetSec".
- For a cardio slot, set "targetSec" to its new target time in seconds for its full prescribed distance; omit "weightKg".
- Reflect progressive overload, accumulated fatigue, and how close the athlete came to the prior prescription.
- Leave a slot out of "updates" entirely if you would keep it unchanged.`;

function buildReplanMessages(program: Program, log: SessionLog): ChatMessage[] {
  const payload = {
    goal: program.goal,
    slots: Object.values(program.slots).map((s) =>
      s.domain === 'strength'
        ? { id: s.id, domain: 'strength', name: s.name, sets: s.sets, repRange: s.repRange, weightKg: s.weightKg }
        : { id: s.id, domain: 'cardio', name: s.name, distanceKm: s.distanceKm, targetSec: s.targetSec, intensity: s.intensity },
    ),
    lastSession: { workoutTitle: log.workoutTitle, results: log.results },
  };
  return [
    { role: 'system', content: REPLAN_SYSTEM_PROMPT },
    { role: 'user', content: JSON.stringify(payload) },
  ];
}

/** Returns null on any failure or if nothing validated — caller keeps the engine's own progression. */
export async function replanAfterSession(state: AppState, program: Program, log: SessionLog): Promise<Record<string, Slot> | null> {
  if (!hasAiConfigured(state)) return null;
  try {
    const content = await callOpenRouter(state, buildReplanMessages(program, log));
    const json = extractJson(content) as { updates?: unknown[] } | null;
    if (!json || !Array.isArray(json.updates)) return null;

    const updates: Record<string, Slot> = {};
    for (const raw of json.updates) {
      const u = raw as Record<string, unknown>;
      if (!u || typeof u.slotId !== 'string') continue;
      const slot = program.slots[u.slotId];
      if (!slot) continue;
      if (slot.domain === 'strength' && isFiniteNumber(u.weightKg) && u.weightKg >= 0 && u.weightKg <= 500) {
        updates[slot.id] = { ...slot, weightKg: roundLoad(u.weightKg) };
      } else if (slot.domain === 'cardio' && isFiniteNumber(u.targetSec) && u.targetSec > 0 && u.targetSec <= 6 * 3600) {
        updates[slot.id] = { ...slot, targetSec: Math.round(u.targetSec) };
      }
    }
    return Object.keys(updates).length > 0 ? updates : null;
  } catch {
    return null;
  }
}
