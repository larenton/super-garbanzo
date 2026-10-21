/**
 * Device calendar integration.
 *
 * Planned sessions are written to a dedicated "Kinetic Training" calendar so
 * they show up in Apple Calendar (and anything synced with it), and events
 * from the user's other calendars can be shown alongside the plan.
 */
import { Platform } from 'react-native';
import {
  createCalendar,
  EntityTypes,
  ExpoCalendar,
  getCalendars,
  getDefaultCalendarSync,
  listEvents,
  requestCalendarPermissions,
  getCalendarPermissions,
} from 'expo-calendar';

import { getExercise } from '@/data/exercises';
import { plannedTemplate, type PlanState } from './analytics';
import { addDays, atTime, toISODate } from './dates';

export const CALENDAR_TITLE = 'Kinetic Training';
export const calendarSupported = Platform.OS !== 'web';

export interface DeviceEvent {
  id: string;
  title: string;
  date: string;
  start: string;
  end: string;
  allDay: boolean;
  calendarColor?: string;
}

export async function hasCalendarAccess(): Promise<boolean> {
  if (!calendarSupported) return false;
  try {
    const p = await getCalendarPermissions();
    return p.granted;
  } catch {
    return false;
  }
}

export async function requestCalendarAccess(): Promise<boolean> {
  if (!calendarSupported) return false;
  const p = await requestCalendarPermissions();
  return p.granted;
}

async function findOrCreateTrainingCalendar(knownId?: string): Promise<ExpoCalendar> {
  if (knownId) {
    try {
      return await ExpoCalendar.get(knownId);
    } catch {
      // Calendar was deleted by the user — fall through and recreate.
    }
  }
  const all = await getCalendars(EntityTypes.EVENT);
  const existing = all.find((c) => c.title === CALENDAR_TITLE);
  if (existing) return existing;

  if (Platform.OS === 'ios') {
    const source = getDefaultCalendarSync().source;
    return createCalendar({
      title: CALENDAR_TITLE,
      color: '#2A78D6',
      entityType: EntityTypes.EVENT,
      sourceId: source.id,
      source,
      name: CALENDAR_TITLE,
    });
  }
  return createCalendar({
    title: CALENDAR_TITLE,
    color: '#2A78D6',
    entityType: EntityTypes.EVENT,
    source: { isLocalAccount: true, name: CALENDAR_TITLE, type: 'LOCAL' },
    name: CALENDAR_TITLE,
    ownerAccount: 'personal',
  });
}

/**
 * Rewrites the next `weeks` of planned sessions into the training calendar.
 * The calendar is owned by the app, so a wipe-and-rewrite of the window is
 * the simplest way to keep it exactly in sync with plan edits.
 */
export async function syncPlanToCalendar(
  plan: PlanState,
  opts: { weeks: number; calendarId?: string; from: string },
): Promise<{ calendarId: string; count: number }> {
  if (!(await requestCalendarAccess())) throw new Error('Calendar access was not granted.');
  const cal = await findOrCreateTrainingCalendar(opts.calendarId);
  const start = atTime(opts.from, '00:00');
  const end = atTime(addDays(opts.from, opts.weeks * 7), '00:00');

  const existing = await cal.listEvents(start, end);
  for (const ev of existing) await ev.delete();

  let count = 0;
  for (let i = 0; i < opts.weeks * 7; i++) {
    const date = addDays(opts.from, i);
    const t = plannedTemplate(plan, date);
    if (!t) continue;
    const startDate = atTime(date, plan.program.sessionTime);
    const endDate = new Date(startDate.getTime() + t.durationMin * 60000);
    const lines =
      t.exercises.length > 0
        ? t.exercises.map(
            (e) =>
              `${e.group ? `${e.group}  ` : '• '}${getExercise(e.exerciseId).name} — ${e.sets} × ${e.reps}${e.restSec ? `, ${e.restSec} s rest` : ''}`,
          )
        : (t.segments ?? []).map((s) => `• ${s.label} — ${s.minutes} min (Z${s.zone})`);
    await cal.createEvent({
      title: t.name,
      startDate,
      endDate,
      notes: [t.description, t.warmup ? `Warm-up: ${t.warmup}` : '', lines.join('\n'), 'Open Kinetic to log this session.']
        .filter(Boolean)
        .join('\n\n'),
      url: `kinetic://session/${date}`,
      alarms: [{ relativeOffset: -60 }],
    });
    count++;
  }
  return { calendarId: cal.id, count };
}

/** Events from the user's other calendars, for showing busy days next to the plan. */
export async function getDeviceEvents(from: string, to: string, excludeCalendarId?: string): Promise<DeviceEvent[]> {
  if (!(await hasCalendarAccess())) return [];
  const calendars = (await getCalendars(EntityTypes.EVENT)).filter((c) => c.id !== excludeCalendarId && c.title !== CALENDAR_TITLE);
  if (calendars.length === 0) return [];
  const colors = new Map(calendars.map((c) => [c.id, c.color]));
  const events = await listEvents(calendars, atTime(from, '00:00'), atTime(addDays(to, 1), '00:00'));
  return events
    .map((e) => {
      const s = new Date(e.startDate);
      return {
        id: e.id,
        title: e.title,
        date: toISODate(s),
        start: s.toISOString(),
        end: new Date(e.endDate).toISOString(),
        allDay: e.allDay ?? false,
        calendarColor: e.calendarId ? colors.get(e.calendarId) : undefined,
      };
    })
    .sort((a, b) => a.start.localeCompare(b.start));
}
