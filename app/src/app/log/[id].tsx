import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { BodyMap } from '@/components/BodyMap';
import { templateIcon } from '@/components/SessionCard';
import { Button, Card, Chip, Divider, EmptyState, Icon, IconBadge, Row, Screen, SectionTitle, Stat, confirmAction } from '@/components/ui';
import { getExercise } from '@/data/exercises';
import { ACTIVITY_LABELS } from '@/data/templates';
import { bestSet, detectPRs, muscleLoad, sessionSets, sessionVolume } from '@/lib/analytics';
import { formatDuration, formatLong } from '@/lib/dates';
import { useStore } from '@/lib/store';
import { KIND_LABELS, kindColor, radius, space, type, useTheme } from '@/lib/theme';
import { formatNumber, formatWeight, toDisplay } from '@/lib/units';

const EFFORT = ['', 'Easy', 'Moderate', 'Hard', 'Very hard', 'All out'];

export default function LogScreen() {
  const { id, celebrate } = useLocalSearchParams<{ id: string; celebrate?: string }>();
  const t = useTheme();
  const s = useStore();
  const log = s.logs.find((l) => l.id === id);
  const units = s.settings.units;

  if (!log) {
    return (
      <Screen>
        <EmptyState icon="alert-circle-outline" title="Session not found" body="It may have been deleted." />
      </Screen>
    );
  }

  const prs = log.exercises.length ? detectPRs(log, s.logs) : [];
  const volume = sessionVolume(log);
  const color = kindColor(t, log.kind);
  const levels = muscleLoad({
    exercises: log.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets.length, reps: '', restSec: 0 })),
  });

  const remove = () => {
    const go = () => {
      s.deleteLog(log.id);
      router.back();
    };
    confirmAction('Delete session?', 'This removes it from your history and trends.', 'Delete', go);
  };

  return (
    <>
      <Stack.Screen options={{ title: celebrate ? 'Summary' : 'Session' }} />
      <Screen>
        {celebrate ? (
          <Card style={{ backgroundColor: t.goodSoft, alignItems: 'center', gap: space.sm, paddingVertical: space.xl }}>
            <Icon name="trophy" size={40} color={t.good} />
            <Text style={[type.title, { color: t.text }]}>Workout complete</Text>
            <Text style={[type.callout, { color: t.text2, textAlign: 'center' }]}>
              {prs.length
                ? `${prs.length} new personal best${prs.length > 1 ? 's' : ''} today. Strong work.`
                : 'Another session in the bank. Consistency wins.'}
            </Text>
          </Card>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <IconBadge name={templateIcon({ kind: log.kind, activity: log.activity })} color={color} size={48} />
          <View style={{ flex: 1 }}>
            <Text style={[type.title, { color: t.text }]}>{log.name}</Text>
            <Text style={[type.footnote, { color: t.text3 }]}>{formatLong(log.date)}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          <Chip label={KIND_LABELS[log.kind]} color={color} />
          {log.activity && log.activity !== 'strength' ? <Chip label={ACTIVITY_LABELS[log.activity]} /> : null}
          {log.source === 'health' ? <Chip label="Apple Health" icon="heart" /> : null}
          {log.effort ? <Chip label={`Effort: ${EFFORT[log.effort]}`} /> : null}
        </View>

        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {log.durationMin ? <Stat label="Duration" value={formatDuration(log.durationMin)} /> : null}
            {log.exercises.length ? (
              <>
                <Stat label="Volume" value={formatNumber(toDisplay(volume, units))} unit={units} />
                <Stat label="Sets" value={String(sessionSets(log))} />
              </>
            ) : null}
            {log.distanceKm ? <Stat label="Distance" value={log.distanceKm.toFixed(1)} unit="km" /> : null}
            {log.distanceKm && log.durationMin ? <Stat label="Pace" value={pace(log.durationMin, log.distanceKm)} unit="/km" /> : null}
            {log.energyKcal && !log.exercises.length ? <Stat label="Energy" value={formatNumber(log.energyKcal)} unit="kcal" /> : null}
          </View>
        </Card>

        {log.exercises.length ? (
          <>
            <SectionTitle title="Muscles trained" />
            <Card>
              <BodyMap levels={levels} size={180} />
            </Card>
            <SectionTitle title="Exercises" />
            {log.exercises.map((ex, i) => {
              const e = getExercise(ex.exerciseId);
              const best = bestSet(ex);
              const pr = prs.includes(ex.exerciseId);
              return (
                <Card key={i} onPress={() => router.push(`/exercise/${ex.exerciseId}`)} style={{ gap: space.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                    <Text style={[type.headline, { color: t.text, flex: 1 }]}>{e.name}</Text>
                    {pr ? <Chip label="PB" icon="trophy" style={{ backgroundColor: t.goodSoft }} /> : null}
                    <Icon name="chevron-forward" size={16} color={t.text3} />
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                    {ex.sets.map((st, j) => (
                      <View key={j} style={{ backgroundColor: t.fill, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6 }}>
                        <Text style={[type.subhead, { color: t.text, fontVariant: ['tabular-nums'] }]}>
                          {e.bodyweight && st.weight === 0 ? 'BW' : formatWeight(st.weight, units, false)} × {st.reps}
                          {e.timed ? ' s' : ''}
                        </Text>
                      </View>
                    ))}
                  </View>
                  {best.e1rm > 0 ? <Text style={[type.caption, { color: t.text3 }]}>Est. 1RM {formatWeight(best.e1rm, units)}</Text> : null}
                </Card>
              );
            })}
          </>
        ) : null}

        {log.avgSplit || log.splits?.length ? (
          <Card style={{ gap: space.sm }}>
            <Text style={[type.headline, { color: t.text }]}>Row splits</Text>
            {log.avgSplit ? (
              <Text style={[type.body, { color: t.text2 }]}>
                Average <Text style={{ color: t.text, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{log.avgSplit}</Text> /500 m
              </Text>
            ) : null}
            {log.splits?.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                {log.splits.map((sp, i) => (
                  <View key={i} style={{ backgroundColor: t.fill, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6 }}>
                    <Text style={[type.caption, { color: t.text3 }]}>#{i + 1}</Text>
                    <Text style={[type.subhead, { color: t.text, fontVariant: ['tabular-nums'] }]}>{sp || '—'}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </Card>
        ) : null}

        {log.notes ? (
          <Card>
            <Text style={[type.caption, { color: t.text3, marginBottom: 4 }]}>Notes</Text>
            <Text style={[type.body, { color: t.text }]}>{log.notes}</Text>
          </Card>
        ) : null}

        <Card padded={false} style={{ paddingHorizontal: space.lg }}>
          <Row
            title="View day in plan"
            onPress={() => router.push(`/session/${log.date}`)}
            left={<Icon name="calendar-outline" color={t.accent} />}
          />
          <Divider inset={32} />
          <Row title="Delete session" destructive onPress={remove} chevron={false} left={<Icon name="trash-outline" color={t.bad} />} />
        </Card>

        {celebrate ? <Button title="Done" onPress={() => router.dismissTo('/')} /> : null}
      </Screen>
    </>
  );
}

function pace(min: number, km: number) {
  const p = min / km;
  const m = Math.floor(p);
  const sec = Math.round((p - m) * 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}
