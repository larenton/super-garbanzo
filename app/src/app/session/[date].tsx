import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { BodyMap } from '@/components/BodyMap';
import { SessionRow, statusMeta, templateIcon } from '@/components/SessionCard';
import { CoachNote, RpeScale, TempoBar } from '@/components/PlanVisuals';
import { Button, Card, Chip, confirmAction, Divider, Icon, IconBadge, Screen, SectionTitle, Stat } from '@/components/ui';
import { EffortProfile, SessionFlow } from '@/components/WorkoutDiagram';
import { getExercise } from '@/data/exercises';
import { dayStatus, lastPerformance, logsOn, muscleLoad, plannedTemplate, progressionHint } from '@/lib/analytics';
import { addDays, formatDuration, formatLong, relativeDay, today } from '@/lib/dates';
import { useStore } from '@/lib/store';
import { resyncCalendarIfEnabled } from '@/lib/sync';
import { KIND_LABELS, kindColor, space, type, useTheme } from '@/lib/theme';
import { increment } from '@/lib/units';

export default function SessionScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const t = useTheme();
  const s = useStore();
  const [changing, setChanging] = useState(false);
  const tpl = plannedTemplate(s, date);
  const logs = logsOn(s.logs, date);
  const status = dayStatus(s, s.logs, date);
  const meta = statusMeta(t, status);
  const isPast = date < today();

  const start = () => {
    if (!tpl) return;
    if (tpl.kind !== 'strength') {
      router.push({ pathname: '/log-activity', params: { date, templateId: tpl.id } });
      return;
    }
    if (!s.active) s.startWorkout(date, tpl.id);
    router.push('/workout');
  };

  const override = (value: string | null) => {
    s.setOverride(date, value);
    setChanging(false);
    resyncCalendarIfEnabled().catch(() => {});
  };

  // Plan rule 3: "Feeling flat? Swap it" — steady cardio today, this lift tomorrow.
  const swapTarget = s.templates.find((x) => x.id === 'steady-row') ?? s.templates.find((x) => x.kind === 'cardio');
  const canSwap = tpl?.kind === 'strength' && logs.length === 0 && date >= today() && swapTarget;
  const swap = () => {
    if (!tpl || !swapTarget) return;
    confirmAction(
      'Feeling flat? Swap it',
      `${swapTarget.name} today, and ${tpl.name} moves to ${relativeDay(addDays(date, 1)).toLowerCase()}.`,
      'Swap',
      () => {
        s.setOverride(date, swapTarget.id);
        s.setOverride(addDays(date, 1), tpl.id);
        resyncCalendarIfEnabled().catch(() => {});
      },
    );
  };
  const intensityLabel = tpl?.intensity?.split(' ·')[0];

  const hints = tpl?.exercises
    .map((pe) => ({ id: pe.exerciseId, hint: progressionHint(s.logs, pe.exerciseId, pe.reps, increment(s.settings.units)) }))
    .filter((h) => h.hint);

  return (
    <>
      <Stack.Screen options={{ title: relativeDay(date) }} />
      <Screen>
        <View style={{ gap: space.sm }}>
          <Text style={[type.footnote, { color: t.text3 }]}>{formatLong(date)}</Text>
          {tpl ? (
            <>
              <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
                <Chip label={KIND_LABELS[tpl.kind]} color={kindColor(t, tpl.kind)} />
                <Chip
                  label={tpl.location === 'gym' ? 'Gym' : tpl.location === 'outdoor' ? 'Outdoors' : 'Home'}
                  icon={tpl.location === 'gym' ? 'business-outline' : tpl.location === 'outdoor' ? 'leaf-outline' : 'home-outline'}
                />
                {status !== 'planned' ? <Chip label={meta.label} icon={meta.icon as never} /> : null}
                {s.overrides[date] ? <Chip label="Changed for this day" icon="swap-horizontal" /> : null}
              </View>
              <Text style={[type.largeTitle, { color: t.text }]}>{tpl.name}</Text>
              <Text style={[type.callout, { color: t.text2 }]}>{tpl.description}</Text>
            </>
          ) : (
            <>
              <Text style={[type.largeTitle, { color: t.text }]}>Rest day</Text>
              <Text style={[type.callout, { color: t.text2 }]}>Nothing planned. Recover, or add a session for this day.</Text>
            </>
          )}
        </View>

        {tpl ? (
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Stat label="Duration" value={formatDuration(tpl.durationMin)} />
              {tpl.exercises.length && tpl.kind === 'strength' ? (
                <>
                  <Stat label="Exercises" value={String(tpl.exercises.length)} />
                  <Stat label="Sets" value={String(tpl.exercises.reduce((a, e) => a + e.sets, 0))} />
                </>
              ) : (
                <>
                  {tpl.targetDistanceKm ? <Stat label="Target" value={String(tpl.targetDistanceKm)} unit="km" /> : null}
                  <Stat label="Blocks" value={String(tpl.segments?.length ?? tpl.exercises.length)} />
                </>
              )}
            </View>
          </Card>
        ) : null}

        {logs.length ? (
          <>
            <SectionTitle title="Logged" />
            <Card style={{ paddingVertical: space.xs }}>
              {logs.map((l, i) => (
                <View key={l.id}>
                  {i > 0 ? <Divider inset={52} /> : null}
                  <SessionRow date={date} log={l} showDate={false} onPress={() => router.push(`/log/${l.id}`)} />
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {tpl && logs.length === 0 ? (
          <Button
            title={tpl.kind === 'strength' ? (isPast ? 'Log this workout' : 'Start workout') : 'Log activity'}
            icon={tpl.kind === 'strength' ? 'play' : 'add'}
            onPress={start}
          />
        ) : null}

        {canSwap ? (
          <Button title="Feeling flat? Swap for steady cardio" icon="swap-horizontal" variant="secondary" size="md" onPress={swap} />
        ) : null}

        {tpl?.intensity ? (
          <Card style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Icon name="pulse" size={18} color={kindColor(t, tpl.kind)} />
              <Text style={[type.headline, { color: t.text }]}>{tpl.intensity}</Text>
            </View>
            <RpeScale highlight={intensityLabel === 'Hard efforts' || intensityLabel === 'Max effort' ? 'Hard' : intensityLabel} />
          </Card>
        ) : null}

        {tpl?.why ? <CoachNote title="Why this session" body={tpl.why} /> : null}

        {tpl?.kind === 'strength' && s.program.tempo ? (
          <Card style={{ gap: space.md }}>
            <Text style={[type.headline, { color: t.text }]}>Tempo {s.program.tempo} on every lift</Text>
            <TempoBar tempo={s.program.tempo} />
          </Card>
        ) : null}

        {tpl && tpl.exercises.length > 0 ? (
          <>
            <SectionTitle title="Muscles worked" />
            <Card>
              <BodyMap levels={muscleLoad(tpl)} size={200} />
            </Card>
          </>
        ) : null}

        {tpl?.segments?.length ? (
          <>
            <SectionTitle title="Effort profile" />
            <Card>
              <EffortProfile segments={tpl.segments} />
            </Card>
          </>
        ) : null}

        {tpl && tpl.exercises.length > 0 ? (
          <>
            <SectionTitle title="Session flow" />
            {hints?.length ? (
              <Card style={{ backgroundColor: t.goodSoft, gap: 6 }}>
                <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
                  <Icon name="trending-up" color={t.good} size={18} />
                  <Text style={[type.headline, { color: t.good }]}>Ready to progress</Text>
                </View>
                {hints.map((h) => (
                  <Text key={h.id} style={[type.footnote, { color: t.text2 }]}>
                    <Text style={{ fontWeight: '600', color: t.text }}>{getExercise(h.id).name}: </Text>
                    {h.hint}
                  </Text>
                ))}
              </Card>
            ) : null}
            <Card>
              <SessionFlow
                template={tpl}
                units={s.settings.units}
                last={(id) => lastPerformance(s.logs, id)}
                onPressExercise={(id) => router.push(`/exercise/${id}`)}
              />
            </Card>
          </>
        ) : null}

        {tpl?.note ? (
          <CoachNote
            title={tpl.note.includes(':') ? tpl.note.split(':')[0] : 'Coach note'}
            body={tpl.note.includes(':') ? tpl.note.slice(tpl.note.indexOf(':') + 1).trim() : tpl.note}
            icon={tpl.note.startsWith('Benchmark') ? 'stopwatch-outline' : 'trending-up'}
          />
        ) : null}

        <SectionTitle
          title={tpl ? 'Change this day' : 'Add a session'}
          action={changing ? 'Done' : 'Choose'}
          onAction={() => setChanging(!changing)}
        />
        {changing ? (
          <Card style={{ gap: space.md }}>
            <Text style={[type.footnote, { color: t.text3 }]}>Only affects {formatLong(date)}. Your weekly plan stays the same.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
              {s.templates.map((x) => (
                <Chip
                  key={x.id}
                  label={x.name}
                  icon={templateIcon(x) as never}
                  selected={x.id === tpl?.id}
                  onPress={() => override(x.id)}
                />
              ))}
              <Chip label="Rest" icon="moon-outline" selected={!tpl} onPress={() => override('rest')} />
            </ScrollView>
            {s.overrides[date] ? <Button title="Reset to weekly plan" variant="ghost" size="md" onPress={() => override(null)} /> : null}
          </Card>
        ) : null}

        {!tpl ? (
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button
              title="Log activity"
              icon="add"
              variant="secondary"
              flex
              onPress={() => router.push({ pathname: '/log-activity', params: { date } })}
            />
            <Button
              title="Quick workout"
              icon="barbell-outline"
              variant="secondary"
              flex
              onPress={() => {
                if (!s.active) s.startWorkout(date);
                router.push('/workout');
              }}
            />
          </View>
        ) : null}

        {tpl ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, justifyContent: 'center' }}>
            <IconBadge name={templateIcon(tpl)} color={kindColor(t, tpl.kind)} size={22} />
            <Text style={[type.caption, { color: t.text3 }]}>Edit this workout in Plan → Edit plan</Text>
          </View>
        ) : null}
      </Screen>
    </>
  );
}
