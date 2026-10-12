import type { Weekday } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

/** Local-time ISO date, yyyy-mm-dd. */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function today(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, days: number): string {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function diffDays(a: string, b: string): number {
  return Math.round((fromISODate(a).getTime() - fromISODate(b).getTime()) / 86_400_000);
}

/** Monday = 0 … Sunday = 6. */
export function weekdayOf(iso: string): Weekday {
  return ((fromISODate(iso).getDay() + 6) % 7) as Weekday;
}

export function startOfWeek(iso: string): string {
  return addDays(iso, -weekdayOf(iso));
}

export function startOfMonth(iso: string): string {
  return iso.slice(0, 8) + '01';
}

export function addMonths(iso: string, months: number): string {
  const d = fromISODate(startOfMonth(iso));
  d.setMonth(d.getMonth() + months);
  return toISODate(d);
}

export function daysInRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const WEEKDAYS_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "Mon 12 Oct" */
export function formatShort(iso: string): string {
  const d = fromISODate(iso);
  return `${WEEKDAYS_SHORT[weekdayOf(iso)]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "Monday, 12 October" */
export function formatLong(iso: string): string {
  const d = fromISODate(iso);
  return `${WEEKDAYS_LONG[weekdayOf(iso)]}, ${d.getDate()} ${MONTHS_LONG[d.getMonth()]}`;
}

/** "12 Oct" */
export function formatDayMonth(iso: string): string {
  const d = fromISODate(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function formatMonthYear(iso: string): string {
  const d = fromISODate(iso);
  return `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Today", "Tomorrow", "Yesterday", or a short date. */
export function relativeDay(iso: string): string {
  const diff = diffDays(iso, today());
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff < 7) return WEEKDAYS_LONG[weekdayOf(iso)];
  return formatShort(iso);
}

export function formatDuration(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = Math.round(totalMin % 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function formatClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export function atTime(iso: string, hhmm: string): Date {
  const d = fromISODate(iso);
  const [h, m] = hhmm.split(':').map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
