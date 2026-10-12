import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { BodyMap } from '@/components/BodyMap';
import { EffortProfile } from '@/components/WorkoutDiagram';
import {
  Button,
  Card,
  Chip,
  Divider,
  EmptyState,
  Field,
  Icon,
  Screen,
  SectionTitle,
  Segmented,
  Stepper,
  confirmAction,
} from '@/components/ui';
import { getExercise } from '@/data/exercises';
import { ACTIVITY_LABELS } from '@/data/templates';
import { muscleLoad } from '@/lib/analytics';
import { useStore } from '@/lib/store';
import { resyncCalendarIfEnabled } from '@/lib/sync';
import { space, type, useTheme } from '@/lib/theme';
import type { ActivityType, CardioSegment, Location, PlannedExercise, SessionKind, WorkoutTemplate } from '@/lib/types';

const ACTIVITIES: ActivityType[] = ['run', 'walk', 'cycle', 'hike', 'swim', 'row', 'hiit', 'yoga', 'sport'];

/** Edits a workout template in place — changes save as you go. */
export default function TemplateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const s = useStore();
  const tpl = s.templates.find((x) => x.id === id);

  if (!tpl) {
    return (
      <Screen>
        <EmptyState icon="alert-circle-outline" title="Workout not found" body="It may have been deleted." />
      </Screen>
    );
  }

  const update = (patch: Partial<WorkoutTemplate>) => s.upsertTemplate({ ...tpl, ...patch });
  const updateEx = (i: number, patch: Partial<PlannedExercise>) =>
    update({ exercises: tpl.exercises.map((e, j) => (j === i ? { ...e, ...patch } : e)) });
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= tpl.exercises.length) return;
    const ex = [...tpl.exercises];
    [ex[i], ex[j]] = [ex[j], ex[i]];
    update({ exercises: ex });
  };
  const segments = tpl.segments ?? [];
  const updateSeg = (i: number, patch: Partial<CardioSegment>) =>
    update({ segments: segments.map((x, j) => (j === i ? { ...x, ...patch } : x)) });

  const remove = () => {
    const go = () => {
      s.deleteTemplate(tpl.id);
      resyncCalendarIfEnabled().catch(() => {});
      router.back();
    };
    confirmAction('Delete workout?', `${tpl.name} will be removed from your weekly schedule too.`, 'Delete', go);
  };

  return (
    <>
      <Stack.Screen options={{ title: tpl.name || 'Workout' }} />
      <Screen>
        <Card style={{ gap: space.lg }}>
          <Field label="Name" value={tpl.name} onChangeText={(name) => update({ name })} />
          <Segmented<SessionKind>
            options={[
              { value: 'strength', label: 'Strength' },
              { value: 'cardio', label: 'Cardio' },
              { value: 'mobility', label: 'Mobility' },
              { value: 'sport', label: 'Sport' },
            ]}
            value={tpl.kind}
            onChange={(kind) =>
              update({ kind, activity: kind === 'strength' ? undefined : (tpl.activity ?? (kind === 'mobility' ? 'yoga' : 'run')) })
            }
          />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            {(['gym', 'outdoor', 'home'] as Location[]).map((l) => (
              <Chip
                key={l}
                label={l === 'gym' ? 'Gym' : l === 'outdoor' ? 'Outdoors' : 'Home'}
                selected={tpl.location === l}
                onPress={() => update({ location: l })}
              />
            ))}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[type.subhead, { color: t.text, flex: 1 }]}>Duration</Text>
            <Stepper
              value={tpl.durationMin}
              step={5}
              min={5}
              max={240}
              format={(v) => `${v} min`}
              onChange={(durationMin) => update({ durationMin })}
            />
          </View>
          <Field
            label="Description"
            value={tpl.description}
            onChangeText={(description) => update({ description })}
            multiline
            placeholder="What's the focus of this session?"
          />
        </Card>

        {tpl.kind !== 'strength' ? (
          <>
            <SectionTitle title="Activity" />
            <Card style={{ gap: space.lg }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
                {ACTIVITIES.map((a) => (
                  <Chip key={a} label={ACTIVITY_LABELS[a]} selected={tpl.activity === a} onPress={() => update({ activity: a })} />
                ))}
              </ScrollView>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[type.subhead, { color: t.text, flex: 1 }]}>Target distance</Text>
                <Stepper
                  value={tpl.targetDistanceKm ?? 0}
                  step={0.5}
                  min={0}
                  max={100}
                  format={(v) => (v ? `${v} km` : '—')}
                  onChange={(v) => update({ targetDistanceKm: v || undefined })}
                />
              </View>
            </Card>

            <SectionTitle title="Blocks" />
            {segments.length ? (
              <Card>
                <EffortProfile segments={segments} />
              </Card>
            ) : null}
            {segments.map((seg, i) => (
              <Card key={i} style={{ gap: space.md }}>
                <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-end' }}>
                  <Field label={`Block ${i + 1}`} value={seg.label} onChangeText={(label) => updateSeg(i, { label })} style={{ flex: 1 }} />
                  <Pressable
                    onPress={() => update({ segments: segments.filter((_, j) => j !== i) })}
                    hitSlop={8}
                    style={{ padding: space.sm }}
                    accessibilityRole="button"
                    accessibilityLabel="Remove block"
                  >
                    <Icon name="trash-outline" color={t.bad} size={20} />
                  </Pressable>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Stepper
                    value={seg.minutes}
                    min={1}
                    max={180}
                    format={(v) => `${v} min`}
                    onChange={(minutes) => updateSeg(i, { minutes })}
                  />
                  <Stepper
                    value={seg.zone}
                    min={1}
                    max={5}
                    format={(v) => `Zone ${v}`}
                    onChange={(z) => updateSeg(i, { zone: z as CardioSegment['zone'] })}
                  />
                </View>
              </Card>
            ))}
            <Button
              title="Add block"
              icon="add"
              variant="secondary"
              onPress={() => update({ segments: [...segments, { label: segments.length ? 'Interval' : 'Warm-up', minutes: 5, zone: 2 }] })}
            />
          </>
        ) : null}

        {tpl.kind !== 'cardio' ? (
          <>
            <SectionTitle title="Exercises" />
            {tpl.exercises.length ? (
              <Card>
                <BodyMap levels={muscleLoad(tpl)} size={160} />
              </Card>
            ) : null}
            {tpl.exercises.map((pe, i) => {
              const ex = getExercise(pe.exerciseId);
              return (
                <Card key={`${pe.exerciseId}-${i}`} style={{ gap: space.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                    <Text style={[type.headline, { color: t.text, flex: 1 }]}>
                      {i + 1}. {ex.name}
                    </Text>
                    <Pressable
                      onPress={() => move(i, -1)}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel="Move up"
                      style={{ padding: 4, opacity: i === 0 ? 0.3 : 1 }}
                    >
                      <Icon name="arrow-up" size={18} color={t.text2} />
                    </Pressable>
                    <Pressable
                      onPress={() => move(i, 1)}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel="Move down"
                      style={{ padding: 4, opacity: i === tpl.exercises.length - 1 ? 0.3 : 1 }}
                    >
                      <Icon name="arrow-down" size={18} color={t.text2} />
                    </Pressable>
                    <Pressable
                      onPress={() => update({ exercises: tpl.exercises.filter((_, j) => j !== i) })}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel="Remove exercise"
                      style={{ padding: 4 }}
                    >
                      <Icon name="trash-outline" size={18} color={t.bad} />
                    </Pressable>
                  </View>
                  <Divider />
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[type.subhead, { color: t.text2, flex: 1 }]}>Sets</Text>
                    <Stepper value={pe.sets} min={1} max={10} onChange={(sets) => updateEx(i, { sets })} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[type.subhead, { color: t.text2, flex: 1 }]}>Rest</Text>
                    <Stepper
                      value={pe.restSec}
                      step={15}
                      min={0}
                      max={600}
                      format={(v) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`}
                      onChange={(restSec) => updateEx(i, { restSec })}
                    />
                  </View>
                  <Field label="Reps (e.g. 5, 8-10, 45s)" value={pe.reps} onChangeText={(reps) => updateEx(i, { reps })} />
                </Card>
              );
            })}
            <Button
              title="Add exercise"
              icon="add"
              variant="secondary"
              onPress={() => router.push({ pathname: '/exercise-picker', params: { mode: 'template', templateId: tpl.id } })}
            />
          </>
        ) : null}

        <Button title="Delete workout" variant="danger" onPress={remove} />
      </Screen>
    </>
  );
}
