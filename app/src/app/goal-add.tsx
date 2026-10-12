import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Card, Chip, Field, ModalHeader, Stepper } from '@/components/ui';
import { EXERCISES, getExercise } from '@/data/exercises';
import { goalProgress, latestWeight, personalBest } from '@/lib/analytics';
import { addDays, formatDayMonth, today } from '@/lib/dates';
import { useStore } from '@/lib/store';
import { space, type, useTheme } from '@/lib/theme';
import type { GoalType } from '@/lib/types';
import { formatWeight, fromDisplay, toDisplay } from '@/lib/units';

const TYPES: { type: GoalType; label: string; icon: string; help: string }[] = [
  { type: 'strength', label: 'Strength', icon: 'barbell-outline', help: 'Reach an estimated 1-rep max on a lift.' },
  { type: 'bodyweight', label: 'Body weight', icon: 'scale-outline', help: 'Gain or lose to a target weight.' },
  { type: 'frequency', label: 'Consistency', icon: 'calendar-outline', help: 'Average sessions per week.' },
  { type: 'distance', label: 'Distance', icon: 'walk-outline', help: 'Kilometres covered this month.' },
  { type: 'protein', label: 'Protein', icon: 'nutrition-outline', help: 'Share of days you hit your protein target.' },
];

export default function GoalAdd() {
  const t = useTheme();
  const s = useStore();
  const units = s.settings.units;
  const [kind, setKind] = useState<GoalType>('strength');
  const [exerciseId, setExerciseId] = useState('bench-press');
  const [target, setTarget] = useState('');
  const [weeks, setWeeks] = useState(12);

  const startValue = (() => {
    switch (kind) {
      case 'strength':
        return personalBest(s.logs, exerciseId)?.value ?? 0;
      case 'bodyweight':
        return latestWeight(s.weights)?.kg ?? 0;
      default:
        return goalProgress({ id: '', type: kind, title: '', start: 0, target: 1, createdAt: today() }, s).current;
    }
  })();

  const raw = parseFloat(target.replace(',', '.'));
  const targetValue = Number.isFinite(raw) ? (kind === 'strength' || kind === 'bodyweight' ? fromDisplay(raw, units) : raw) : NaN;
  const valid = Number.isFinite(targetValue) && targetValue > 0;

  const unitLabel =
    kind === 'strength' || kind === 'bodyweight' ? units : kind === 'frequency' ? 'per week' : kind === 'distance' ? 'km' : '% of days';
  const title = (() => {
    const v = target || '…';
    switch (kind) {
      case 'strength':
        return `${getExercise(exerciseId).name} 1RM ${v} ${units}`;
      case 'bodyweight':
        return `Reach ${v} ${units}`;
      case 'frequency':
        return `Train ${v}× a week`;
      case 'distance':
        return `${v} km this month`;
      case 'protein':
        return `Hit protein ${v}% of days`;
    }
  })();

  const save = () => {
    s.addGoal({
      type: kind,
      title,
      exerciseId: kind === 'strength' ? exerciseId : undefined,
      start: startValue,
      target: targetValue,
      deadline: kind === 'strength' || kind === 'bodyweight' ? addDays(today(), weeks * 7) : undefined,
    });
    router.back();
  };

  const lifts = EXERCISES.filter((e) => !e.bodyweight && ['push', 'pull', 'squat', 'hinge'].includes(e.pattern));

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ModalHeader title="New goal" onCancel={() => router.back()} onSave={save} canSave={valid} />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {TYPES.map((x) => (
            <Chip key={x.type} label={x.label} icon={x.icon as never} selected={kind === x.type} onPress={() => setKind(x.type)} />
          ))}
        </View>
        <Text style={[type.footnote, { color: t.text3 }]}>{TYPES.find((x) => x.type === kind)?.help}</Text>

        {kind === 'strength' ? (
          <View style={{ gap: space.sm }}>
            <Text style={[type.overline, { color: t.text3 }]}>Lift</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {lifts.map((e) => (
                <Chip key={e.id} label={e.name} selected={exerciseId === e.id} onPress={() => setExerciseId(e.id)} />
              ))}
            </View>
          </View>
        ) : null}

        <Card style={{ gap: space.lg }}>
          <View>
            <Text style={[type.caption, { color: t.text3 }]}>Current</Text>
            <Text style={[type.title2, { color: t.text }]}>
              {kind === 'strength' || kind === 'bodyweight'
                ? startValue
                  ? formatWeight(startValue, units)
                  : 'No data yet'
                : kind === 'frequency'
                  ? `${startValue.toFixed(1)} per week`
                  : kind === 'distance'
                    ? `${startValue.toFixed(1)} km`
                    : `${Math.round(startValue)}%`}
            </Text>
          </View>
          <Field
            label="Target"
            value={target}
            onChangeText={setTarget}
            keyboardType="decimal-pad"
            suffix={unitLabel}
            placeholder={
              kind === 'strength' && startValue
                ? String(Math.round(toDisplay(startValue * 1.1, units)))
                : kind === 'bodyweight' && startValue
                  ? String(Math.round(toDisplay(startValue, units)) - 3)
                  : kind === 'frequency'
                    ? '4'
                    : kind === 'distance'
                      ? '50'
                      : '80'
            }
          />
          {kind === 'strength' || kind === 'bodyweight' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={[type.subhead, { color: t.text }]}>Deadline</Text>
                <Text style={[type.footnote, { color: t.text3 }]}>{formatDayMonth(addDays(today(), weeks * 7))}</Text>
              </View>
              <Stepper value={weeks} min={1} max={104} format={(v) => `${v} wk`} onChange={setWeeks} />
            </View>
          ) : null}
        </Card>
        <Text style={[type.headline, { color: t.text, textAlign: 'center' }]}>{title}</Text>
      </ScrollView>
    </View>
  );
}
