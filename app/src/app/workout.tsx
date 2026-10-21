import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MuscleThumb } from '@/components/BodyMap';
import { ExerciseVisual, VideoButton } from '@/components/PlanVisuals';
import { Button, Card, Icon, ProgressBar, tap, confirmAction } from '@/components/ui';
import { getExercise } from '@/data/exercises';
import { lastPerformance, progressionHint } from '@/lib/analytics';
import { formatClock } from '@/lib/dates';
import * as Health from '@/lib/health';
import { useStore } from '@/lib/store';
import { radius, space, type, useTheme } from '@/lib/theme';
import { formatWeight, fromDisplay, increment, toDisplay } from '@/lib/units';

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Numeric cell that keeps the raw text while typing (so "82." works). */
function NumCell({ value, onChange, done, label }: { value: number; onChange: (n: number) => void; done: boolean; label: string }) {
  const t = useTheme();
  const [text, setText] = useState(value ? String(value) : '');
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(value ? String(value) : '');
  }, [value]);
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <TextInput
        accessibilityLabel={label}
        value={text}
        onFocus={() => (focused.current = true)}
        onBlur={() => {
          focused.current = false;
          setText(value ? String(value) : '');
        }}
        onChangeText={(s) => {
          const clean = s.replace(',', '.').replace(/[^0-9.]/g, '');
          setText(clean);
          const n = parseFloat(clean);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        keyboardType="decimal-pad"
        selectTextOnFocus
        placeholder="0"
        placeholderTextColor={t.text3}
        style={[
          type.headline,
          {
            width: '100%',
            height: 40,
            textAlign: 'center',
            borderRadius: radius.sm,
            backgroundColor: done ? 'transparent' : t.fill,
            color: t.text,
            fontVariant: ['tabular-nums'],
          },
        ]}
      />
    </View>
  );
}

export default function WorkoutScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const s = useStore();
  const active = s.active;
  const units = s.settings.units;
  const now = useNow();
  const tpl = s.templates.find((x) => x.id === active?.templateId);
  const [openTips, setOpenTips] = useState<number | null>(null);

  if (!active) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.xl }}>
        <Text style={[type.headline, { color: t.text }]}>No workout in progress</Text>
        <Button title="Close" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const elapsed = now - Date.parse(active.startedAt);
  const restLeft = active.restEndsAt ? active.restEndsAt - now : 0;
  const totalSets = active.exercises.reduce((a, e) => a + e.sets.length, 0);
  const doneSets = active.exercises.reduce((a, e) => a + e.sets.filter((x) => x.done).length, 0);

  const toggle = (ei: number, si: number) => {
    const set = active.exercises[ei].sets[si];
    const nowDone = !set.done;
    s.updateSet(ei, si, { done: nowDone });
    if (nowDone) {
      tap('success');
      const rest = tpl?.exercises.find((p) => p.exerciseId === active.exercises[ei].exerciseId)?.restSec ?? 90;
      // Supersets: short or no rest between paired moves, full rest after the last.
      if (rest > 0) s.startRest(rest);
      else s.setRestTimer(undefined);
    }
  };

  const finish = () => {
    const go = async () => {
      if (doneSets === 0) {
        s.discardWorkout();
        router.back();
        return;
      }
      const log = s.finishWorkout();
      if (!log) return;
      if (s.settings.healthEnabled) {
        try {
          const uuid = await Health.saveWorkout({
            activity: 'strength',
            start: new Date(log.startedAt),
            end: new Date(log.endedAt ?? Date.now()),
          });
          if (uuid) useStore.getState().updateLog(log.id, { healthUuid: uuid });
        } catch {
          // Saving to Health is best-effort.
        }
      }
      router.replace({ pathname: '/log/[id]', params: { id: log.id, celebrate: '1' } });
    };
    const msg = doneSets === 0 ? 'No sets are ticked off, so nothing will be saved.' : `${doneSets} of ${totalSets} sets completed.`;
    if (Platform.OS === 'web') return void go();
    Alert.alert('Finish workout?', msg, [
      { text: 'Keep going', style: 'cancel' },
      { text: doneSets === 0 ? 'Discard' : 'Finish', style: doneSets === 0 ? 'destructive' : 'default', onPress: go },
    ]);
  };

  const discard = () => {
    const go = () => {
      s.discardWorkout();
      router.back();
    };
    confirmAction('Discard workout?', 'Everything logged in this session will be lost.', 'Discard', go);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View
        style={{
          paddingTop: insets.top + space.sm,
          paddingHorizontal: space.lg,
          paddingBottom: space.md,
          gap: space.md,
          backgroundColor: t.bg,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Minimise">
            <Icon name="chevron-down" size={26} color={t.text2} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[type.headline, { color: t.text }]} numberOfLines={1}>
              {active.name}
            </Text>
            <Text style={[type.footnote, { color: t.text3, fontVariant: ['tabular-nums'] }]}>
              {formatClock(elapsed)} · {doneSets}/{totalSets} sets
            </Text>
          </View>
          <Button title="Finish" size="sm" variant="accent" onPress={finish} />
        </View>
        <ProgressBar value={totalSets ? doneSets / totalSets : 0} color={t.good} height={4} />
      </View>

      {restLeft > 0 ? (
        <View
          style={{
            marginHorizontal: space.lg,
            marginBottom: space.sm,
            backgroundColor: t.ink,
            borderRadius: radius.lg,
            padding: space.md,
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.md,
          }}
        >
          <Icon name="hourglass-outline" color={t.onInk} size={20} />
          <View style={{ flex: 1 }}>
            <Text style={[type.caption, { color: t.onInk, opacity: 0.7 }]}>Rest</Text>
            <Text style={[type.title2, { color: t.onInk, fontVariant: ['tabular-nums'] }]}>{formatClock(restLeft)}</Text>
          </View>
          <Pressable onPress={() => s.startRest(30, true)} style={{ padding: space.sm }} accessibilityRole="button">
            <Text style={[type.subhead, { color: t.onInk }]}>+30s</Text>
          </Pressable>
          <Pressable onPress={() => s.setRestTimer(undefined)} style={{ padding: space.sm }} accessibilityRole="button">
            <Text style={[type.subhead, { color: t.onInk, fontWeight: '700' }]}>Skip</Text>
          </Pressable>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingTop: space.xs, gap: space.lg, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {active.exercises.map((exLog, ei) => {
          const ex = getExercise(exLog.exerciseId);
          const plan = tpl?.exercises.find((p) => p.exerciseId === exLog.exerciseId);
          const letter = plan?.group?.charAt(0);
          const groupOf = (i: number) => tpl?.exercises.find((p) => p.exerciseId === active.exercises[i]?.exerciseId)?.group?.charAt(0);
          const groupSize = letter ? active.exercises.filter((_, i) => groupOf(i) === letter).length : 0;
          const startsGroup = !!letter && groupSize > 1 && groupOf(ei - 1) !== letter;
          const groupMembers = tpl?.exercises.filter((p) => p.group?.charAt(0) === letter) ?? [];
          const timed = !!ex.timed;
          const prev = lastPerformance(s.logs, exLog.exerciseId);
          const hint = plan ? progressionHint(s.logs, exLog.exerciseId, plan.reps, increment(units)) : undefined;
          const allDone = exLog.sets.length > 0 && exLog.sets.every((x) => x.done);
          return (
            <View key={`${exLog.exerciseId}-${ei}`} style={{ gap: space.sm }}>
              {startsGroup ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs }}>
                  <View style={{ backgroundColor: t.strength, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={[type.caption, { color: '#fff', fontWeight: '700' }]}>
                      {groupSize >= 3 ? 'GIANT SET' : 'SUPERSET'} {letter}
                    </Text>
                  </View>
                  <Text style={[type.footnote, { color: t.text3, flex: 1 }]}>
                    {groupMembers.map((p) => p.group).join(' → ')}, then rest {groupMembers[groupMembers.length - 1]?.restSec ?? 60} s.
                    Repeat each round.
                  </Text>
                </View>
              ) : null}
              <Card
                style={{
                  gap: space.md,
                  opacity: allDone ? 0.75 : 1,
                  borderLeftWidth: letter && groupSize > 1 ? 4 : 0,
                  borderLeftColor: t.strength,
                }}
              >
                <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
                  <MuscleThumb primary={ex.primary} secondary={ex.secondary} size={46} />
                  <View style={{ flex: 1 }}>
                    <Text style={[type.headline, { color: t.text }]}>
                      {plan?.group ? <Text style={{ color: t.strength }}>{plan.group} </Text> : null}
                      {ex.name}
                    </Text>
                    <Text style={[type.footnote, { color: t.text3 }]}>
                      {plan
                        ? `Target ${plan.sets} × ${plan.reps} · ${plan.restSec ? `${plan.restSec} s rest` : 'no rest'}`
                        : 'Added exercise'}
                      {ex.bodyweight ? ' · log added load' : ''}
                    </Text>
                    {s.program.tempo && !timed && ex.pattern !== 'core' ? (
                      <Text style={[type.caption, { color: t.text3 }]}>Tempo {s.program.tempo}</Text>
                    ) : null}
                    {hint ? <Text style={[type.caption, { color: t.good, marginTop: 2 }]}>{hint}</Text> : null}
                  </View>
                  <Pressable
                    onPress={() => setOpenTips(openTips === ei ? null : ei)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Form tips"
                  >
                    <Icon name={openTips === ei ? 'information-circle' : 'information-circle-outline'} color={t.accent} size={22} />
                  </Pressable>
                </View>
                {openTips === ei ? (
                  <View style={{ backgroundColor: t.cardAlt, borderRadius: radius.md, padding: space.md, gap: space.sm }}>
                    <ExerciseVisual exerciseId={exLog.exerciseId} />
                    {ex.cues.map((c) => (
                      <Text key={c} style={[type.footnote, { color: t.text2 }]}>
                        • {c}
                      </Text>
                    ))}
                    {plan?.note ? <Text style={[type.footnote, { color: t.text2 }]}>• {plan.note}</Text> : null}
                    <VideoButton exerciseId={exLog.exerciseId} compact />
                  </View>
                ) : null}

                <View style={{ flexDirection: 'row', paddingHorizontal: 2 }}>
                  <Text style={[type.caption, { color: t.text3, width: 34 }]}>SET</Text>
                  <Text style={[type.caption, { color: t.text3, flex: 1.3 }]}>PREVIOUS</Text>
                  <Text style={[type.caption, { color: t.text3, flex: 1, textAlign: 'center' }]}>{units.toUpperCase()}</Text>
                  <View style={{ width: space.sm }} />
                  <Text style={[type.caption, { color: t.text3, flex: 1, textAlign: 'center' }]}>{timed ? 'SEC' : 'REPS'}</Text>
                  <View style={{ width: 48 }} />
                </View>
                {exLog.sets.map((set, si) => {
                  const p = prev?.sets[si];
                  return (
                    <View
                      key={si}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 2,
                        paddingHorizontal: 2,
                        borderRadius: radius.sm,
                        backgroundColor: set.done ? t.goodSoft : 'transparent',
                      }}
                    >
                      <Pressable
                        onLongPress={() => s.removeSet(ei, si)}
                        style={{ width: 34 }}
                        accessibilityRole="button"
                        accessibilityLabel={`Set ${si + 1}. Long press to remove.`}
                      >
                        <Text style={[type.headline, { color: t.text2 }]}>{si + 1}</Text>
                      </Pressable>
                      <Text style={[type.footnote, { color: t.text3, flex: 1.3, fontVariant: ['tabular-nums'] }]} numberOfLines={1}>
                        {p ? `${formatWeight(p.weight, units, false)} × ${p.reps}${timed ? ' s' : ''}` : '—'}
                      </Text>
                      <NumCell
                        label={`Set ${si + 1} weight`}
                        value={toDisplay(set.weight, units)}
                        done={set.done}
                        onChange={(n) => s.updateSet(ei, si, { weight: fromDisplay(n, units) })}
                      />
                      <View style={{ width: space.sm }} />
                      <NumCell
                        label={`Set ${si + 1} ${timed ? 'seconds' : 'reps'}`}
                        value={set.reps}
                        done={set.done}
                        onChange={(n) => s.updateSet(ei, si, { reps: Math.round(n) })}
                      />
                      <Pressable
                        onPress={() => toggle(ei, si)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: set.done }}
                        accessibilityLabel={`Complete set ${si + 1}`}
                        hitSlop={6}
                        style={{ width: 48, alignItems: 'flex-end' }}
                      >
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: radius.sm + 2,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: set.done ? t.good : t.fill,
                          }}
                        >
                          <Icon name="checkmark" size={20} color={set.done ? '#fff' : t.text3} />
                        </View>
                      </Pressable>
                    </View>
                  );
                })}
                <View style={{ flexDirection: 'row', gap: space.sm }}>
                  <Button title="Add set" icon="add" size="sm" variant="secondary" onPress={() => s.addSet(ei)} />
                  <View style={{ flex: 1 }} />
                  <Button
                    title="Remove"
                    size="sm"
                    variant="ghost"
                    onPress={() => {
                      confirmAction('Remove exercise?', ex.name, 'Remove', () => s.removeExerciseFromActive(ei));
                    }}
                  />
                </View>
              </Card>
            </View>
          );
        })}

        <Button
          title="Add exercise"
          icon="add-circle-outline"
          variant="secondary"
          onPress={() => router.push({ pathname: '/exercise-picker', params: { mode: 'active' } })}
        />
        <Button title="Discard workout" variant="danger" onPress={discard} />
        <Text style={[type.caption, { color: t.text3, textAlign: 'center' }]}>
          Tick a set to start the rest timer. Long-press a set number to remove it.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
