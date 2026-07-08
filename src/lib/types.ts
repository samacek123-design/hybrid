/**
 * Core domain types. Everything hangs off the "slot" — a repeatable unit
 * (one exercise in one workout, or one cardio assignment) whose every appearance
 * is directly comparable to its previous appearance.
 */

export type Goal = 'strength' | 'hypertrophy' | 'health';
export type Domain = 'strength' | 'cardio';

export type Outcome = 'beat' | 'hit' | 'held' | 'missed';

export interface StrengthSlot {
  id: string; // stable, e.g. "A:squat"
  domain: 'strength';
  workoutKey: string;
  name: string;
  sets: number;
  repRange: [number, number];
  restSec: number;
  /** current prescribed working weight in kg */
  weightKg: number;
}

export interface CardioSlot {
  id: string; // e.g. "C:tempo-run"
  domain: 'cardio';
  workoutKey: string;
  name: string;
  distanceKm: number;
  /** current prescribed total time in seconds */
  targetSec: number;
  intensity: 'easy' | 'steady' | 'tempo';
}

export type Slot = StrengthSlot | CardioSlot;

export interface Workout {
  key: string; // 'A' | 'B' | ...
  title: string;
  focus: string;
  domain: Domain; // dominant domain, for color coding
  slotIds: string[];
}

export interface Program {
  id: string;
  goal: Goal;
  /** sessions per week — also the weekly target */
  frequency: number;
  startedAt: string; // ISO date
  blockEndsAt: string; // ISO date, +3 months
  workouts: Workout[];
  slots: Record<string, Slot>;
  /** rotation cursor: index into workouts, advances on completion only */
  cursor: number;
}

export interface SetEntry {
  weightKg: number;
  reps: number;
}

export interface StrengthResult {
  slotId: string;
  domain: 'strength';
  prescribedWeightKg: number;
  targetReps: number; // per-set target (top of range)
  sets: SetEntry[];
  outcome: Outcome;
  est1Rm: number;
  isPr: boolean;
}

export interface CardioResult {
  slotId: string;
  domain: 'cardio';
  prescribedSec: number;
  distanceKm: number;
  durationSec: number;
  outcome: Outcome;
  paceSecPerKm: number;
  isPr: boolean;
}

export type SlotResult = StrengthResult | CardioResult;

export interface SessionLog {
  id: string;
  workoutKey: string;
  workoutTitle: string;
  date: string; // ISO datetime
  results: SlotResult[];
}

export interface AppState {
  program: Program | null;
  logs: SessionLog[];
  /** display name chosen at onboarding (optional) */
  athlete: string;
}

export const EMPTY_STATE: AppState = { program: null, logs: [], athlete: '' };
