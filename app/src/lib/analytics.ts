import { getExercise } from '@/data/exercises';
import { addDays, diffDays, startOfWeek, today, weekdayOf } from './dates';
import type { BodyWeight, ExerciseLog, FoodEntry, Goal, MacroTargets, Muscle, Program, SessionLog, WorkoutTemplate } from './types';

export interface PlanState {
  program: Program;
  overrides: Record<string, string>;
  templates: WorkoutTemplate[];
}

/** Template id planned for a date, honouring one-off overrides. */
export function plannedTemplateId(s: PlanState, date: string): string | null {
  const o = s.overrides[date];
  if (o === 'rest') return null;
  if (o) return o;
  const { program } = s;
  const offset = diffDays(date, program.startDate);
  if (offset < 0 || offset >= program.weeks * 7) return null;
  return program.schedule[weekdayOf(date)] ?? null;
}

export function plannedTemplate(s: PlanState, date: string): WorkoutTemplate | undefined {
  const id = plannedTemplateId(s, date);
  return id ? s.templates.find((t) => t.id === id) : undefined;
}

export function logsOn(logs: SessionLog[], date: string): SessionLog[] {
  return logs.filter((l) => l.date === date);
}

export type DayStatus = 'done' | 'missed' | 'planned' | 'today' | 'rest' | 'extra';

export function dayStatus(s: PlanState, logs: SessionLog[], date: string): DayStatus {
  const planned = plannedTemplateId(s, date);
  const done = logsOn(logs, date);
  const t = today();
  if (planned) {
    if (done.some((l) => l.templateId === planned) || done.length > 0) return 'done';
    if (date < t) return s.program.loadedAt && date < s.program.loadedAt ? 'planned' : 'missed';
    return date === t ? 'today' : 'planned';
  }
  return done.length > 0 ? 'extra' : 'rest';
}

export function nextSessions(s: PlanState, logs: SessionLog[], from: string, count: number) {
  const out: { date: string; template: WorkoutTemplate }[] = [];
  for (let i = 0; i < 120 && out.length < count; i++) {
    const date = addDays(from, i);
    const t = plannedTemplate(s, date);
    if (t && logsOn(logs, date).length === 0) out.push({ date, template: t });
  }
  return out;
}

/** Epley estimated one-rep max. Reps above 12 are unreliable, so they're capped. */
export function e1rm(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + Math.min(reps, 12) / 30);
}

export function sortedLogs(logs: SessionLog[]): SessionLog[] {
  return [...logs].sort((a, b) => (a.date === b.date ? a.startedAt.localeCompare(b.startedAt) : a.date.localeCompare(b.date)));
}

export function lastPerformance(logs: SessionLog[], exerciseId: string, before?: string): ExerciseLog | undefined {
  const sorted = sortedLogs(logs).reverse();
  for (const l of sorted) {
    if (before && l.date >= before) continue;
    const ex = l.exercises.find((e) => e.exerciseId === exerciseId && e.sets.length > 0);
    if (ex) return ex;
  }
  return undefined;
}

export function bestSet(ex: ExerciseLog) {
  if (getExercise(ex.exerciseId).timed) return { weight: Math.max(0, ...ex.sets.map((s) => s.weight)), reps: 0, e1rm: 0 };
  let best = { weight: 0, reps: 0, e1rm: 0 };
  for (const s of ex.sets) {
    const v = e1rm(s.weight, s.reps);
    if (v > best.e1rm || (v === best.e1rm && s.reps > best.reps)) best = { weight: s.weight, reps: s.reps, e1rm: v };
  }
  return best;
}

export function e1rmSeries(logs: SessionLog[], exerciseId: string) {
  const out: { date: string; value: number; weight: number; reps: number }[] = [];
  for (const l of sortedLogs(logs)) {
    const ex = l.exercises.find((e) => e.exerciseId === exerciseId);
    if (!ex || ex.sets.length === 0) continue;
    const b = bestSet(ex);
    if (b.e1rm <= 0) continue;
    const prev = out[out.length - 1];
    if (prev && prev.date === l.date) {
      if (b.e1rm > prev.value) out[out.length - 1] = { date: l.date, value: b.e1rm, weight: b.weight, reps: b.reps };
    } else out.push({ date: l.date, value: b.e1rm, weight: b.weight, reps: b.reps });
  }
  return out;
}

export function personalBest(logs: SessionLog[], exerciseId: string) {
  const series = e1rmSeries(logs, exerciseId);
  if (series.length === 0) return undefined;
  return series.reduce((a, b) => (b.value > a.value ? b : a));
}

/** Exercises in `log` that set a new estimated-1RM best versus everything before it. */
export function detectPRs(log: SessionLog, allLogs: SessionLog[]): string[] {
  const prior = allLogs.filter((l) => l.id !== log.id && l.date <= log.date && l.startedAt < log.startedAt);
  return log.exercises
    .filter((ex) => {
      const now = bestSet(ex).e1rm;
      const before = personalBest(prior, ex.exerciseId)?.value ?? 0;
      return now > 0 && before > 0 && now > before + 0.01;
    })
    .map((ex) => ex.exerciseId);
}

/** Tonnage (weight × reps). Timed holds are left out because their "reps" are seconds. */
export function sessionVolume(log: SessionLog): number {
  return log.exercises
    .filter((ex) => !getExercise(ex.exerciseId).timed)
    .reduce((acc, ex) => acc + ex.sets.reduce((a, s) => a + s.weight * s.reps, 0), 0);
}

export function sessionSets(log: SessionLog): number {
  return log.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
}

export interface WeekBucket {
  weekStart: string;
  planned: number;
  done: number;
  volume: number;
  distanceKm: number;
  minutes: number;
}

export function weeklyBuckets(s: PlanState, logs: SessionLog[], weeks: number, endDate = today()): WeekBucket[] {
  const lastWeek = startOfWeek(endDate);
  const out: WeekBucket[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const weekStart = addDays(lastWeek, -7 * w);
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    let planned = 0;
    let done = 0;
    for (const d of days) {
      const p = plannedTemplateId(s, d);
      const l = logsOn(logs, d);
      if (p) {
        planned++;
        if (l.length > 0) done++;
      } else if (l.length > 0) done++;
    }
    const wl = logs.filter((l) => l.date >= weekStart && l.date <= days[6]);
    out.push({
      weekStart,
      planned,
      done,
      volume: wl.reduce((a, l) => a + sessionVolume(l), 0),
      distanceKm: wl.reduce((a, l) => a + (l.distanceKm ?? 0), 0),
      minutes: wl.reduce((a, l) => a + (l.durationMin ?? 0), 0),
    });
  }
  return out;
}

export interface MacroTotals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Lift days get the higher-carb targets; cardio and rest days the lower. */
export function targetsFor(s: PlanState & { targets: MacroTargets; restTargets: MacroTargets }, date: string): MacroTargets {
  return plannedTemplate(s, date)?.kind === 'strength' ? s.targets : s.restTargets;
}

export function macroTotals(food: FoodEntry[], date: string): MacroTotals {
  return food
    .filter((f) => f.date === date)
    .reduce((acc, f) => ({ kcal: acc.kcal + f.kcal, protein: acc.protein + f.protein, carbs: acc.carbs + f.carbs, fat: acc.fat + f.fat }), {
      kcal: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });
}

export function dailyMacroSeries(food: FoodEntry[], days: number, endDate = today()) {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(endDate, i - days + 1);
    return { date, ...macroTotals(food, date) };
  });
}

/** Average over days that have at least one food entry. */
export function macroAverages(food: FoodEntry[], days: number, endDate = today()) {
  const series = dailyMacroSeries(food, days, endDate).filter((d) => d.kcal > 0);
  if (series.length === 0) return { kcal: 0, protein: 0, carbs: 0, fat: 0, days: 0 };
  const sum = series.reduce(
    (a, d) => ({ kcal: a.kcal + d.kcal, protein: a.protein + d.protein, carbs: a.carbs + d.carbs, fat: a.fat + d.fat }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const n = series.length;
  return { kcal: sum.kcal / n, protein: sum.protein / n, carbs: sum.carbs / n, fat: sum.fat / n, days: n };
}

export function proteinHitRate(food: FoodEntry[], targets: MacroTargets, days: number) {
  const series = dailyMacroSeries(food, days).filter((d) => d.kcal > 0);
  if (series.length === 0) return 0;
  return series.filter((d) => d.protein >= targets.protein * 0.95).length / series.length;
}

export interface WeightTrend {
  thisWeekAvg?: number;
  lastWeekAvg?: number;
  change?: number;
  weighIns: number;
  status: 'need-data' | 'dropping-fast' | 'dropping' | 'flat' | 'on-target' | 'rising-fast';
  advice: string;
}

/**
 * The plan's adjusting rule: average 3+ morning weigh-ins a week and aim for
 * flat or +0.1-0.25 kg/week; a drop of more than 0.5 kg means add ~150 kcal/day.
 */
export function weightTrend(weights: BodyWeight[], endDate = today()): WeightTrend {
  const weekStart = startOfWeek(endDate);
  const avg = (from: string, to: string) => {
    const w = weights.filter((x) => x.date >= from && x.date <= to);
    return w.length ? { avg: w.reduce((a, x) => a + x.kg, 0) / w.length, n: w.length } : undefined;
  };
  const cur = avg(weekStart, addDays(weekStart, 6));
  const prev = avg(addDays(weekStart, -7), addDays(weekStart, -1));
  const weighIns = cur?.n ?? 0;
  if (!cur || !prev) {
    return {
      thisWeekAvg: cur?.avg,
      lastWeekAvg: prev?.avg,
      weighIns,
      status: 'need-data',
      advice: `Weigh in 3 mornings this week (${weighIns}/3 so far). The weekly average is compared with last week's.`,
    };
  }
  const change = cur.avg - prev.avg;
  const base = { thisWeekAvg: cur.avg, lastWeekAvg: prev.avg, change, weighIns };
  if (change < -0.5) return { ...base, status: 'dropping-fast', advice: 'Down more than 0.5 kg on last week. Add about 150 kcal a day.' };
  if (change < -0.1)
    return { ...base, status: 'dropping', advice: 'Slightly down on last week. Watch it: the aim is flat or slowly rising.' };
  if (change <= 0.1) return { ...base, status: 'flat', advice: 'Flat on last week. That is within the plan.' };
  if (change <= 0.25) return { ...base, status: 'on-target', advice: 'Rising 0.1-0.25 kg a week: right on plan.' };
  return { ...base, status: 'rising-fast', advice: 'Rising faster than 0.25 kg a week. Keep an eye on it before changing anything.' };
}

export function latestWeight(weights: BodyWeight[]): BodyWeight | undefined {
  return weights.length ? weights[weights.length - 1] : undefined;
}

/** 7-day trailing average smooths daily water-weight noise. */
export function smoothedWeights(weights: BodyWeight[]) {
  return weights.map((w, i) => {
    const window = weights.filter((x) => x.date <= w.date && diffDays(w.date, x.date) < 7);
    const avg = window.reduce((a, x) => a + x.kg, 0) / window.length;
    return { date: w.date, value: avg, raw: w.kg, i };
  });
}

/** Weighted set count per muscle: primary = 1, secondary = 0.5 per set. */
export function muscleLoad(template: Pick<WorkoutTemplate, 'exercises'>): Partial<Record<Muscle, number>> {
  const load: Partial<Record<Muscle, number>> = {};
  for (const pe of template.exercises) {
    const ex = getExercise(pe.exerciseId);
    ex.primary.forEach((m) => (load[m] = (load[m] ?? 0) + pe.sets));
    ex.secondary.forEach((m) => (load[m] = (load[m] ?? 0) + pe.sets * 0.5));
  }
  return load;
}

export function topMuscles(load: Partial<Record<Muscle, number>>, n: number): Muscle[] {
  return (Object.entries(load) as [Muscle, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([m]) => m);
}

export interface GoalProgress {
  current: number;
  pct: number;
  /** Projected completion date from the recent rate, if on a positive trend. */
  eta?: string;
}

export function goalProgress(
  goal: Goal,
  data: { logs: SessionLog[]; weights: BodyWeight[]; food: FoodEntry[]; targets: MacroTargets } & PlanState,
): GoalProgress {
  let current = goal.start;
  switch (goal.type) {
    case 'strength':
      current = goal.exerciseId ? (personalBest(data.logs, goal.exerciseId)?.value ?? goal.start) : goal.start;
      break;
    case 'bodyweight':
      current = latestWeight(data.weights)?.kg ?? goal.start;
      break;
    case 'frequency': {
      const w = weeklyBuckets(data, data.logs, 4);
      current = w.slice(0, 3).reduce((a, b) => a + b.done, 0) / 3;
      break;
    }
    case 'distance': {
      const monthStart = today().slice(0, 8) + '01';
      current = data.logs.filter((l) => l.date >= monthStart).reduce((a, l) => a + (l.distanceKm ?? 0), 0);
      break;
    }
    case 'protein':
      current = Math.round(proteinHitRate(data.food, data.targets, 14) * 100);
      break;
  }
  const span = goal.target - goal.start;
  const pct = span === 0 ? 1 : Math.max(0, Math.min(1, (current - goal.start) / span));

  let eta: string | undefined;
  if (pct > 0 && pct < 1 && (goal.type === 'strength' || goal.type === 'bodyweight')) {
    const elapsed = Math.max(1, diffDays(today(), goal.createdAt));
    const rate = (current - goal.start) / elapsed;
    if ((span > 0 && rate > 0) || (span < 0 && rate < 0)) {
      eta = addDays(today(), Math.ceil((goal.target - current) / rate));
    }
  }
  return { current, pct, eta };
}

/** Simple double-progression hint based on the last session. */
export function progressionHint(logs: SessionLog[], exerciseId: string, reps: string, inc: number): string | undefined {
  if (getExercise(exerciseId).timed) return undefined;
  const last = lastPerformance(logs, exerciseId);
  if (!last || last.sets.length === 0) return undefined;
  const top = parseInt(reps.split('-').pop() ?? reps, 10);
  if (!top) return undefined;
  const allHit = last.sets.every((s) => s.reps >= top);
  const w = Math.max(...last.sets.map((s) => s.weight));
  if (allHit && w > 0) return `Hit ${top} on every set last time — try +${inc}`;
  return undefined;
}
