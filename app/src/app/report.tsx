import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';

import { Button, Card, Field, IconButton, Screen, SectionTitle, tap } from '@/components/ui';
import { getExercise } from '@/data/exercises';
import { dayStatus, logsOn, macroTotals, plannedTemplate, targetsFor, weeklyBuckets } from '@/lib/analytics';
import { addDays, formatDayMonth, startOfWeek, today, WEEKDAYS_SHORT } from '@/lib/dates';
import { useStore } from '@/lib/store';
import { radius, space, type, useTheme } from '@/lib/theme';
import type { SessionLog } from '@/lib/types';

/** Lifts the plan asks for by name in the end-of-week report. */
const KEY_LIFTS = ['seated-db-shoulder-press', 'pull-up', 'leg-press'];

function topSet(logs: SessionLog[], exerciseId: string) {
  let best: { weight: number; reps: number } | undefined;
  for (const l of logs) {
    const ex = l.exercises.find((e) => e.exerciseId === exerciseId);
    if (!ex) continue;
    for (const st of ex.sets) {
      if (!best || st.weight > best.weight || (st.weight === best.weight && st.reps > best.reps)) best = st;
    }
  }
  return best;
}

/**
 * End-of-week report from the plan ("End of week, send me…"), formatted to
 * paste straight into the Claude project that writes the next week.
 */
export default function ReportScreen() {
  const t = useTheme();
  const s = useStore();
  const [weekStart, setWeekStart] = useState(startOfWeek(today()));
  const [copied, setCopied] = useState(false);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekLogs = s.logs.filter((l) => l.date >= weekStart && l.date <= days[6]);
  const meta = s.checkins[weekStart] ?? {};
  const units = s.settings.units;

  const weighIns = s.weights.filter((w) => w.date >= weekStart && w.date <= days[6]);
  const avgWeight = weighIns.length ? weighIns.reduce((a, w) => a + w.kg, 0) / weighIns.length : undefined;
  const steady = weekLogs.find((l) => l.avgSplit);
  const intervals = weekLogs.find((l) => l.splits?.some(Boolean));
  const bucket = weeklyBuckets(s, s.logs, 1, days[6])[0];
  const energies = days.map((d) => s.checkins[d]?.energy).filter((x): x is number => x !== undefined);
  const sleeps = days.map((d) => s.checkins[d]?.sleepHours).filter((x): x is number => x !== undefined);
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined);
  const proteinDays = days.filter((d) => {
    const tot = macroTotals(s.food, d);
    return tot.kcal > 0 && tot.protein >= targetsFor(s, d).protein * 0.95;
  }).length;
  const loggedFoodDays = days.filter((d) => macroTotals(s.food, d).kcal > 0).length;
  const lifts = [...new Set(weekLogs.flatMap((l) => l.exercises.map((e) => e.exerciseId)))];

  const w = (kg: number) => `${(units === 'lb' ? kg * 2.20462 : kg).toFixed(1)} ${units}`;
  const set = (x?: { weight: number; reps: number }, id?: string) =>
    x ? `${x.weight > 0 ? w(x.weight) : 'bodyweight'} × ${x.reps}${id && getExercise(id).timed ? ' s' : ''}` : 'not logged';

  const lines = [
    `Week report · ${formatDayMonth(weekStart)} – ${formatDayMonth(days[6])} (${s.program.name})`,
    '',
    `Average weight: ${avgWeight ? w(avgWeight) : 'no weigh-ins'} (${weighIns.length} weigh-ins${weighIns.length ? `: ${weighIns.map((x) => x.kg.toFixed(1)).join(', ')}` : ''})`,
    `Waist: ${meta.waistCm ? `${meta.waistCm} cm` : 'not measured'}`,
    `Tuesday row: ${steady ? `avg ${steady.avgSplit}/500 m${steady.durationMin ? ` over ${steady.durationMin} min` : ''}` : 'not logged'}`,
    `Thursday 500 m splits: ${intervals ? intervals.splits!.filter(Boolean).join(', ') : 'not logged'}`,
    ...KEY_LIFTS.map((id) => `Top ${getExercise(id).name.toLowerCase()}: ${set(topSet(weekLogs, id), id)}`),
    `Sessions: ${bucket.done} of ${bucket.planned} planned`,
    ...days.map((d, i) => {
      const tpl = plannedTemplate(s, d);
      const st = dayStatus(s, s.logs, d);
      const done = logsOn(s.logs, d)
        .map((l) => l.name)
        .join(' + ');
      return `  ${WEEKDAYS_SHORT[i]}: ${tpl ? tpl.name : 'Rest'} — ${st === 'done' || st === 'extra' ? `done${done && done !== tpl?.name ? ` (${done})` : ''}` : st === 'missed' ? 'missed' : st === 'rest' ? 'rest' : 'to do'}`;
    }),
    `Energy: ${energies.length ? `avg ${mean(energies)!.toFixed(1)}/10 (${energies.join(', ')})` : 'not logged'}`,
    `Sleep: ${sleeps.length ? `avg ${mean(sleeps)!.toFixed(1)} h` : 'not logged'}`,
    `Protein target hit: ${proteinDays} of ${loggedFoodDays} logged days`,
    '',
    'All lifts (top set):',
    ...lifts.map((id) => `  ${getExercise(id).name}: ${set(topSet(weekLogs, id), id)}`),
    '',
    `How I felt: ${meta.note?.trim() || '—'}`,
  ];
  const text = lines.join('\n');

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(text);
      tap('success');
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const cell = (v: string, good?: boolean) => (
    <Text
      style={[
        type.caption,
        { flex: 1, textAlign: 'center', color: good === undefined ? t.text : good ? t.good : t.text3, fontVariant: ['tabular-nums'] },
      ]}
    >
      {v}
    </Text>
  );

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <IconButton icon="chevron-back" label="Previous week" onPress={() => setWeekStart(addDays(weekStart, -7))} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[type.headline, { color: t.text }]}>
            {formatDayMonth(weekStart)} – {formatDayMonth(days[6])}
          </Text>
          <Text style={[type.caption, { color: t.text3 }]}>Check-in log</Text>
        </View>
        <IconButton icon="chevron-forward" label="Next week" onPress={() => setWeekStart(addDays(weekStart, 7))} />
      </View>

      <Card style={{ gap: space.sm }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ minWidth: '100%' }}>
          <View style={{ gap: space.sm, minWidth: 330, flex: 1 }}>
            <View style={{ flexDirection: 'row' }}>
              <Text style={[type.caption, { width: 84, color: t.text3 }]} />
              {days.map((d, i) => (
                <Text key={d} style={[type.caption, { flex: 1, textAlign: 'center', color: d === today() ? t.accent : t.text3 }]}>
                  {WEEKDAYS_SHORT[i]}
                </Text>
              ))}
            </View>
            {[
              {
                label: 'Weight',
                v: (d: string) => {
                  const x = s.weights.find((y) => y.date === d);
                  return x ? cell(x.kg.toFixed(1)) : cell('·', false);
                },
              },
              {
                label: 'Session',
                v: (d: string) => {
                  const st = dayStatus(s, s.logs, d);
                  return st === 'rest'
                    ? cell('–', false)
                    : cell(st === 'done' || st === 'extra' ? '✓' : '·', st === 'done' || st === 'extra');
                },
              },
              { label: 'Energy', v: (d: string) => (s.checkins[d]?.energy ? cell(String(s.checkins[d]!.energy)) : cell('·', false)) },
              {
                label: 'Sleep',
                v: (d: string) => (s.checkins[d]?.sleepHours !== undefined ? cell(String(s.checkins[d]!.sleepHours)) : cell('·', false)),
              },
              {
                label: 'Protein',
                v: (d: string) => {
                  const tot = macroTotals(s.food, d);
                  if (!tot.kcal) return cell('·', false);
                  const hit = tot.protein >= targetsFor(s, d).protein * 0.95;
                  return cell(hit ? '✓' : '✗', hit);
                },
              },
            ].map((row) => (
              <View key={row.label} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 26 }}>
                <Text style={[type.footnote, { width: 84, color: t.text2 }]}>{row.label}</Text>
                {days.map((d) => (
                  <View key={d} style={{ flex: 1 }}>
                    {row.v(d)}
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </Card>

      <SectionTitle title="Add for this week" />
      <Card style={{ gap: space.md }}>
        <Field
          label="Waist measurement"
          value={meta.waistCm ? String(meta.waistCm) : ''}
          onChangeText={(v) => {
            const n = parseFloat(v.replace(',', '.'));
            s.setCheckIn(weekStart, { waistCm: Number.isFinite(n) ? n : undefined });
          }}
          keyboardType="decimal-pad"
          placeholder="e.g. 78"
          suffix="cm"
        />
        <Field
          label="How you felt"
          value={meta.note ?? ''}
          onChangeText={(note) => s.setCheckIn(weekStart, { note })}
          placeholder="Energy, soreness, sleep, anything your coach should know"
          multiline
        />
      </Card>

      <SectionTitle title="Report for Claude" />
      <Card style={{ gap: space.md }}>
        <Text style={[type.footnote, { color: t.text3 }]}>
          Everything the plan asks for at the end of the week. Copy it into your Claude project to get Week 2.
        </Text>
        <View style={{ backgroundColor: t.cardAlt, borderRadius: radius.md, padding: space.md }}>
          <Text
            selectable
            style={[
              type.footnote,
              {
                color: t.text,
                fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, Menlo, monospace' }),
                lineHeight: 19,
              },
            ]}
          >
            {text}
          </Text>
        </View>
        <Button title={copied ? 'Copied' : 'Copy report'} icon={copied ? 'checkmark' : 'copy-outline'} variant="accent" onPress={copy} />
      </Card>
    </Screen>
  );
}
