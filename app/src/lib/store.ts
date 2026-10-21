import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { LIFT_DAY_TARGETS, MEAL_GUIDE, PLAN_BASELINE, REST_DAY_TARGETS, STARTER_TEMPLATES, starterProgram } from '@/data/templates';
import { getExercise } from '@/data/exercises';
import { startOfWeek, today } from './dates';
import { repTarget } from './reps';
import type {
  ActiveWorkout,
  Baseline,
  BodyWeight,
  CheckIn,
  FoodEntry,
  Goal,
  MacroTargets,
  MealIdea,
  Program,
  SessionLog,
  SetLog,
  Settings,
  Weekday,
  WorkoutTemplate,
} from './types';
import { lastPerformance } from './analytics';

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export interface AppData {
  settings: Settings;
  /** Lift-day macro targets. */
  targets: MacroTargets;
  /** Cardio and rest-day macro targets. */
  restTargets: MacroTargets;
  mealGuide: MealIdea[];
  checkins: Record<string, CheckIn>;
  baseline: Baseline | null;
  templates: WorkoutTemplate[];
  program: Program;
  /** Per-date overrides of the weekly schedule: a template id, or 'rest'. */
  overrides: Record<string, string>;
  logs: SessionLog[];
  food: FoodEntry[];
  weights: BodyWeight[];
  goals: Goal[];
  active: ActiveWorkout | null;
}

interface Actions {
  completeOnboarding: (s: Partial<Settings>, data?: Partial<AppData>) => void;
  updateSettings: (s: Partial<Settings>) => void;
  setTargets: (t: MacroTargets) => void;
  setRestTargets: (t: MacroTargets) => void;
  setCheckIn: (date: string, patch: Partial<CheckIn>) => void;
  /** Reloads the Week 1 plan (sessions, schedule, targets) and keeps your history. */
  loadPlan: () => void;

  updateProgram: (p: Partial<Program>) => void;
  setScheduleDay: (day: Weekday, templateId: string | null) => void;
  setOverride: (date: string, value: string | null) => void;
  upsertTemplate: (t: WorkoutTemplate) => void;
  deleteTemplate: (id: string) => void;

  startWorkout: (date: string, templateId?: string, name?: string) => void;
  updateSet: (exIndex: number, setIndex: number, patch: Partial<SetLog>) => void;
  addSet: (exIndex: number) => void;
  removeSet: (exIndex: number, setIndex: number) => void;
  addExerciseToActive: (exerciseId: string) => void;
  removeExerciseFromActive: (exIndex: number) => void;
  setRestTimer: (endsAt: number | undefined) => void;
  /** Starts (or extends, if `extend`) the rest countdown by `seconds`. */
  startRest: (seconds: number, extend?: boolean) => void;
  finishWorkout: (extra?: Partial<SessionLog>) => SessionLog | null;
  discardWorkout: () => void;

  addLog: (log: SessionLog) => void;
  updateLog: (id: string, patch: Partial<SessionLog>) => void;
  deleteLog: (id: string) => void;

  addFood: (f: Omit<FoodEntry, 'id' | 'createdAt'>) => FoodEntry;
  deleteFood: (id: string) => void;

  addWeight: (w: BodyWeight) => void;
  mergeWeights: (w: BodyWeight[]) => void;

  addGoal: (g: Omit<Goal, 'id' | 'createdAt'>) => void;
  deleteGoal: (id: string) => void;

  resetAll: () => void;
}

export function initialData(): AppData {
  return {
    settings: {
      name: '',
      units: 'kg',
      onboarded: false,
      healthEnabled: false,
      calendarSync: false,
      showCalendarEvents: true,
      demo: false,
    },
    targets: LIFT_DAY_TARGETS,
    restTargets: REST_DAY_TARGETS,
    mealGuide: MEAL_GUIDE,
    checkins: {},
    baseline: { date: startOfWeek(today()), ...PLAN_BASELINE },
    templates: STARTER_TEMPLATES,
    program: { ...starterProgram(startOfWeek(today())), loadedAt: today() },
    overrides: {},
    logs: [],
    food: [],
    weights: [{ date: startOfWeek(today()), kg: PLAN_BASELINE.weightKg }],
    goals: [],
    active: null,
  };
}

/** The Week 1 plan's sessions, schedule and nutrition, starting this week. */
function planData(): Pick<AppData, 'templates' | 'program' | 'targets' | 'restTargets' | 'mealGuide' | 'overrides'> {
  return {
    templates: STARTER_TEMPLATES,
    program: { ...starterProgram(startOfWeek(today())), loadedAt: today() },
    targets: LIFT_DAY_TARGETS,
    restTargets: REST_DAY_TARGETS,
    mealGuide: MEAL_GUIDE,
    overrides: {},
  };
}

/** Pre-fill a set row from the last time this exercise was done. */
function seedSets(exerciseId: string, count: number, reps: string, logs: SessionLog[]): SetLog[] {
  const last = lastPerformance(logs, exerciseId);
  const targetReps = repTarget(reps);
  return Array.from({ length: count }, (_, i) => {
    const prev = last?.sets[i] ?? last?.sets[last.sets.length - 1];
    return { weight: prev?.weight ?? 0, reps: prev?.reps ?? targetReps, done: false };
  });
}

export const useStore = create<AppData & Actions>()(
  persist(
    (set, get) => ({
      ...initialData(),

      completeOnboarding: (s, data) => set((st) => ({ ...data, settings: { ...st.settings, ...data?.settings, ...s, onboarded: true } })),
      updateSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } })),
      setTargets: (targets) => set({ targets }),
      setRestTargets: (restTargets) => set({ restTargets }),
      setCheckIn: (date, patch) => set((st) => ({ checkins: { ...st.checkins, [date]: { ...st.checkins[date], ...patch } } })),
      loadPlan: () => set(planData()),

      updateProgram: (p) => set((st) => ({ program: { ...st.program, ...p } })),
      setScheduleDay: (day, templateId) =>
        set((st) => ({ program: { ...st.program, schedule: { ...st.program.schedule, [day]: templateId } } })),
      setOverride: (date, value) =>
        set((st) => {
          const overrides = { ...st.overrides };
          if (value === null) delete overrides[date];
          else overrides[date] = value;
          return { overrides };
        }),
      upsertTemplate: (t) =>
        set((st) => {
          const exists = st.templates.some((x) => x.id === t.id);
          return { templates: exists ? st.templates.map((x) => (x.id === t.id ? t : x)) : [...st.templates, t] };
        }),
      deleteTemplate: (id) =>
        set((st) => {
          const schedule = { ...st.program.schedule };
          (Object.keys(schedule) as unknown as Weekday[]).forEach((k) => {
            if (schedule[k] === id) schedule[k] = null;
          });
          const overrides = Object.fromEntries(Object.entries(st.overrides).filter(([, v]) => v !== id));
          return { templates: st.templates.filter((t) => t.id !== id), program: { ...st.program, schedule }, overrides };
        }),

      startWorkout: (date, templateId, name) => {
        const { templates, logs } = get();
        const t = templates.find((x) => x.id === templateId);
        set({
          active: {
            date,
            templateId,
            name: name ?? t?.name ?? 'Workout',
            startedAt: new Date().toISOString(),
            exercises: (t?.exercises ?? []).map((pe) => ({
              exerciseId: pe.exerciseId,
              sets: seedSets(pe.exerciseId, pe.sets, pe.reps, logs),
            })),
          },
        });
      },
      updateSet: (exIndex, setIndex, patch) =>
        set((st) => {
          if (!st.active) return {};
          const exercises = st.active.exercises.map((ex, i) =>
            i !== exIndex ? ex : { ...ex, sets: ex.sets.map((s, j) => (j === setIndex ? { ...s, ...patch } : s)) },
          );
          return { active: { ...st.active, exercises } };
        }),
      addSet: (exIndex) =>
        set((st) => {
          if (!st.active) return {};
          const exercises = st.active.exercises.map((ex, i) => {
            if (i !== exIndex) return ex;
            const last = ex.sets[ex.sets.length - 1];
            return { ...ex, sets: [...ex.sets, { weight: last?.weight ?? 0, reps: last?.reps ?? 8, done: false }] };
          });
          return { active: { ...st.active, exercises } };
        }),
      removeSet: (exIndex, setIndex) =>
        set((st) => {
          if (!st.active) return {};
          const exercises = st.active.exercises.map((ex, i) =>
            i !== exIndex ? ex : { ...ex, sets: ex.sets.filter((_, j) => j !== setIndex) },
          );
          return { active: { ...st.active, exercises } };
        }),
      addExerciseToActive: (exerciseId) =>
        set((st) => {
          if (!st.active) return {};
          return {
            active: {
              ...st.active,
              exercises: [...st.active.exercises, { exerciseId, sets: seedSets(exerciseId, 3, '10', st.logs) }],
            },
          };
        }),
      removeExerciseFromActive: (exIndex) =>
        set((st) => {
          if (!st.active) return {};
          return { active: { ...st.active, exercises: st.active.exercises.filter((_, i) => i !== exIndex) } };
        }),
      setRestTimer: (endsAt) => set((st) => (st.active ? { active: { ...st.active, restEndsAt: endsAt } } : {})),
      startRest: (seconds, extend) =>
        set((st) => {
          if (!st.active) return {};
          const base = extend && st.active.restEndsAt && st.active.restEndsAt > Date.now() ? st.active.restEndsAt : Date.now();
          return { active: { ...st.active, restEndsAt: base + seconds * 1000 } };
        }),
      finishWorkout: (extra) => {
        const { active, templates } = get();
        if (!active) return null;
        const t = templates.find((x) => x.id === active.templateId);
        const endedAt = new Date().toISOString();
        const exercises = active.exercises.map((ex) => ({ ...ex, sets: ex.sets.filter((s) => s.done) })).filter((ex) => ex.sets.length > 0);
        const log: SessionLog = {
          id: uid(),
          date: active.date,
          templateId: active.templateId,
          name: active.name,
          kind: t?.kind ?? 'strength',
          activity: 'strength',
          startedAt: active.startedAt,
          endedAt,
          durationMin: Math.max(1, Math.round((Date.parse(endedAt) - Date.parse(active.startedAt)) / 60000)),
          exercises,
          source: 'app',
          ...extra,
        };
        set((st) => ({ logs: [...st.logs, log], active: null }));
        return log;
      },
      discardWorkout: () => set({ active: null }),

      addLog: (log) => set((st) => ({ logs: [...st.logs, log] })),
      updateLog: (id, patch) => set((st) => ({ logs: st.logs.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
      deleteLog: (id) => set((st) => ({ logs: st.logs.filter((l) => l.id !== id) })),

      addFood: (f) => {
        const entry: FoodEntry = { ...f, id: uid(), createdAt: new Date().toISOString() };
        set((st) => ({ food: [...st.food, entry] }));
        return entry;
      },
      deleteFood: (id) => set((st) => ({ food: st.food.filter((f) => f.id !== id) })),

      addWeight: (w) =>
        set((st) => ({
          weights: [...st.weights.filter((x) => x.date !== w.date), w].sort((a, b) => a.date.localeCompare(b.date)),
        })),
      mergeWeights: (incoming) =>
        set((st) => {
          const map = new Map(st.weights.map((w) => [w.date, w]));
          incoming.forEach((w) => map.set(w.date, w));
          return { weights: [...map.values()].sort((a, b) => a.date.localeCompare(b.date)) };
        }),

      addGoal: (g) => set((st) => ({ goals: [...st.goals, { ...g, id: uid(), createdAt: today() }] })),
      deleteGoal: (id) => set((st) => ({ goals: st.goals.filter((g) => g.id !== id) })),

      resetAll: () => set(initialData()),
    }),
    {
      name: 'kinetic-store-v1',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      // v2 replaces the generic starter plan with the Week 1 PDF plan; history is kept.
      migrate: (persisted, version) => {
        const old = (persisted ?? {}) as Partial<AppData>;
        const fresh = initialData();
        const base = { ...fresh, ...old, restTargets: old.restTargets ?? fresh.restTargets, checkins: old.checkins ?? {} };
        return (version < 2 ? { ...base, ...planData(), baseline: fresh.baseline } : base) as AppData & Actions;
      },
    },
  ),
);

export function useTemplate(id: string | null | undefined): WorkoutTemplate | undefined {
  return useStore((s) => s.templates.find((t) => t.id === id));
}

export function exerciseName(id: string) {
  return getExercise(id).name;
}
