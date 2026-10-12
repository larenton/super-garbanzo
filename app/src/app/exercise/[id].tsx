import { Stack, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { BodyMap, type MuscleLevels } from '@/components/BodyMap';
import { LineChart } from '@/components/Charts';
import { Card, Chip, Divider, EmptyState, Screen, SectionTitle, Stat } from '@/components/ui';
import { EQUIPMENT_LABELS, getExercise } from '@/data/exercises';
import { e1rmSeries, personalBest, sortedLogs } from '@/lib/analytics';
import { formatDayMonth } from '@/lib/dates';
import { useStore } from '@/lib/store';
import { radius, space, type, useTheme } from '@/lib/theme';
import { formatWeight, toDisplay } from '@/lib/units';

const PATTERN_LABELS: Record<string, string> = {
  push: 'Push',
  pull: 'Pull',
  squat: 'Squat',
  hinge: 'Hinge',
  lunge: 'Lunge',
  carry: 'Carry',
  core: 'Core',
  isolation: 'Isolation',
};

export default function ExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const s = useStore();
  const ex = getExercise(id);
  const units = s.settings.units;
  const series = e1rmSeries(s.logs, id);
  const pb = personalBest(s.logs, id);
  const history = sortedLogs(s.logs)
    .reverse()
    .map((l) => ({ log: l, ex: l.exercises.find((e) => e.exerciseId === id) }))
    .filter((h) => h.ex && h.ex.sets.length)
    .slice(0, 12);

  const levels: MuscleLevels = {};
  ex.secondary.forEach((m) => (levels[m] = 0.5));
  ex.primary.forEach((m) => (levels[m] = 1));

  const heaviest = Math.max(
    0,
    ...s.logs.flatMap((l) => l.exercises.filter((e) => e.exerciseId === id).flatMap((e) => e.sets.map((x) => x.weight))),
  );

  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <Screen>
        <View style={{ gap: space.sm }}>
          <Text style={[type.largeTitle, { color: t.text }]}>{ex.name}</Text>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Chip label={EQUIPMENT_LABELS[ex.equipment]} />
            <Chip label={PATTERN_LABELS[ex.pattern]} />
          </View>
        </View>

        <Card>
          <BodyMap levels={levels} size={200} />
        </Card>

        <SectionTitle title="Technique" />
        <Card style={{ gap: space.md }}>
          {ex.cues.map((c, i) => (
            <View key={c} style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: t.accentSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={[type.caption, { color: t.accent, fontWeight: '700' }]}>{i + 1}</Text>
              </View>
              <Text style={[type.callout, { color: t.text, flex: 1, paddingTop: 2 }]}>{c}</Text>
            </View>
          ))}
        </Card>

        <SectionTitle title="Progress" />
        {series.length ? (
          <>
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Stat label="Best est. 1RM" value={pb ? formatWeight(pb.value, units, false) : '—'} unit={units} />
                <Stat label="Heaviest set" value={formatWeight(heaviest, units, false)} unit={units} />
                <Stat label="Sessions" value={String(series.length)} />
              </View>
            </Card>
            <Card>
              <LineChart
                data={series.map((p) => ({ date: p.date, value: toDisplay(p.value, units) }))}
                color={t.strength}
                unit={`${units} est. 1RM`}
              />
            </Card>
            <SectionTitle title="History" />
            <Card style={{ paddingVertical: space.xs }}>
              {history.map((h, i) => (
                <View key={h.log.id}>
                  {i > 0 ? <Divider /> : null}
                  <View style={{ paddingVertical: space.md, gap: 6 }}>
                    <Text style={[type.subhead, { color: t.text2 }]}>
                      {formatDayMonth(h.log.date)} · {h.log.name}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {h.ex!.sets.map((st, j) => (
                        <View
                          key={j}
                          style={{ backgroundColor: t.fill, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4 }}
                        >
                          <Text style={[type.footnote, { color: t.text, fontVariant: ['tabular-nums'] }]}>
                            {formatWeight(st.weight, units, false)} × {st.reps}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              ))}
            </Card>
          </>
        ) : (
          <Card>
            <EmptyState
              icon="barbell-outline"
              title="Not logged yet"
              body="Your sets, best lifts and estimated 1RM trend show up after your first session."
            />
          </Card>
        )}
      </Screen>
    </>
  );
}
