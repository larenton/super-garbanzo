import { STARTER_TEMPLATES, starterProgram } from '@/data/templates';
import { plannedTemplate } from './analytics';
import { addDays, startOfWeek, today } from './dates';
import { initialData, type AppData } from './store';
import type { BodyWeight, FoodEntry, Goal, SessionLog } from './types';
import { kcalFromMacros } from './units';

/** Deterministic PRNG so the demo looks the same every time. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const START_WEIGHTS: Record<string, number> = {
  'bench-press': 82.5,
  'barbell-row': 72.5,
  'overhead-press': 50,
  'lat-pulldown': 60,
  'barbell-curl': 32.5,
  'triceps-pushdown': 27.5,
  'back-squat': 110,
  rdl: 100,
  'leg-press': 180,
  'leg-curl': 45,
  'calf-raise': 80,
  plank: 0,
  'pull-up': 0,
  'incline-db-press': 28,
  'seated-row': 65,
  'lateral-raise': 10,
  'face-pull': 22.5,
  'hammer-curl': 16,
  deadlift: 150,
  'bulgarian-split-squat': 20,
  'hip-thrust': 110,
  'leg-extension': 55,
  'hanging-leg-raise': 0,
};

const MEALS: Omit<FoodEntry, 'id' | 'date' | 'createdAt' | 'kcal'>[][] = [
  [
    { meal: 'breakfast', name: 'Greek yoghurt, berries & oats', protein: 32, carbs: 58, fat: 9 },
    { meal: 'lunch', name: 'Chicken burrito bowl', protein: 52, carbs: 85, fat: 18 },
    { meal: 'snack', name: 'Protein shake + banana', protein: 30, carbs: 32, fat: 3 },
    { meal: 'dinner', name: 'Salmon, rice & greens', protein: 45, carbs: 70, fat: 24 },
  ],
  [
    { meal: 'breakfast', name: 'Eggs on sourdough', protein: 28, carbs: 45, fat: 22 },
    { meal: 'lunch', name: 'Turkey & avocado wrap', protein: 40, carbs: 55, fat: 20 },
    { meal: 'snack', name: 'Cottage cheese & honey', protein: 24, carbs: 22, fat: 5 },
    { meal: 'dinner', name: 'Beef stir-fry with noodles', protein: 48, carbs: 90, fat: 22 },
  ],
  [
    { meal: 'breakfast', name: 'Overnight oats with whey', protein: 35, carbs: 70, fat: 12 },
    { meal: 'lunch', name: 'Tuna pasta salad', protein: 42, carbs: 80, fat: 16 },
    { meal: 'snack', name: 'Rice cakes & peanut butter', protein: 10, carbs: 30, fat: 14 },
    { meal: 'dinner', name: 'Chicken thigh, potatoes & salad', protein: 50, carbs: 65, fat: 25 },
  ],
];

/** Eight weeks of believable history ending yesterday, so charts have shape. */
export function buildDemoData(name: string): Partial<AppData> {
  const r = rng(42);
  const base = initialData();
  const startMonday = addDays(startOfWeek(today()), -7 * 8);
  const program = starterProgram(startMonday);
  const plan = { program, overrides: {}, templates: STARTER_TEMPLATES };

  const logs: SessionLog[] = [];
  const food: FoodEntry[] = [];
  const weights: BodyWeight[] = [];

  let id = 0;
  const yesterday = addDays(today(), -1);
  for (let d = startMonday; d <= yesterday; d = addDays(d, 1)) {
    const week = Math.floor((Date.parse(d) - Date.parse(startMonday)) / (7 * 86_400_000));
    const t = plannedTemplate(plan, d);
    const skip = r() < 0.1;
    if (t && !skip) {
      const startedAt = new Date(`${d}T07:05:00`);
      if (t.kind === 'strength') {
        const exercises = t.exercises.map((pe) => {
          const startW = START_WEIGHTS[pe.exerciseId] ?? 20;
          const progress = startW === 0 ? 0 : Math.round((startW * 0.012 * week) / 2.5) * 2.5;
          const topReps = parseInt(pe.reps.split('-').pop() ?? pe.reps, 10) || 8;
          return {
            exerciseId: pe.exerciseId,
            sets: Array.from({ length: pe.sets }, (_, i) => ({
              weight: startW + progress,
              reps: Math.max(1, topReps - (i >= pe.sets - 1 && r() < 0.5 ? 1 : 0) - (r() < 0.2 ? 1 : 0)),
              done: true,
            })),
          };
        });
        logs.push({
          id: `demo-${id++}`,
          date: d,
          templateId: t.id,
          name: t.name,
          kind: t.kind,
          activity: 'strength',
          startedAt: startedAt.toISOString(),
          endedAt: new Date(startedAt.getTime() + (t.durationMin + Math.round(r() * 10 - 5)) * 60000).toISOString(),
          durationMin: t.durationMin + Math.round(r() * 10 - 5),
          exercises,
          effort: 3 + Math.round(r()),
          source: 'app',
        });
      } else {
        const km = (t.targetDistanceKm ?? 5) + Math.round((r() - 0.3) * 10) / 10 + week * 0.1;
        logs.push({
          id: `demo-${id++}`,
          date: d,
          templateId: t.id,
          name: t.name,
          kind: t.kind,
          activity: t.activity,
          startedAt: startedAt.toISOString(),
          durationMin: t.durationMin + Math.round(r() * 6 - 3),
          distanceKm: Math.round(km * 10) / 10,
          energyKcal: Math.round(km * 68),
          exercises: [],
          effort: t.id === 'intervals' ? 4 : 2,
          source: r() < 0.6 ? 'health' : 'app',
        });
      }
    }
    // Occasional walk outside the plan.
    if (d.endsWith('0') && r() < 0.5) {
      logs.push({
        id: `demo-${id++}`,
        date: d,
        name: 'Afternoon walk',
        kind: 'cardio',
        activity: 'walk',
        startedAt: new Date(`${d}T16:00:00`).toISOString(),
        durationMin: 45,
        distanceKm: 4.2,
        energyKcal: 190,
        exercises: [],
        effort: 1,
        source: 'health',
      });
    }

    // Body weight: slow cut from 84 kg with daily noise.
    if (r() < 0.8) {
      const days = Math.floor((Date.parse(d) - Date.parse(startMonday)) / 86_400_000);
      weights.push({ date: d, kg: Math.round((84.2 - days * 0.045 + (r() - 0.5) * 0.9) * 10) / 10 });
    }

    // Food for the last three weeks.
    if (Date.parse(d) >= Date.parse(addDays(today(), -21))) {
      const day = MEALS[Math.floor(r() * MEALS.length)];
      day.forEach((m, i) => {
        if (r() < 0.08) return;
        const scale = 0.85 + r() * 0.3;
        const protein = Math.round(m.protein * scale);
        const carbs = Math.round(m.carbs * scale);
        const fat = Math.round(m.fat * scale);
        food.push({
          ...m,
          id: `demo-f-${id++}`,
          date: d,
          protein,
          carbs,
          fat,
          kcal: kcalFromMacros(protein, carbs, fat),
          createdAt: new Date(`${d}T${String(8 + i * 4).padStart(2, '0')}:00:00`).toISOString(),
        });
      });
    }
  }

  // A partly-logged today.
  const t0 = today();
  MEALS[0].slice(0, 2).forEach((m, i) =>
    food.push({
      ...m,
      id: `demo-f-${id++}`,
      date: t0,
      kcal: kcalFromMacros(m.protein, m.carbs, m.fat),
      createdAt: new Date(`${t0}T${String(8 + i * 4).padStart(2, '0')}:30:00`).toISOString(),
    }),
  );

  const goalStart = addDays(startMonday, 0);
  const goals: Goal[] = [
    {
      id: 'g1',
      type: 'strength',
      title: 'Bench press 1RM 115 kg',
      exerciseId: 'bench-press',
      start: 95,
      target: 115,
      deadline: addDays(today(), 90),
      createdAt: goalStart,
    },
    {
      id: 'g2',
      type: 'bodyweight',
      title: 'Lean down to 80 kg',
      start: 84.2,
      target: 80,
      deadline: addDays(today(), 60),
      createdAt: goalStart,
    },
    { id: 'g3', type: 'frequency', title: 'Train 5× a week', start: 0, target: 5, createdAt: goalStart },
    { id: 'g4', type: 'distance', title: 'Run 60 km this month', start: 0, target: 60, createdAt: goalStart },
  ];

  return {
    ...base,
    program,
    logs,
    food,
    weights,
    goals,
    targets: { kcal: 2200, protein: 145, carbs: 230, fat: 70 },
    settings: { ...base.settings, name, demo: true },
  };
}

/** Plausible Apple Health numbers for the demo when HealthKit isn't available. */
export function demoHealth(date: string) {
  const r = rng(date.split('-').reduce((a, b) => a + Number(b), 0));
  return {
    steps: Math.round(6500 + r() * 6000),
    activeKcal: Math.round(420 + r() * 380),
    exerciseMin: Math.round(28 + r() * 50),
    restingHr: Math.round(54 + r() * 6),
    distanceKm: Math.round((4.5 + r() * 5) * 10) / 10,
  };
}

export function demoSteps(days: number) {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today(), i - days + 1);
    return { date, value: demoHealth(date).steps };
  });
}
