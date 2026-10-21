import { getExercise } from '@/data/exercises';
import { MEAL_GUIDE, STARTER_TEMPLATES, starterProgram } from '@/data/templates';
import { plannedTemplate } from './analytics';
import { addDays, startOfWeek, today } from './dates';
import { repTarget } from './reps';
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

/** Starting loads (kg) for the plan's moves; 0 = bodyweight. Timed holds log seconds. */
const START_WEIGHTS: Record<string, number> = {
  'seated-db-front-raise': 6,
  'seated-db-shoulder-press': 16,
  'incline-db-press': 20,
  'cable-lateral-raise': 5,
  'flat-db-fly': 10,
  'chest-press-machine': 40,
  'rope-triceps-pushdown': 20,
  'cable-external-rotation': 5,
  'pull-up': 0,
  'straight-arm-pulldown': 20,
  'lat-pulldown-neutral': 50,
  'lying-t-bar-row': 30,
  'cable-rear-delt-fly': 5,
  'face-pull': 20,
  'hammer-curl': 12,
  'leg-press': 120,
  'db-rdl': 20,
  'goblet-squat': 22,
  'lying-hamstring-curl': 35,
  'sled-push': 60,
  'hip-bridge-hold': 0,
  'ankle-taps': 0,
  'lying-leg-raise': 0,
  'plank-hands': 0,
};

const fmtSplit = (sec: number) => `${Math.floor(sec / 60)}:${(sec % 60).toFixed(1).padStart(4, '0')}`;

/** A lift-day menu from the plan's meal guide, with day-to-day variation. */
function dayMeals(r: () => number, liftDay: boolean) {
  return MEAL_GUIDE.map((m) => {
    const carbScale = !liftDay && (m.meal === 'workout' || m.meal === 'lunch') ? 0.6 : 1;
    const v = () => 0.85 + r() * 0.3;
    return {
      meal: m.meal,
      name: m.idea,
      protein: Math.round(m.protein * v()),
      carbs: Math.round(m.carbs * carbScale * v()),
      fat: Math.round(m.fat * v()),
    };
  });
}

/** Three weeks of believable history ending yesterday, so charts have shape. */
export function buildDemoData(name: string): Partial<AppData> {
  const r = rng(42);
  const base = initialData();
  const startMonday = addDays(startOfWeek(today()), -7 * 3);
  const program = starterProgram(startMonday);
  const plan = { program, overrides: {}, templates: STARTER_TEMPLATES };

  const logs: SessionLog[] = [];
  const food: FoodEntry[] = [];
  const weights: BodyWeight[] = [];
  const checkins: AppData['checkins'] = {};

  let id = 0;
  const yesterday = addDays(today(), -1);
  for (let d = startMonday; d <= yesterday; d = addDays(d, 1)) {
    const week = Math.floor((Date.parse(d) - Date.parse(startMonday)) / (7 * 86_400_000));
    const t = plannedTemplate(plan, d);
    const skip = r() < 0.08;
    if (t && !skip) {
      const startedAt = new Date(`${d}T07:05:00`);
      if (t.kind === 'strength') {
        const exercises = t.exercises.map((pe) => {
          const ex = getExercise(pe.exerciseId);
          const startW = START_WEIGHTS[pe.exerciseId] ?? 10;
          const inc = ex.guide === 'legs' ? 2.5 : 1;
          const weight = startW === 0 ? 0 : startW + inc * week;
          const top = repTarget(pe.reps);
          return {
            exerciseId: pe.exerciseId,
            sets: Array.from({ length: pe.sets }, (_, i) => ({
              weight,
              reps: ex.timed ? top : Math.max(1, top - (i >= pe.sets - 1 && r() < 0.5 ? 1 : 0) - (r() < 0.2 ? 1 : 0)),
              done: true,
            })),
          };
        });
        const dur = t.durationMin + Math.round(r() * 8 - 3);
        logs.push({
          id: `demo-${id++}`,
          date: d,
          templateId: t.id,
          name: t.name,
          kind: t.kind,
          activity: 'strength',
          startedAt: startedAt.toISOString(),
          endedAt: new Date(startedAt.getTime() + dur * 60000).toISOString(),
          durationMin: dur,
          exercises,
          effort: 3 + Math.round(r()),
          source: 'app',
        });
      } else {
        const dur = t.durationMin + Math.round(r() * 6 - 3);
        const steadySplit = 128 - week * 1.2 + r() * 2; // seconds per 500 m
        const fastest = 113 - week * 1.0;
        const isSteady = t.splits?.kind === 'average';
        const isIntervals = t.splits?.kind === 'intervals';
        const km = isSteady ? Math.round(((dur * 60) / steadySplit) * 0.5 * 10) / 10 : isIntervals ? 6.5 : undefined;
        logs.push({
          id: `demo-${id++}`,
          date: d,
          templateId: t.id,
          name: t.name,
          kind: t.kind,
          activity: t.activity,
          startedAt: startedAt.toISOString(),
          durationMin: dur,
          distanceKm: km,
          energyKcal: Math.round(dur * (isIntervals ? 11 : 8)),
          exercises: [],
          effort: isIntervals ? 4 : isSteady ? 3 : 2,
          avgSplit: isSteady ? fmtSplit(steadySplit) : undefined,
          splits: isIntervals ? Array.from({ length: 5 }, (_, i) => fmtSplit(fastest + i * 0.6 + r() * 1.5)) : undefined,
          source: 'app',
        });
      }
    }

    // Body weight: ~3-4 mornings a week, slowly rising from the plan's 69.3 kg.
    if (r() < 0.55) {
      const days = Math.floor((Date.parse(d) - Date.parse(startMonday)) / 86_400_000);
      weights.push({ date: d, kg: Math.round((69.3 + days * 0.025 + (r() - 0.5) * 0.6) * 10) / 10 });
    }

    checkins[d] = { energy: 5 + Math.round(r() * 4), sleepHours: 6.5 + Math.round(r() * 4) / 2 };

    const liftDay = t?.kind === 'strength';
    dayMeals(r, liftDay).forEach((m, i) => {
      if (r() < 0.08) return;
      food.push({
        ...m,
        id: `demo-f-${id++}`,
        date: d,
        kcal: kcalFromMacros(m.protein, m.carbs, m.fat),
        createdAt: new Date(`${d}T${String(7 + i * 3).padStart(2, '0')}:00:00`).toISOString(),
      });
    });
  }

  // A partly-logged today.
  const t0 = today();
  dayMeals(r, plannedTemplate(plan, t0)?.kind === 'strength')
    .slice(0, 2)
    .forEach((m, i) =>
      food.push({
        ...m,
        id: `demo-f-${id++}`,
        date: t0,
        kcal: kcalFromMacros(m.protein, m.carbs, m.fat),
        createdAt: new Date(`${t0}T${String(7 + i * 4).padStart(2, '0')}:30:00`).toISOString(),
      }),
    );
  checkins[startMonday] = { ...checkins[startMonday], waistCm: 78 };

  const goals: Goal[] = [
    {
      id: 'g1',
      type: 'bodyweight',
      title: 'Reach 71 kg lean',
      start: 69.3,
      target: 71,
      deadline: addDays(startMonday, 7 * 12),
      createdAt: startMonday,
    },
    { id: 'g2', type: 'frequency', title: 'Train 6× a week', start: 0, target: 6, createdAt: startMonday },
    { id: 'g3', type: 'protein', title: 'Hit protein 90% of days', start: 0, target: 90, createdAt: startMonday },
  ];

  return {
    ...base,
    program,
    logs,
    food,
    weights,
    goals,
    checkins,
    baseline: { date: startMonday, weightKg: 69.3, leanMassKg: 64.1, bodyFatScale: 7.5, bodyFatDexa: 19.6, dexaDate: '2024-02' },
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
