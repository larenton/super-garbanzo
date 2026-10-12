import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { ACTIVITY_LABELS } from '@/data/templates';
import { plannedTemplate } from './analytics';
import { getDeviceEvents, syncPlanToCalendar, type DeviceEvent } from './calendar';
import { addDays, toISODate, today } from './dates';
import { demoHealth } from './demo';
import * as Health from './health';
import { uid, useStore } from './store';
import type { ActivityType, SessionKind, SessionLog } from './types';

export function kindForActivity(a: ActivityType): SessionKind {
  if (a === 'strength') return 'strength';
  if (a === 'yoga') return 'mobility';
  if (a === 'sport') return 'sport';
  return 'cardio';
}

/** Pulls body weight and workouts from Apple Health into the local store. */
export async function syncFromHealth(): Promise<{ workouts: number; weights: number }> {
  const st = useStore.getState();
  if (!st.settings.healthEnabled || !Health.isHealthAvailable()) return { workouts: 0, weights: 0 };

  const weights = await Health.getBodyWeights(180);
  if (weights.length) st.mergeWeights(weights);

  const known = new Set(st.logs.map((l) => l.healthUuid).filter(Boolean));
  const workouts = await Health.getRecentWorkouts(30);
  let added = 0;
  for (const w of workouts) {
    if (known.has(w.uuid)) continue;
    const date = toISODate(new Date(w.start));
    const kind = kindForActivity(w.activity);
    const planned = plannedTemplate(useStore.getState(), date);
    const already = useStore.getState().logs.some((l) => l.date === date && l.templateId === planned?.id);
    const log: SessionLog = {
      id: uid(),
      date,
      templateId: planned && planned.kind === kind && !already ? planned.id : undefined,
      name: planned && planned.kind === kind && !already ? planned.name : ACTIVITY_LABELS[w.activity],
      kind,
      activity: w.activity,
      startedAt: w.start,
      endedAt: w.end,
      durationMin: w.durationMin,
      distanceKm: w.distanceKm ? Math.round(w.distanceKm * 100) / 100 : undefined,
      energyKcal: w.energyKcal ? Math.round(w.energyKcal) : undefined,
      exercises: [],
      source: 'health',
      healthUuid: w.uuid,
    };
    useStore.getState().addLog(log);
    added++;
  }
  return { workouts: added, weights: weights.length };
}

export type HealthSource = 'health' | 'demo' | null;

/** Today's activity rings data from Apple Health (or sample data in demo mode). */
export function useHealthDay(date: string) {
  const enabled = useStore((s) => s.settings.healthEnabled);
  const demo = useStore((s) => s.settings.demo);
  const [data, setData] = useState<Health.HealthDaySummary | null>(null);
  const [source, setSource] = useState<HealthSource>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (enabled && Health.isHealthAvailable()) {
          try {
            const d = await Health.getDaySummary(date);
            if (!cancelled) {
              setData(d);
              setSource('health');
            }
            return;
          } catch {
            // fall through
          }
        }
        if (!cancelled) {
          setData(demo ? demoHealth(date) : null);
          setSource(demo ? 'demo' : null);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [enabled, demo, date]),
  );
  return { data, source };
}

/** Events from the user's other calendars for a date range. */
export function useDeviceEvents(from: string, to: string) {
  const show = useStore((s) => s.settings.showCalendarEvents);
  const calendarId = useStore((s) => s.settings.calendarId);
  const [events, setEvents] = useState<DeviceEvent[]>([]);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (!show) {
        setEvents([]);
        return;
      }
      getDeviceEvents(from, to, calendarId)
        .then((e) => !cancelled && setEvents(e))
        .catch(() => !cancelled && setEvents([]));
      return () => {
        cancelled = true;
      };
    }, [from, to, show, calendarId]),
  );
  return events;
}

export const DEFAULT_SYNC_WEEKS = 6;
export const syncWindowStart = () => today();
export const syncWindowEnd = () => addDays(today(), DEFAULT_SYNC_WEEKS * 7);

/** Re-writes upcoming sessions to the device calendar if sync is switched on. */
export async function resyncCalendarIfEnabled(): Promise<number | null> {
  const st = useStore.getState();
  if (!st.settings.calendarSync) return null;
  const res = await syncPlanToCalendar(st, { weeks: DEFAULT_SYNC_WEEKS, calendarId: st.settings.calendarId, from: today() });
  useStore.getState().updateSettings({ calendarId: res.calendarId, lastCalendarSync: new Date().toISOString() });
  return res.count;
}
