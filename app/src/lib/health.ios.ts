/**
 * Apple Health bridge (iOS). Requires a development build — HealthKit is not
 * available in Expo Go. See README for build steps.
 */
import {
  isHealthDataAvailable,
  queryQuantitySamples,
  queryStatisticsCollectionForQuantity,
  queryStatisticsForQuantity,
  queryWorkoutSamples,
  requestAuthorization,
  saveCorrelationSample,
  saveQuantitySample,
  saveWorkoutSample,
  WorkoutActivityType,
} from '@kingstinct/react-native-healthkit';

import { addDays, fromISODate, toISODate, today } from './dates';
import type { HealthDaySummary, HealthWorkout } from './health';
import type { ActivityType, FoodEntry } from './types';

export type { HealthDaySummary, HealthWorkout } from './health';

export const healthPlatformSupported = true;

const READ = [
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierAppleExerciseTime',
  'HKQuantityTypeIdentifierRestingHeartRate',
  'HKQuantityTypeIdentifierDistanceWalkingRunning',
  'HKQuantityTypeIdentifierBodyMass',
  'HKWorkoutTypeIdentifier',
] as const;

const SHARE = [
  'HKQuantityTypeIdentifierBodyMass',
  'HKQuantityTypeIdentifierDietaryEnergyConsumed',
  'HKQuantityTypeIdentifierDietaryProtein',
  'HKQuantityTypeIdentifierDietaryCarbohydrates',
  'HKQuantityTypeIdentifierDietaryFatTotal',
  'HKCorrelationTypeIdentifierFood',
  'HKWorkoutTypeIdentifier',
] as const;

const TO_HK: Record<ActivityType, WorkoutActivityType> = {
  run: WorkoutActivityType.running,
  walk: WorkoutActivityType.walking,
  cycle: WorkoutActivityType.cycling,
  hike: WorkoutActivityType.hiking,
  swim: WorkoutActivityType.swimming,
  row: WorkoutActivityType.rowing,
  yoga: WorkoutActivityType.yoga,
  hiit: WorkoutActivityType.highIntensityIntervalTraining,
  mixed: WorkoutActivityType.mixedCardio,
  sport: WorkoutActivityType.mixedCardio,
  strength: WorkoutActivityType.traditionalStrengthTraining,
};

function fromHK(t: WorkoutActivityType): ActivityType {
  switch (t) {
    case WorkoutActivityType.running:
      return 'run';
    case WorkoutActivityType.walking:
      return 'walk';
    case WorkoutActivityType.cycling:
      return 'cycle';
    case WorkoutActivityType.hiking:
      return 'hike';
    case WorkoutActivityType.swimming:
      return 'swim';
    case WorkoutActivityType.rowing:
      return 'row';
    case WorkoutActivityType.yoga:
    case WorkoutActivityType.flexibility:
      return 'yoga';
    case WorkoutActivityType.highIntensityIntervalTraining:
      return 'hiit';
    case WorkoutActivityType.mixedCardio:
    case WorkoutActivityType.stairClimbing:
      return 'mixed';
    case WorkoutActivityType.traditionalStrengthTraining:
    case WorkoutActivityType.functionalStrengthTraining:
    case WorkoutActivityType.coreTraining:
      return 'strength';
    default:
      return 'sport';
  }
}

let authorized = false;

export function isHealthAvailable(): boolean {
  try {
    return isHealthDataAvailable();
  } catch {
    return false;
  }
}

/** Asks for read/write access. HealthKit never reveals read denials, so `true` means "asked". */
export async function connectHealth(): Promise<boolean> {
  if (!isHealthAvailable()) return false;
  authorized = await requestAuthorization({ toRead: [...READ], toShare: [...SHARE] });
  return authorized;
}

async function ensureAuth() {
  if (!authorized) await connectHealth();
}

function dayRange(date: string) {
  const startDate = fromISODate(date);
  const endDate = fromISODate(addDays(date, 1));
  return { startDate, endDate };
}

export async function getDaySummary(date: string): Promise<HealthDaySummary | null> {
  if (!isHealthAvailable()) return null;
  await ensureAuth();
  const filter = { date: dayRange(date) };
  const [steps, energy, exercise, distance, resting] = await Promise.all([
    queryStatisticsForQuantity('HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], { filter, unit: 'count' }),
    queryStatisticsForQuantity('HKQuantityTypeIdentifierActiveEnergyBurned', ['cumulativeSum'], { filter, unit: 'kcal' }),
    queryStatisticsForQuantity('HKQuantityTypeIdentifierAppleExerciseTime', ['cumulativeSum'], { filter, unit: 'min' }),
    queryStatisticsForQuantity('HKQuantityTypeIdentifierDistanceWalkingRunning', ['cumulativeSum'], { filter, unit: 'km' }),
    queryQuantitySamples('HKQuantityTypeIdentifierRestingHeartRate', { limit: 1, ascending: false, unit: 'count/min' }),
  ]);
  return {
    steps: steps.sumQuantity?.quantity ?? 0,
    activeKcal: energy.sumQuantity?.quantity ?? 0,
    exerciseMin: exercise.sumQuantity?.quantity ?? 0,
    distanceKm: distance.sumQuantity?.quantity ?? 0,
    restingHr: resting[0]?.quantity,
  };
}

export async function getDailySteps(days: number): Promise<{ date: string; value: number }[]> {
  if (!isHealthAvailable()) return [];
  await ensureAuth();
  const start = addDays(today(), -days + 1);
  const rows = await queryStatisticsCollectionForQuantity(
    'HKQuantityTypeIdentifierStepCount',
    ['cumulativeSum'],
    fromISODate(start),
    { day: 1 },
    { filter: { date: { startDate: fromISODate(start), endDate: fromISODate(addDays(today(), 1)) } }, unit: 'count' },
  );
  return rows.filter((r) => r.startDate).map((r) => ({ date: toISODate(new Date(r.startDate!)), value: r.sumQuantity?.quantity ?? 0 }));
}

export async function getBodyWeights(days: number): Promise<{ date: string; kg: number }[]> {
  if (!isHealthAvailable()) return [];
  await ensureAuth();
  const samples = await queryQuantitySamples('HKQuantityTypeIdentifierBodyMass', {
    limit: 0,
    ascending: true,
    unit: 'kg',
    filter: { date: { startDate: fromISODate(addDays(today(), -days)) } },
  });
  // One reading per day — keep the latest.
  const byDay = new Map<string, number>();
  samples.forEach((s) => byDay.set(toISODate(new Date(s.startDate)), s.quantity));
  return [...byDay.entries()].map(([date, kg]) => ({ date, kg }));
}

export async function getRecentWorkouts(days: number): Promise<HealthWorkout[]> {
  if (!isHealthAvailable()) return [];
  await ensureAuth();
  const workouts = await queryWorkoutSamples({
    limit: 50,
    ascending: false,
    filter: { date: { startDate: fromISODate(addDays(today(), -days)) } },
  });
  return workouts.map((w) => {
    const j = w.toJSON();
    w.dispose?.();
    const start = new Date(j.startDate);
    const end = new Date(j.endDate);
    const dist = j.totalDistance;
    return {
      uuid: j.uuid,
      activity: fromHK(j.workoutActivityType),
      start: start.toISOString(),
      end: end.toISOString(),
      durationMin: Math.round((end.getTime() - start.getTime()) / 60000),
      distanceKm: dist ? (dist.unit === 'm' ? dist.quantity / 1000 : dist.quantity) : undefined,
      energyKcal: j.totalEnergyBurned?.quantity,
    };
  });
}

export async function saveWorkout(w: {
  activity: ActivityType;
  start: Date;
  end: Date;
  distanceKm?: number;
  energyKcal?: number;
}): Promise<string | undefined> {
  if (!isHealthAvailable()) return undefined;
  await ensureAuth();
  const saved = await saveWorkoutSample(TO_HK[w.activity], [], w.start, w.end, {
    distance: w.distanceKm ? w.distanceKm * 1000 : undefined,
    energyBurned: w.energyKcal,
  });
  return saved.uuid;
}

export async function saveFood(f: FoodEntry): Promise<void> {
  if (!isHealthAvailable()) return;
  await ensureAuth();
  const at = new Date(f.createdAt);
  const q = (quantityType: (typeof SHARE)[number], quantity: number, unit: string) => ({
    quantityType: quantityType as 'HKQuantityTypeIdentifierDietaryProtein',
    quantity,
    unit,
    startDate: at,
    endDate: at,
  });
  await saveCorrelationSample(
    'HKCorrelationTypeIdentifierFood',
    [
      q('HKQuantityTypeIdentifierDietaryEnergyConsumed', f.kcal, 'kcal'),
      q('HKQuantityTypeIdentifierDietaryProtein', f.protein, 'g'),
      q('HKQuantityTypeIdentifierDietaryCarbohydrates', f.carbs, 'g'),
      q('HKQuantityTypeIdentifierDietaryFatTotal', f.fat, 'g'),
    ],
    at,
    at,
    { HKFoodType: f.name },
  );
}

export async function saveBodyWeight(kg: number, date: Date): Promise<void> {
  if (!isHealthAvailable()) return;
  await ensureAuth();
  await saveQuantitySample('HKQuantityTypeIdentifierBodyMass', 'kg', kg, date, date);
}
