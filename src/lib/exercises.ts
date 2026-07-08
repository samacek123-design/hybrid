/**
 * Exercise catalog — the single source of truth for every liftable movement
 * the engine and the AI planner know about. Each entry's `ratio` expresses
 * its typical working weight as a fraction of the anchor lift's estimated
 * 1RM (see `workingWeight` in engine.ts) — conventional strength-standard
 * heuristics, good enough to start; progression corrects any error within
 * 2–3 sessions.
 *
 * `group` drives fallback-program exercise selection (engine.ts round-robins
 * across the groups a workout template calls for). Within a group, entries
 * are ordered compound-first so the primary barbell lift is always picked
 * before its accessories.
 */
import type { Equipment } from './types';

export type ExerciseGroup = 'push' | 'pull' | 'legs' | 'hinge' | 'core' | 'carry';

export interface ExerciseDef {
  name: string;
  group: ExerciseGroup;
  anchor: 'squat' | 'bench' | 'deadlift';
  ratio: number;
  equipment: Equipment[];
  compound: boolean;
}

export const EXERCISES: ExerciseDef[] = [
  // --- push ------------------------------------------------------------
  { name: 'Bench Press', group: 'push', anchor: 'bench', ratio: 1, equipment: ['barbell'], compound: true },
  { name: 'Incline Bench', group: 'push', anchor: 'bench', ratio: 0.8, equipment: ['barbell'], compound: true },
  { name: 'Overhead Press', group: 'push', anchor: 'bench', ratio: 0.62, equipment: ['barbell'], compound: true },
  { name: 'Dumbbell Bench Press', group: 'push', anchor: 'bench', ratio: 0.9, equipment: ['dumbbell'], compound: true },
  { name: 'Dumbbell Shoulder Press', group: 'push', anchor: 'bench', ratio: 0.55, equipment: ['dumbbell'], compound: true },
  { name: 'Incline Dumbbell Press', group: 'push', anchor: 'bench', ratio: 0.75, equipment: ['dumbbell'], compound: true },
  { name: 'Push-Up', group: 'push', anchor: 'bench', ratio: 0.5, equipment: ['bodyweight'], compound: true },
  { name: 'Dip', group: 'push', anchor: 'bench', ratio: 0.65, equipment: ['bodyweight'], compound: true },
  { name: 'Machine Chest Press', group: 'push', anchor: 'bench', ratio: 0.85, equipment: ['machine'], compound: true },
  { name: 'Machine Shoulder Press', group: 'push', anchor: 'bench', ratio: 0.6, equipment: ['machine'], compound: true },
  { name: 'Cable Chest Fly', group: 'push', anchor: 'bench', ratio: 0.25, equipment: ['cable'], compound: false },
  { name: 'Lateral Raise', group: 'push', anchor: 'bench', ratio: 0.12, equipment: ['dumbbell'], compound: false },
  { name: 'Triceps Pushdown', group: 'push', anchor: 'bench', ratio: 0.25, equipment: ['cable'], compound: false },
  { name: 'Overhead Triceps Extension', group: 'push', anchor: 'bench', ratio: 0.2, equipment: ['dumbbell'], compound: false },

  // --- pull --------------------------------------------------------------
  { name: 'Barbell Row', group: 'pull', anchor: 'deadlift', ratio: 0.55, equipment: ['barbell'], compound: true },
  { name: 'Deadlift', group: 'pull', anchor: 'deadlift', ratio: 1, equipment: ['barbell'], compound: true },
  { name: 'Pendlay Row', group: 'pull', anchor: 'deadlift', ratio: 0.5, equipment: ['barbell'], compound: true },
  { name: 'Lat Pulldown', group: 'pull', anchor: 'bench', ratio: 0.65, equipment: ['cable'], compound: true },
  { name: 'Pull-Up', group: 'pull', anchor: 'bench', ratio: 0.7, equipment: ['bodyweight'], compound: true },
  { name: 'Chin-Up', group: 'pull', anchor: 'bench', ratio: 0.7, equipment: ['bodyweight'], compound: true },
  { name: 'Seated Cable Row', group: 'pull', anchor: 'deadlift', ratio: 0.5, equipment: ['cable'], compound: true },
  { name: 'Single-Arm Dumbbell Row', group: 'pull', anchor: 'deadlift', ratio: 0.35, equipment: ['dumbbell'], compound: true },
  { name: 'Face Pull', group: 'pull', anchor: 'bench', ratio: 0.15, equipment: ['cable'], compound: false },
  { name: 'Dumbbell Curl', group: 'pull', anchor: 'bench', ratio: 0.16, equipment: ['dumbbell'], compound: false },
  { name: 'Barbell Curl', group: 'pull', anchor: 'bench', ratio: 0.2, equipment: ['barbell'], compound: false },
  { name: 'Hammer Curl', group: 'pull', anchor: 'bench', ratio: 0.16, equipment: ['dumbbell'], compound: false },
  { name: 'Rear Delt Fly', group: 'pull', anchor: 'bench', ratio: 0.1, equipment: ['dumbbell'], compound: false },

  // --- legs (quad-dominant) ------------------------------------------------
  { name: 'Back Squat', group: 'legs', anchor: 'squat', ratio: 1, equipment: ['barbell'], compound: true },
  { name: 'Front Squat', group: 'legs', anchor: 'squat', ratio: 0.8, equipment: ['barbell'], compound: true },
  { name: 'Leg Press', group: 'legs', anchor: 'squat', ratio: 1.3, equipment: ['machine'], compound: true },
  { name: 'Walking Lunge', group: 'legs', anchor: 'squat', ratio: 0.4, equipment: ['dumbbell'], compound: true },
  { name: 'Bulgarian Split Squat', group: 'legs', anchor: 'squat', ratio: 0.45, equipment: ['dumbbell'], compound: true },
  { name: 'Goblet Squat', group: 'legs', anchor: 'squat', ratio: 0.35, equipment: ['dumbbell'], compound: true },
  { name: 'Step-Up', group: 'legs', anchor: 'squat', ratio: 0.4, equipment: ['dumbbell'], compound: true },
  { name: 'Leg Extension', group: 'legs', anchor: 'squat', ratio: 0.3, equipment: ['machine'], compound: false },

  // --- hinge (posterior chain) --------------------------------------------
  { name: 'Romanian Deadlift', group: 'hinge', anchor: 'deadlift', ratio: 0.7, equipment: ['barbell'], compound: true },
  { name: 'Hip Thrust', group: 'hinge', anchor: 'squat', ratio: 1.05, equipment: ['barbell'], compound: true },
  { name: 'Good Morning', group: 'hinge', anchor: 'deadlift', ratio: 0.45, equipment: ['barbell'], compound: true },
  { name: 'Kettlebell Swing', group: 'hinge', anchor: 'deadlift', ratio: 0.3, equipment: ['dumbbell'], compound: true },
  { name: 'Leg Curl', group: 'hinge', anchor: 'deadlift', ratio: 0.25, equipment: ['machine'], compound: false },
  { name: 'Back Extension', group: 'hinge', anchor: 'deadlift', ratio: 0.2, equipment: ['bodyweight'], compound: false },

  // --- core ----------------------------------------------------------------
  { name: 'Plank', group: 'core', anchor: 'bench', ratio: 0.1, equipment: ['bodyweight'], compound: false },
  { name: 'Hanging Leg Raise', group: 'core', anchor: 'bench', ratio: 0.1, equipment: ['bodyweight'], compound: false },
  { name: 'Ab Wheel Rollout', group: 'core', anchor: 'bench', ratio: 0.15, equipment: ['bodyweight'], compound: false },
  { name: 'Cable Crunch', group: 'core', anchor: 'bench', ratio: 0.2, equipment: ['cable'], compound: false },

  // --- carry -----------------------------------------------------------------
  { name: "Farmer's Carry", group: 'carry', anchor: 'deadlift', ratio: 0.5, equipment: ['dumbbell'], compound: true },
  { name: 'Suitcase Carry', group: 'carry', anchor: 'deadlift', ratio: 0.3, equipment: ['dumbbell'], compound: true },
];

export const ALL_EQUIPMENT: Equipment[] = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'];

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbells',
  machine: 'Machines',
  cable: 'Cables',
  bodyweight: 'Bodyweight',
};

export function exercisesFor(group: ExerciseGroup, equipment?: Equipment[]): ExerciseDef[] {
  const pool = EXERCISES.filter((e) => e.group === group);
  const allowed = equipment && equipment.length > 0 ? pool.filter((e) => e.equipment.some((eq) => equipment.includes(eq))) : pool;
  // stable sort: compounds first, catalog order preserved within each tier
  return [...allowed].sort((a, b) => Number(b.compound) - Number(a.compound));
}

/** Round-robin across the requested groups so accessory picks stay balanced. */
export function pickExercises(groups: ExerciseGroup[], count: number, equipment?: Equipment[]): ExerciseDef[] {
  const pools = groups.map((g) => exercisesFor(g, equipment));
  const picked: ExerciseDef[] = [];
  const seen = new Set<string>();
  let i = 0;
  let guard = 0;
  while (picked.length < count && guard < groups.length * 40) {
    const pool = pools[i % groups.length];
    const next = pool.find((e) => !seen.has(e.name));
    if (next) {
      seen.add(next.name);
      picked.push(next);
    }
    i++;
    guard++;
  }
  return picked;
}
