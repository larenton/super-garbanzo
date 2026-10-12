/**
 * Apple Health bridge — non-iOS fallback.
 *
 * The real implementation lives in `health.ios.ts`; Metro picks it on iOS.
 * Every function here resolves to "unavailable" so Android/web builds work.
 */
import type { ActivityType, FoodEntry } from './types';

export interface HealthDaySummary {
  steps: number;
  activeKcal: number;
  exerciseMin: number;
  restingHr?: number;
  distanceKm: number;
}

export interface HealthWorkout {
  uuid: string;
  activity: ActivityType;
  start: string;
  end: string;
  durationMin: number;
  distanceKm?: number;
  energyKcal?: number;
}

export const healthPlatformSupported = false;

export function isHealthAvailable(): boolean {
  return false;
}

export async function connectHealth(): Promise<boolean> {
  return false;
}

export async function getDaySummary(_date: string): Promise<HealthDaySummary | null> {
  return null;
}

export async function getDailySteps(_days: number): Promise<{ date: string; value: number }[]> {
  return [];
}

export async function getBodyWeights(_days: number): Promise<{ date: string; kg: number }[]> {
  return [];
}

export async function getRecentWorkouts(_days: number): Promise<HealthWorkout[]> {
  return [];
}

export async function saveWorkout(_w: {
  activity: ActivityType;
  start: Date;
  end: Date;
  distanceKm?: number;
  energyKcal?: number;
}): Promise<string | undefined> {
  return undefined;
}

export async function saveFood(_f: FoodEntry): Promise<void> {}

export async function saveBodyWeight(_kg: number, _date: Date): Promise<void> {}
