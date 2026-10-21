import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Card, Chip, Divider, Field, Icon, IconBadge, ModalHeader, Stepper, tap } from '@/components/ui';
import { ACTIVITY_ICONS, ACTIVITY_LABELS } from '@/data/templates';
import { formatDuration, relativeDay, today, toISODate } from '@/lib/dates';
import * as Health from '@/lib/health';
import { uid, useStore } from '@/lib/store';
import { kindForActivity } from '@/lib/sync';
import { kindColor, space, type, useTheme } from '@/lib/theme';
import type { ActivityType } from '@/lib/types';

const ACTIVITIES: ActivityType[] = ['row', 'run', 'walk', 'cycle', 'hike', 'swim', 'mixed', 'hiit', 'yoga', 'sport', 'strength'];

/** Accepts "1:52", "1:52.4" or "152" and returns a tidy "m:ss.s" split, or undefined. */
function cleanSplit(v: string): string | undefined {
  const m = v.trim().match(/^(\d{1,2})[:.](\d{2}(?:\.\d)?)$/) ?? v.trim().match(/^(\d)(\d{2})$/);
  return m ? `${m[1]}:${m[2]}` : undefined;
}
const EFFORT = ['Easy', 'Moderate', 'Hard', 'Very hard', 'All out'];

export default function LogActivity() {
  const params = useLocalSearchParams<{ date?: string; templateId?: string }>();
  const t = useTheme();
  const s = useStore();
  const tpl = s.templates.find((x) => x.id === params.templateId);
  const date = params.date ?? today();

  const [activity, setActivity] = useState<ActivityType>(tpl?.activity ?? 'run');
  const [duration, setDuration] = useState(tpl?.durationMin ?? 30);
  const [distance, setDistance] = useState(tpl?.targetDistanceKm ? String(tpl.targetDistanceKm) : '');
  const plannedEffort = tpl?.intensity?.split(' ')[0];
  const [effort, setEffort] = useState(
    plannedEffort === 'Hard' || plannedEffort === 'Max' ? 3 : plannedEffort === 'Steady' ? 1 : plannedEffort === 'Easy' ? 0 : 2,
  );
  const [notes, setNotes] = useState('');
  const [avgSplit, setAvgSplit] = useState('');
  const [splits, setSplits] = useState<string[]>(tpl?.splits?.kind === 'intervals' ? Array(tpl.splits.count).fill('') : []);
  const [healthWorkouts, setHealthWorkouts] = useState<Health.HealthWorkout[]>([]);

  useEffect(() => {
    if (s.settings.healthEnabled && Health.isHealthAvailable()) {
      const known = new Set(s.logs.map((l) => l.healthUuid));
      Health.getRecentWorkouts(7)
        .then((w) => setHealthWorkouts(w.filter((x) => !known.has(x.uuid)).slice(0, 5)))
        .catch(() => {});
    }
  }, [s.settings.healthEnabled, s.logs]);

  const km = parseFloat(distance.replace(',', '.'));
  const distanceKm = Number.isFinite(km) && km > 0 ? km : undefined;

  const save = async () => {
    const start = new Date(`${date}T${s.program.sessionTime}:00`);
    const end = new Date(start.getTime() + duration * 60000);
    const id = uid();
    s.addLog({
      id,
      date,
      templateId: tpl?.id,
      name: tpl?.name ?? ACTIVITY_LABELS[activity],
      kind: tpl?.kind ?? kindForActivity(activity),
      activity,
      startedAt: start.toISOString(),
      endedAt: end.toISOString(),
      durationMin: duration,
      distanceKm,
      avgSplit: cleanSplit(avgSplit),
      splits: splits.some((x) => cleanSplit(x)) ? splits.map((x) => cleanSplit(x) ?? '') : undefined,
      effort: effort + 1,
      notes: notes.trim() || undefined,
      exercises: [],
      source: 'app',
    });
    router.back();
    if (s.settings.healthEnabled) {
      Health.saveWorkout({ activity, start, end, distanceKm })
        .then((uuid) => uuid && useStore.getState().updateLog(id, { healthUuid: uuid }))
        .catch(() => {});
    }
  };

  const importWorkout = (w: Health.HealthWorkout) => {
    tap('success');
    const wDate = toISODate(new Date(w.start));
    s.addLog({
      id: uid(),
      date: wDate,
      templateId: wDate === date ? tpl?.id : undefined,
      name: wDate === date && tpl ? tpl.name : ACTIVITY_LABELS[w.activity],
      kind: wDate === date && tpl ? tpl.kind : kindForActivity(w.activity),
      activity: w.activity,
      startedAt: w.start,
      endedAt: w.end,
      durationMin: w.durationMin,
      distanceKm: w.distanceKm,
      energyKcal: w.energyKcal ? Math.round(w.energyKcal) : undefined,
      exercises: [],
      source: 'health',
      healthUuid: w.uuid,
    });
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ModalHeader title={tpl ? tpl.name : 'Log activity'} onCancel={() => router.back()} onSave={save} />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <Text style={[type.footnote, { color: t.text3 }]}>
          For {relativeDay(date).toLowerCase() === 'today' ? 'today' : relativeDay(date)}
        </Text>

        {healthWorkouts.length ? (
          <View style={{ gap: space.sm }}>
            <Text style={[type.overline, { color: t.text3 }]}>From Apple Health</Text>
            <Card style={{ paddingVertical: space.xs }}>
              {healthWorkouts.map((w, i) => (
                <View key={w.uuid}>
                  {i > 0 ? <Divider inset={48} /> : null}
                  <Pressable
                    onPress={() => importWorkout(w)}
                    accessibilityRole="button"
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: space.md,
                      paddingVertical: space.md,
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <IconBadge name={ACTIVITY_ICONS[w.activity]} color={kindColor(t, kindForActivity(w.activity))} />
                    <View style={{ flex: 1 }}>
                      <Text style={[type.body, { color: t.text }]}>{ACTIVITY_LABELS[w.activity]}</Text>
                      <Text style={[type.footnote, { color: t.text3 }]}>
                        {relativeDay(toISODate(new Date(w.start)))} · {formatDuration(w.durationMin)}
                        {w.distanceKm ? ` · ${w.distanceKm.toFixed(1)} km` : ''}
                      </Text>
                    </View>
                    <Text style={[type.subhead, { color: t.accent }]}>Import</Text>
                  </Pressable>
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        <View style={{ gap: space.sm }}>
          <Text style={[type.overline, { color: t.text3 }]}>Activity</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {ACTIVITIES.map((a) => (
              <Chip
                key={a}
                label={ACTIVITY_LABELS[a]}
                icon={ACTIVITY_ICONS[a] as never}
                selected={activity === a}
                onPress={() => setActivity(a)}
              />
            ))}
          </View>
        </View>

        <Card style={{ gap: space.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="time-outline" color={t.text2} />
            <Text style={[type.subhead, { color: t.text, flex: 1, marginLeft: space.sm }]}>Duration</Text>
            <Stepper value={duration} step={5} min={5} max={600} format={(v) => formatDuration(v)} onChange={setDuration} />
          </View>
          <Field
            label="Distance"
            value={distance}
            onChangeText={setDistance}
            keyboardType="decimal-pad"
            placeholder="Optional"
            suffix="km"
          />
          {tpl?.splits?.kind === 'average' || (!tpl && activity === 'row') ? (
            <Field
              label="Average 500 m split"
              value={avgSplit}
              onChangeText={setAvgSplit}
              keyboardType="numbers-and-punctuation"
              placeholder="e.g. 2:05.0"
              suffix="/500 m"
            />
          ) : null}
          {tpl?.splits?.kind === 'intervals' ? (
            <View style={{ gap: space.sm }}>
              <Text style={[type.caption, { color: t.text2 }]}>
                {tpl.splits.distanceM} m splits · try to keep every rep within 2-3 s of your fastest
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                {splits.map((v, i) => (
                  <Field
                    key={i}
                    label={`#${i + 1}`}
                    value={v}
                    onChangeText={(x) => setSplits(splits.map((y, j) => (j === i ? x : y)))}
                    keyboardType="numbers-and-punctuation"
                    placeholder="1:50.0"
                    style={{ width: '30%', minWidth: 92 }}
                  />
                ))}
              </View>
              <SplitSpread splits={splits.map((x) => cleanSplit(x)).filter((x): x is string => !!x)} />
            </View>
          ) : null}
          <View style={{ gap: space.sm }}>
            <Text style={[type.caption, { color: t.text2 }]}>How did it feel?</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {EFFORT.map((e, i) => (
                <Chip key={e} label={e} selected={effort === i} onPress={() => setEffort(i)} />
              ))}
            </View>
          </View>
          <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Route, conditions, how you felt…" multiline />
        </Card>
        {s.settings.healthEnabled ? (
          <Text style={[type.caption, { color: t.text3, textAlign: 'center' }]}>This will also be saved to Apple Health.</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

function toSec(split: string) {
  const [m, sec] = split.split(':');
  return parseInt(m, 10) * 60 + parseFloat(sec);
}

/** Shows how far each rep is from the fastest, against the plan's 2-3 s window. */
function SplitSpread({ splits }: { splits: string[] }) {
  const t = useTheme();
  if (splits.length < 2) return null;
  const secs = splits.map(toSec);
  const best = Math.min(...secs);
  const worst = Math.max(...secs) - best;
  return (
    <Text style={[type.footnote, { color: worst <= 3 ? t.good : t.warn }]}>
      Fastest {splits[secs.indexOf(best)]} · slowest rep +{worst.toFixed(1)} s{' '}
      {worst <= 3 ? '(within 3 s, nice)' : '(outside the 2-3 s window)'}
    </Text>
  );
}
