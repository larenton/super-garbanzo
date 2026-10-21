import type { ActivityType, Baseline, MacroTargets, MealIdea, PlanRule, Program, WorkoutTemplate } from '@/lib/types';

/**
 * Week 1 Training Plan — Push / Pull / Legs with cardio between.
 * Transcribed from the coach's PDF: sessions, supersets, rest, notes and targets.
 */
export const STARTER_TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'push',
    name: 'Push · Shoulders & Chest',
    kind: 'strength',
    location: 'gym',
    durationMin: 45,
    description: 'Shoulders and chest. Supersets: do A1, then A2, rest, and repeat before moving to B.',
    warmup: '3 min easy row, then 2 × 15 band pull-aparts and arm circles.',
    why: "Hemsworth's current prep prioritises shoulders and arms with simple builders like the seated dumbbell press. Pairing a small isolation move before the big press (A1 into A2) pre-fatigues the front delts, the same trick your previous hypertrophy block used.",
    exercises: [
      { group: 'A1', exerciseId: 'seated-db-front-raise', sets: 3, reps: '8', restSec: 20, note: 'Thumbs up, raise to eye level' },
      {
        group: 'A2',
        exerciseId: 'seated-db-shoulder-press',
        sets: 3,
        reps: '12',
        restSec: 60,
        note: 'Last set: drop 15-20% and keep going',
      },
      { group: 'B1', exerciseId: 'incline-db-press', sets: 3, reps: '12', restSec: 20, note: 'Bench at 30-45°' },
      {
        group: 'B2',
        exerciseId: 'cable-lateral-raise',
        sets: 3,
        reps: '12-15',
        restSec: 60,
        note: "Each side. Lift the elbow, don't shrug",
      },
      { group: 'C1', exerciseId: 'flat-db-fly', sets: 3, reps: '8', restSec: 20, note: 'Soft elbows, deep stretch' },
      { group: 'C2', exerciseId: 'chest-press-machine', sets: 3, reps: '12', restSec: 60, note: 'Pronated grip' },
      { group: 'D1', exerciseId: 'rope-triceps-pushdown', sets: 3, reps: '12', restSec: 20, note: 'Spread the rope at the bottom' },
      { group: 'D2', exerciseId: 'cable-external-rotation', sets: 2, reps: '15', restSec: 30, note: 'Shoulder health, light weight' },
    ],
  },
  {
    id: 'steady-row',
    name: 'Steady row',
    kind: 'cardio',
    location: 'gym',
    activity: 'row',
    durationMin: 35,
    description:
      '30-40 min at a pace you could hold a conversation at. Note your average 500 m split. This builds the aerobic engine Jackman relies on.',
    intensity: 'Steady · RPE 5-6 · short sentences',
    splits: { kind: 'average' },
    exercises: [],
    segments: [{ label: 'Steady row (30-40 min)', minutes: 35, zone: 3 }],
  },
  {
    id: 'pull',
    name: 'Pull · Lats & Back',
    kind: 'strength',
    location: 'gym',
    durationMin: 45,
    description: 'Lats and back. Supersets: do B1, then B2, rest, and repeat before moving to C.',
    warmup: '3 min easy row, 2 × 10 scapular pull-ups or straight-arm pulldowns (light).',
    exercises: [
      {
        group: 'A',
        exerciseId: 'pull-up',
        sets: 4,
        reps: '6-10',
        restSec: 90,
        note: 'Assisted machine or band if needed. Drive elbows to your sides',
      },
      { group: 'B1', exerciseId: 'straight-arm-pulldown', sets: 3, reps: '8', restSec: 20, note: 'Arms long, squeeze the lats' },
      { group: 'B2', exerciseId: 'lat-pulldown-neutral', sets: 3, reps: '12', restSec: 60 },
      { group: 'C1', exerciseId: 'lying-t-bar-row', sets: 3, reps: '12', restSec: 20, note: 'Chest on pad, no swinging' },
      { group: 'C2', exerciseId: 'cable-rear-delt-fly', sets: 3, reps: '8', restSec: 60 },
      { group: 'D1', exerciseId: 'face-pull', sets: 3, reps: '12', restSec: 20, note: 'Pull to forehead, thumbs back' },
      { group: 'D2', exerciseId: 'hammer-curl', sets: 3, reps: '12', restSec: 60, note: 'Elbows pinned' },
    ],
  },
  {
    id: 'row-intervals',
    name: 'Row intervals · 5 × 500 m',
    kind: 'cardio',
    location: 'gym',
    activity: 'row',
    durationMin: 35,
    description: '5 × 500 m hard, 90 s easy between. Try to keep every rep within 2-3 s of your fastest. Record each split.',
    intensity: 'Hard efforts · RPE 8-9 · a few words only',
    note: 'Benchmark: In week 1 or 2, swap Thursday for a 2K row test (warm up well, then row 2,000 m as fast as you can with even splits). Sub-7:30 is solid and sub-7:00 is Jackman territory. Retest in week 6.',
    splits: { kind: 'intervals', count: 5, distanceM: 500 },
    exercises: [],
    segments: [
      { label: 'Warm-up', minutes: 5, zone: 2 },
      { label: '500 m #1', minutes: 2, zone: 5 },
      { label: 'Easy 90 s', minutes: 1.5, zone: 2 },
      { label: '500 m #2', minutes: 2, zone: 5 },
      { label: 'Easy 90 s', minutes: 1.5, zone: 2 },
      { label: '500 m #3', minutes: 2, zone: 5 },
      { label: 'Easy 90 s', minutes: 1.5, zone: 2 },
      { label: '500 m #4', minutes: 2, zone: 5 },
      { label: 'Easy 90 s', minutes: 1.5, zone: 2 },
      { label: '500 m #5', minutes: 2, zone: 5 },
      { label: 'Easy row', minutes: 10, zone: 2 },
    ],
  },
  {
    id: 'legs-core',
    name: 'Legs & Core',
    kind: 'strength',
    location: 'gym',
    durationMin: 45,
    description: 'Legs, then a core giant set. Supersets: do A1, then A2, rest, and repeat before moving to B.',
    warmup: '3 min bike, 10 bodyweight squats, 10 glute bridges, 10 leg swings each side.',
    note: 'Progression: when you hit the top of the rep range on every set with good form, add 1-2 kg (upper body) or 2.5-5 kg (legs) next week.',
    exercises: [
      { group: 'A1', exerciseId: 'leg-press', sets: 4, reps: '10', restSec: 20, note: 'Full depth without lower back lifting' },
      { group: 'A2', exerciseId: 'db-rdl', sets: 3, reps: '10', restSec: 60, note: 'Hinge, soft knees. Skip on round 4' },
      { group: 'B1', exerciseId: 'goblet-squat', sets: 3, reps: '10', restSec: 20, note: 'Belt squat if your gym has one, like Thor' },
      { group: 'B2', exerciseId: 'lying-hamstring-curl', sets: 3, reps: '12', restSec: 60 },
      { group: 'C1', exerciseId: 'sled-push', sets: 4, reps: '1 min', restSec: 20, note: 'Steady, powerful steps' },
      { group: 'C2', exerciseId: 'hip-bridge-hold', sets: 4, reps: '30 s', restSec: 60, note: 'Squeeze glutes hard' },
      { group: 'D1', exerciseId: 'ankle-taps', sets: 3, reps: '20', restSec: 0, note: 'Core giant set: D1 to D3 back to back' },
      { group: 'D2', exerciseId: 'lying-leg-raise', sets: 3, reps: '20', restSec: 0 },
      { group: 'D3', exerciseId: 'plank-hands', sets: 3, reps: '30 s', restSec: 60, note: 'Then repeat D1-D3' },
    ],
  },
  {
    id: 'easy-mobility',
    name: 'Easy cardio + mobility',
    kind: 'cardio',
    location: 'gym',
    activity: 'mixed',
    durationMin: 45,
    description:
      '30-40 min mixing incline walk, StairMaster and SkiErg (10-15 min each), then 10 min stretching: hips, hamstrings, thoracic spine, shoulders.',
    intensity: 'Easy · RPE 3-4 · can chat easily',
    exercises: [],
    segments: [
      { label: 'Incline walk', minutes: 12, zone: 2 },
      { label: 'StairMaster', minutes: 12, zone: 2 },
      { label: 'SkiErg', minutes: 12, zone: 2 },
      { label: 'Stretching', minutes: 10, zone: 1 },
    ],
  },
  {
    id: 'row-2k-test',
    name: '2K row test',
    kind: 'cardio',
    location: 'gym',
    activity: 'row',
    durationMin: 25,
    description:
      'Benchmark. Warm up well, then row 2,000 m as fast as you can with even splits. Sub-7:30 is solid, sub-7:00 is Jackman territory.',
    intensity: 'Max effort · even splits',
    note: 'Swap this in for Thursday in week 1 or 2, then retest in week 6.',
    splits: { kind: 'intervals', count: 4, distanceM: 500 },
    exercises: [],
    segments: [
      { label: 'Warm-up', minutes: 10, zone: 2 },
      { label: '2,000 m test', minutes: 7.5, zone: 5 },
      { label: 'Cool-down', minutes: 5, zone: 1 },
    ],
  },
];

export const PLAN_RULES: PlanRule[] = [
  { title: 'Leave 1-2 reps in the tank.', body: 'Week 1 sets your baselines. Pick weights you can finish with clean form.' },
  { title: 'Tempo 3-0-1-0 on every lift.', body: '3 seconds down, straight up in 1. Control beats load.' },
  { title: 'Feeling flat? Swap it.', body: "Replace a lift with steady cardio and lift tomorrow instead (Hemsworth's rule)." },
  { title: 'No gym? Use the backup.', body: 'Do 4 rounds of a dumbbell circuit from the 6-week fat-loss plan, 2 min rest.' },
  { title: 'Log everything.', body: 'Weight used, reps done, row splits. Progress is beating last week.' },
];

export function starterProgram(startMonday: string): Program {
  return {
    name: 'Thor frame · Push / Pull / Legs + Cardio',
    summary:
      "Build the Thor frame: strong, athletic, lean. Push / Pull / Legs with cardio between, inspired by Chris Hemsworth's Avengers prep, Hugh Jackman's rowing and your previous coaching blocks.",
    startDate: startMonday,
    weeks: 6,
    schedule: {
      0: 'push',
      1: 'steady-row',
      2: 'pull',
      3: 'row-intervals',
      4: 'legs-core',
      5: 'easy-mobility',
      6: null,
    },
    sessionTime: '07:00',
    rules: PLAN_RULES,
    tempo: '3-0-1-0',
  };
}

/** Lift days (Mon/Wed/Fri). */
export const LIFT_DAY_TARGETS: MacroTargets = { kcal: 2500, protein: 145, carbs: 320, fat: 70 };
/** Cardio and rest days: about 50 g less carbs. */
export const REST_DAY_TARGETS: MacroTargets = { kcal: 2300, protein: 145, carbs: 270, fat: 70 };

/** Daily meal split (lift-day example) from the plan. */
export const MEAL_GUIDE: MealIdea[] = [
  { meal: 'breakfast', label: 'Breakfast', protein: 35, carbs: 80, fat: 15, idea: 'Oats, whey, berries, Greek yoghurt' },
  { meal: 'lunch', label: 'Lunch', protein: 35, carbs: 80, fat: 20, idea: 'Chicken, rice, veg, olive oil' },
  { meal: 'workout', label: 'Pre/post-workout', protein: 30, carbs: 70, fat: 5, idea: 'Whey shake + banana + rice cakes' },
  { meal: 'dinner', label: 'Dinner', protein: 40, carbs: 70, fat: 20, idea: 'Salmon or lean beef, potatoes, salad' },
  { meal: 'snack', label: 'Snack', protein: 8, carbs: 20, fat: 10, idea: 'Fruit + handful of nuts' },
];

export const NUTRITION_NOTES = {
  restDay:
    'On cardio and rest days, drop about 50 g of carbs (e.g. halve the pre-workout carbs and the lunch rice) to land near 2,300 kcal.',
  adjusting:
    'Weigh in 3 mornings this week and take the average. Aim for a flat or slowly rising trend (0.1-0.25 kg per week). If it drops more than 0.5 kg in a week, add about 150 kcal a day. These targets are estimates, so the scale trend decides.',
};

/** "Where you're starting" from the plan. */
export const PLAN_BASELINE: Omit<Baseline, 'date'> = {
  weightKg: 69.3,
  leanMassKg: 64.1,
  bodyFatScale: 7.5,
  bodyFatDexa: 19.6,
  dexaDate: '2024-02',
};

/** Effort scale used across the cardio days. */
export const RPE_GUIDE = [
  { label: 'Easy', day: 'Sat', rpe: 'RPE 3-4', talk: 'Can chat easily', zone: 2 as const },
  { label: 'Steady', day: 'Tue', rpe: 'RPE 5-6', talk: 'Short sentences', zone: 3 as const },
  { label: 'Hard', day: 'Thu efforts', rpe: 'RPE 8-9', talk: 'A few words only', zone: 5 as const },
];

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  run: 'Run',
  walk: 'Walk',
  cycle: 'Ride',
  hike: 'Hike',
  swim: 'Swim',
  row: 'Row',
  yoga: 'Yoga / Mobility',
  hiit: 'HIIT',
  mixed: 'Mixed cardio',
  sport: 'Sport',
  strength: 'Strength',
};

export const ACTIVITY_ICONS: Record<ActivityType, string> = {
  run: 'walk',
  walk: 'footsteps',
  cycle: 'bicycle',
  hike: 'trail-sign',
  swim: 'water',
  row: 'boat',
  yoga: 'body',
  hiit: 'flash',
  mixed: 'shuffle',
  sport: 'football',
  strength: 'barbell',
};
