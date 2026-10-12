import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { SessionRow, statusMeta } from '@/components/SessionCard';
import { Button, Card, Divider, Icon, IconButton, LargeHeader, ProgressBar, Screen, Segmented, tap } from '@/components/ui';
import { dayStatus, logsOn, plannedTemplate } from '@/lib/analytics';
import { calendarSupported } from '@/lib/calendar';
import {
  addDays,
  addMonths,
  diffDays,
  formatDayMonth,
  formatMonthYear,
  fromISODate,
  startOfMonth,
  startOfWeek,
  today,
  WEEKDAYS_SHORT,
  weekdayOf,
} from '@/lib/dates';
import { useStore } from '@/lib/store';
import { resyncCalendarIfEnabled, useDeviceEvents } from '@/lib/sync';
import { kindColor, radius, space, type, useTheme } from '@/lib/theme';

type View_ = 'week' | 'month';

export default function PlanScreen() {
  const t = useTheme();
  const s = useStore();
  const now = today();
  const [mode, setMode] = useState<View_>('week');
  const [weekStart, setWeekStart] = useState(startOfWeek(now));
  const [month, setMonth] = useState(startOfMonth(now));
  const [selected, setSelected] = useState(now);
  const [syncing, setSyncing] = useState(false);

  const weekEnd = addDays(weekStart, 6);
  const events = useDeviceEvents(mode === 'week' ? weekStart : month, mode === 'week' ? weekEnd : addDays(addMonths(month, 1), -1));

  const programWeek = Math.floor(diffDays(now, s.program.startDate) / 7) + 1;
  const weekOffset = Math.round(diffDays(weekStart, startOfWeek(now)) / 7);
  const weekLabel =
    weekOffset === 0
      ? 'This week'
      : weekOffset === 1
        ? 'Next week'
        : weekOffset === -1
          ? 'Last week'
          : weekOffset > 0
            ? `In ${weekOffset} weeks`
            : `${-weekOffset} weeks ago`;

  const sync = async () => {
    setSyncing(true);
    try {
      if (!s.settings.calendarSync) s.updateSettings({ calendarSync: true });
      const n = await resyncCalendarIfEnabled();
      tap('success');
      Alert.alert('Calendar updated', `${n ?? 0} sessions over the next 6 weeks are in your “Kinetic Training” calendar.`);
    } catch (e) {
      s.updateSettings({ calendarSync: false });
      Alert.alert('Could not sync', e instanceof Error ? e.message : 'Calendar access is needed. You can enable it in Settings.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Screen tab>
      <LargeHeader
        eyebrow={s.program.name}
        title="Plan"
        right={<IconButton icon="create-outline" label="Edit plan" onPress={() => router.push('/plan-edit')} />}
      />

      <Card style={{ gap: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[type.headline, { color: t.text, flex: 1 }]}>
            {programWeek < 1
              ? `Starts ${formatDayMonth(s.program.startDate)}`
              : programWeek > s.program.weeks
                ? 'Program complete'
                : `Week ${programWeek} of ${s.program.weeks}`}
          </Text>
          <Text style={[type.footnote, { color: t.text3 }]}>
            {formatDayMonth(s.program.startDate)} – {formatDayMonth(addDays(s.program.startDate, s.program.weeks * 7 - 1))}
          </Text>
        </View>
        <ProgressBar value={Math.max(0, programWeek - 1) / s.program.weeks} color={t.accent} height={6} />
      </Card>

      <Segmented
        options={[
          { value: 'week', label: 'Week' },
          { value: 'month', label: 'Month' },
        ]}
        value={mode}
        onChange={setMode}
      />

      {mode === 'week' ? (
        <>
          <Navigator
            label={weekLabel}
            sub={`${formatDayMonth(weekStart)} – ${formatDayMonth(weekEnd)}`}
            onPrev={() => setWeekStart(addDays(weekStart, -7))}
            onNext={() => setWeekStart(addDays(weekStart, 7))}
            onToday={weekOffset !== 0 ? () => setWeekStart(startOfWeek(now)) : undefined}
          />
          <Card style={{ paddingVertical: space.xs }}>
            {Array.from({ length: 7 }, (_, i) => {
              const date = addDays(weekStart, i);
              const tpl = plannedTemplate(s, date);
              const log = logsOn(s.logs, date)[0];
              const dayEvents = events.filter((e) => e.date === date);
              return (
                <View key={date}>
                  {i > 0 ? <Divider inset={52} /> : null}
                  <SessionRow
                    date={date}
                    template={tpl}
                    log={log}
                    onPress={() => (log && !tpl ? router.push(`/log/${log.id}`) : router.push(`/session/${date}`))}
                  />
                  {dayEvents.length ? (
                    <View style={{ marginLeft: 52, marginTop: -6, marginBottom: space.sm, gap: 3 }}>
                      {dayEvents.slice(0, 3).map((e) => (
                        <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={{ width: 3, height: 12, borderRadius: 2, backgroundColor: e.calendarColor ?? t.text3 }} />
                          <Text style={[type.caption, { color: t.text3, flex: 1 }]} numberOfLines={1}>
                            {e.allDay ? 'All day' : fromTime(e.start)} · {e.title}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </Card>
        </>
      ) : (
        <>
          <Navigator
            label={formatMonthYear(month)}
            onPrev={() => setMonth(addMonths(month, -1))}
            onNext={() => setMonth(addMonths(month, 1))}
            onToday={month !== startOfMonth(now) ? () => setMonth(startOfMonth(now)) : undefined}
          />
          <Card>
            <MonthGrid month={month} selected={selected} onSelect={setSelected} eventDays={new Set(events.map((e) => e.date))} />
            <Divider />
            <SessionRow
              date={selected}
              template={plannedTemplate(s, selected)}
              log={logsOn(s.logs, selected)[0]}
              onPress={() => router.push(`/session/${selected}`)}
            />
          </Card>
          <Legend />
        </>
      )}

      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
          <Icon name="calendar" size={22} color={t.accent} />
          <View style={{ flex: 1 }}>
            <Text style={[type.headline, { color: t.text }]}>Calendar</Text>
            <Text style={[type.footnote, { color: t.text3 }]}>
              {!calendarSupported
                ? 'Calendar sync is available in the iPhone app.'
                : s.settings.calendarSync
                  ? `Sessions sync to your “Kinetic Training” calendar${s.settings.lastCalendarSync ? ` · updated ${formatDayMonth(s.settings.lastCalendarSync.slice(0, 10))}` : ''}`
                  : 'Add the next 6 weeks of sessions to your calendar, with a reminder an hour before.'}
            </Text>
          </View>
        </View>
        {calendarSupported ? (
          <Button
            title={syncing ? 'Syncing…' : s.settings.calendarSync ? 'Sync now' : 'Add to calendar'}
            icon="sync"
            variant={s.settings.calendarSync ? 'secondary' : 'accent'}
            size="md"
            disabled={syncing}
            onPress={sync}
          />
        ) : null}
      </Card>
    </Screen>
  );
}

function fromTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function Navigator({
  label,
  sub,
  onPrev,
  onNext,
  onToday,
}: {
  label: string;
  sub?: string;
  onPrev: () => void;
  onNext: () => void;
  onToday?: () => void;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      <IconButton icon="chevron-back" label="Previous" onPress={onPrev} />
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={[type.headline, { color: t.text }]}>{label}</Text>
        {sub ? <Text style={[type.caption, { color: t.text3 }]}>{sub}</Text> : null}
      </View>
      {onToday ? (
        <Pressable onPress={onToday} hitSlop={8} accessibilityRole="button">
          <Text style={[type.subhead, { color: t.accent }]}>Today</Text>
        </Pressable>
      ) : null}
      <IconButton icon="chevron-forward" label="Next" onPress={onNext} />
    </View>
  );
}

function MonthGrid({
  month,
  selected,
  onSelect,
  eventDays,
}: {
  month: string;
  selected: string;
  onSelect: (d: string) => void;
  eventDays: Set<string>;
}) {
  const t = useTheme();
  const s = useStore();
  const now = today();
  const first = month;
  const lead = weekdayOf(first);
  const gridStart = addDays(first, -lead);
  const nextMonth = addMonths(month, 1);
  const rows = Math.ceil((lead + diffDays(nextMonth, first)) / 7);
  return (
    <View style={{ gap: 4, marginBottom: space.sm }}>
      <View style={{ flexDirection: 'row' }}>
        {WEEKDAYS_SHORT.map((d) => (
          <Text key={d} style={[type.caption, { color: t.text3, flex: 1, textAlign: 'center' }]}>
            {d.slice(0, 1)}
          </Text>
        ))}
      </View>
      {Array.from({ length: rows }, (_, r) => (
        <View key={r} style={{ flexDirection: 'row' }}>
          {Array.from({ length: 7 }, (_, c) => {
            const date = addDays(gridStart, r * 7 + c);
            const inMonth = date >= first && date < nextMonth;
            const tpl = plannedTemplate(s, date);
            const status = dayStatus(s, s.logs, date);
            const done = status === 'done' || status === 'extra';
            const color = tpl ? kindColor(t, tpl.kind) : t.good;
            const isSel = date === selected;
            return (
              <Pressable
                key={c}
                onPress={() => {
                  tap();
                  onSelect(date);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${formatDayMonth(date)}${tpl ? `, ${tpl.name}` : ''}, ${statusMeta(t, status).label}`}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isSel ? t.ink : done ? color + '26' : 'transparent',
                    borderWidth: date === now && !isSel ? 1.5 : 0,
                    borderColor: t.accent,
                  }}
                >
                  <Text
                    style={[
                      type.subhead,
                      {
                        color: isSel ? t.onInk : !inMonth ? t.text3 + '80' : done ? color : t.text,
                        fontWeight: done || isSel ? '700' : '500',
                        fontVariant: ['tabular-nums'],
                      },
                    ]}
                  >
                    {fromISODate(date).getDate()}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 2, height: 6, marginTop: 2 }}>
                  {tpl && !done ? (
                    <View
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 3,
                        borderWidth: 1.2,
                        borderColor: status === 'missed' ? t.bad : color,
                        opacity: inMonth ? 1 : 0.4,
                      }}
                    />
                  ) : null}
                  {eventDays.has(date) ? <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: t.text3 }} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function Legend() {
  const t = useTheme();
  const item = (color: string, label: string, filled = true) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: radius.pill,
          backgroundColor: filled ? color : 'transparent',
          borderWidth: filled ? 0 : 1.5,
          borderColor: color,
        }}
      />
      <Text style={[type.caption, { color: t.text2 }]}>{label}</Text>
    </View>
  );
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md, paddingHorizontal: space.xs }}>
      {item(t.strength, 'Strength')}
      {item(t.cardio, 'Cardio')}
      {item(t.mobility, 'Mobility')}
      {item(t.text2, 'Planned', false)}
      {item(t.bad, 'Missed', false)}
      {item(t.text3, 'Calendar event')}
    </View>
  );
}
