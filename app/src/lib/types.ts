export type Muscle =
  | 'chest'
  | 'frontDelts'
  | 'sideDelts'
  | 'rearDelts'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'obliques'
  | 'traps'
  | 'upperBack'
  | 'lats'
  | 'lowerBack'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'adductors'
  | 'calves';

export type SessionKind = 'strength' | 'cardio' | 'mobility' | 'sport';
export type Location = 'gym' | 'outdoor' | 'home';

export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'kettlebell' | 'band';

export type Pattern = 'push' | 'pull' | 'squat' | 'hinge' | 'lunge' | 'carry' | 'core' | 'isolation';

export interface Exercise {
  id: string;
  name: string;
  primary: Muscle[];
  secondary: Muscle[];
  equipment: Equipment;
  pattern: Pattern;
  cues: string[];
  /** Bodyweight movements log added load only (0 = bodyweight). */
  bodyweight?: boolean;
  /** Section of the plan's exercise guide this move belongs to. */
  guide?: 'push' | 'pull' | 'legs';
  /** Logged in seconds (holds, sled pushes) rather than reps. */
  timed?: boolean;
}

export interface PlannedExercise {
  exerciseId: string;
  sets: number;
  /** Rep target, e.g. "8-10" or "5". */
  reps: string;
  restSec: number;
  note?: string;
  /** Superset label from the plan, e.g. "A1". Same letter = done back to back. */
  group?: string;
}

/** One block of a cardio session, used to draw the effort profile. */
export interface CardioSegment {
  label: string;
  minutes: number;
  /** Heart-rate zone 1 (easy) to 5 (max). */
  zone: 1 | 2 | 3 | 4 | 5;
}

export type ActivityType = 'run' | 'walk' | 'cycle' | 'hike' | 'swim' | 'row' | 'yoga' | 'hiit' | 'mixed' | 'sport' | 'strength';

export interface WorkoutTemplate {
  id: string;
  name: string;
  kind: SessionKind;
  location: Location;
  durationMin: number;
  description: string;
  exercises: PlannedExercise[];
  activity?: ActivityType;
  segments?: CardioSegment[];
  targetDistanceKm?: number;
  warmup?: string;
  /** Coach's reasoning for the session. */
  why?: string;
  /** Progression or benchmark note shown under the session. */
  note?: string;
  /** Effort guide, e.g. "Steady · RPE 5-6 · short sentences". */
  intensity?: string;
  /** Row splits to record: an average 500 m split, or one split per interval. */
  splits?: { kind: 'average' } | { kind: 'intervals'; count: number; distanceM: number };
}

export interface PlanRule {
  title: string;
  body: string;
}

/** Weekday index: 0 = Monday … 6 = Sunday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Program {
  name: string;
  /** ISO date (yyyy-mm-dd) of the Monday the program starts. */
  startDate: string;
  weeks: number;
  schedule: Record<Weekday, string | null>;
  /** Default session start time, "HH:MM". */
  sessionTime: string;
  /** One-line goal of the block. */
  summary?: string;
  rules?: PlanRule[];
  /** Lifting tempo, e.g. "3-0-1-0" (lower, pause, lift, pause in seconds). */
  tempo?: string;
  /** Date the plan was loaded; planned days before it aren't counted as missed. */
  loadedAt?: string;
}

export interface SetLog {
  weight: number;
  reps: number;
  done: boolean;
}

export interface ExerciseLog {
  exerciseId: string;
  sets: SetLog[];
}

export interface SessionLog {
  id: string;
  /** ISO date the session counts towards. */
  date: string;
  templateId?: string;
  name: string;
  kind: SessionKind;
  activity?: ActivityType;
  startedAt: string;
  endedAt?: string;
  exercises: ExerciseLog[];
  distanceKm?: number;
  durationMin?: number;
  energyKcal?: number;
  /** 1 (easy) to 5 (all out). */
  effort?: number;
  notes?: string;
  source: 'app' | 'health';
  healthUuid?: string;
  /** Average 500 m split, "m:ss.s". */
  avgSplit?: string;
  /** One split per interval rep. */
  splits?: string[];
}

export type Meal = 'breakfast' | 'lunch' | 'workout' | 'dinner' | 'snack';

export interface FoodEntry {
  id: string;
  date: string;
  meal: Meal;
  name: string;
  protein: number;
  carbs: number;
  fat: number;
  kcal: number;
  createdAt: string;
}

export interface MacroTargets {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** A row of the plan's daily meal split. */
export interface MealIdea {
  meal: Meal;
  label: string;
  protein: number;
  carbs: number;
  fat: number;
  idea: string;
}

/** Daily check-in from the plan: energy and sleep (weight, session and protein are tracked elsewhere). */
export interface CheckIn {
  energy?: number;
  sleepHours?: number;
  waistCm?: number;
  note?: string;
}

/** Starting measurements from the plan. */
export interface Baseline {
  date: string;
  weightKg: number;
  leanMassKg?: number;
  bodyFatScale?: number;
  bodyFatDexa?: number;
  dexaDate?: string;
}

export interface BodyWeight {
  date: string;
  kg: number;
}

export type GoalType = 'strength' | 'bodyweight' | 'frequency' | 'distance' | 'protein';

export interface Goal {
  id: string;
  type: GoalType;
  title: string;
  exerciseId?: string;
  /** Starting value captured when the goal was created. */
  start: number;
  target: number;
  deadline?: string;
  createdAt: string;
}

export type Units = 'kg' | 'lb';

export interface Settings {
  name: string;
  units: Units;
  onboarded: boolean;
  healthEnabled: boolean;
  calendarSync: boolean;
  calendarId?: string;
  showCalendarEvents: boolean;
  lastCalendarSync?: string;
  demo: boolean;
}

export interface ActiveWorkout {
  date: string;
  templateId?: string;
  name: string;
  startedAt: string;
  exercises: ExerciseLog[];
  restEndsAt?: number;
}
