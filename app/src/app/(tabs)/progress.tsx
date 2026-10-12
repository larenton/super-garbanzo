import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { BarChart, LineChart } from '@/components/Charts';
import { SessionRow } from '@/components/SessionCard';
import {
  Button,
  Card,
  Chip,
  Divider,
  EmptyState,
  IconButton,
  LargeHeader,
  ProgressBar,
  Screen,
  Segmented,
  SectionTitle,
  Stat,
  confirmAction,
} from '@/components/ui';
import { getExercise } from '@/data/exercises';
import { e1rmSeries, goalProgress, macroAverages, personalBest, smoothedWeights, sortedLogs, weeklyBuckets } from '@/lib/analytics';
import { addDays, formatDayMonth, formatMonthYear, today } from '@/lib/dates';
import { demoSteps } from '@/lib/demo';
import * as Health from '@/lib/health';
import { useStore } from '@/lib/store';
import { space, type, useTheme } from '@/lib/theme';
import type { Goal } from '@/lib/types';
import { formatNumber, formatWeight, toDisplay } from '@/lib/units';

type Tab = 'trends' | 'goals' | 'history';
type Range = 28 | 84 | 182 | 365;

export default function ProgressScreen() {
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const tab: Tab = params.tab ?? 'trends';
  const setTab = (next: Tab) => router.setParams({ tab: next });

  return (
    <Screen tab>
      <LargeHeader
        title="Progress"
        right={
          tab === 'goals' ? (
            <IconButton icon="add" label="Add goal" onPress={() => router.push('/goal-add')} />
          ) : tab === 'trends' ? (
            <IconButton icon="scale-outline" label="Log weight" onPress={() => router.push('/weight-add')} />
          ) : undefined
        }
      />
      <Segmented
        options={[
          { value: 'trends', label: 'Trends' },
          { value: 'goals', label: 'Goals' },
          { value: 'history', label: 'History' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'trends' ? <Trends /> : tab === 'goals' ? <Goals /> : <History />}
    </Screen>
  );
}

function Trends() {
  const t = useTheme();
  const s = useStore();
  const units = s.settings.units;
  const [range, setRange] = useState<Range>(84);
  const from = addDays(today(), -range);

  const lifts = useMemo(() => {
    const count = new Map<string, number>();
    s.logs.forEach((l) => l.exercises.forEach((e) => count.set(e.exerciseId, (count.get(e.exerciseId) ?? 0) + 1)));
    return [...count.entries()]
      .filter(([id]) => !getExercise(id).bodyweight)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id]) => id);
  }, [s.logs]);
  const [lift, setLift] = useState<string | undefined>(undefined);
  const activeLift = lift ?? lifts[0];

  const weights = smoothedWeights(s.weights.filter((w) => w.date >= addDays(from, -7))).filter((w) => w.date >= from);
  const bwGoal = s.goals.find((g) => g.type === 'bodyweight');
  const series = activeLift ? e1rmSeries(s.logs, activeLift).filter((p) => p.date >= from) : [];
  const pb = activeLift ? personalBest(s.logs, activeLift) : undefined;
  const liftGoal = s.goals.find((g) => g.type === 'strength' && g.exerciseId === activeLift);

  const weeks = Math.max(4, Math.min(26, Math.round(range / 7)));
  const buckets = weeklyBuckets(s, s.logs, weeks);
  const label = (w: string) => formatDayMonth(w).split(' ')[0];
  const avg = macroAverages(s.food, Math.min(range, 30));

  const stepDays = Math.min(range, 28);
  const liveSteps = s.settings.healthEnabled && Health.isHealthAvailable();
  const [healthSteps, setHealthSteps] = useState<{ date: string; value: number }[]>([]);
  useEffect(() => {
    if (!liveSteps) return;
    Health.getDailySteps(stepDays)
      .then(setHealthSteps)
      .catch(() => setHealthSteps([]));
  }, [liveSteps, stepDays]);
  const steps = liveSteps ? healthSteps : s.settings.demo ? demoSteps(stepDays) : [];

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {([28, 84, 182, 365] as Range[]).map((r) => (
          <Chip
            key={r}
            label={r === 28 ? '4 weeks' : r === 84 ? '12 weeks' : r === 182 ? '6 months' : '1 year'}
            selected={range === r}
            onPress={() => setRange(r)}
          />
        ))}
      </ScrollView>

      <Card style={{ gap: space.md }}>
        <CardHead title="Strength" sub="Estimated 1-rep max (best set per session)" />
        {lifts.length ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
              {lifts.map((id) => (
                <Chip key={id} label={getExercise(id).name} selected={id === activeLift} onPress={() => setLift(id)} />
              ))}
            </ScrollView>
            <LineChart
              data={series.map((p) => ({ date: p.date, value: toDisplay(p.value, units) }))}
              color={t.strength}
              unit={units}
              target={liftGoal ? toDisplay(liftGoal.target, units) : undefined}
              targetLabel={liftGoal ? 'Goal' : undefined}
            />
            {pb ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[type.footnote, { color: t.text2, flex: 1 }]}>
                  Best: {formatWeight(pb.weight, units)} × {pb.reps} on {formatDayMonth(pb.date)}
                </Text>
                <Button title="Details" size="sm" variant="secondary" onPress={() => router.push(`/exercise/${activeLift}`)} />
              </View>
            ) : null}
          </>
        ) : (
          <EmptyState
            icon="barbell-outline"
            title="No lifts logged yet"
            body="Finish a gym session and your strength trend appears here."
          />
        )}
      </Card>

      <Card style={{ gap: space.md }}>
        <CardHead title="Body weight" sub="7-day average · dots are daily weigh-ins" />
        <LineChart
          data={weights.map((w) => ({ date: w.date, value: toDisplay(w.value, units), raw: toDisplay(w.raw, units) }))}
          color={t.sport}
          unit={units}
          target={bwGoal ? toDisplay(bwGoal.target, units) : undefined}
          targetLabel={bwGoal ? 'Goal' : undefined}
          emptyText="Log a weigh-in to start your trend"
        />
        <Button title="Log weight" icon="add" size="md" variant="secondary" onPress={() => router.push('/weight-add')} />
      </Card>

      <Card style={{ gap: space.md }}>
        <CardHead title="Consistency" sub="Sessions completed per week · dashed = planned" />
        <BarChart
          data={buckets.map((b) => ({
            label: label(b.weekStart),
            value: b.done,
            ghost: b.planned,
            detail: `Week of ${formatDayMonth(b.weekStart)}: ${b.done} of ${b.planned} planned`,
          }))}
          color={t.good}
          summary={`${buckets.reduce((a, b) => a + b.done, 0)} sessions in ${weeks} weeks`}
        />
      </Card>

      <Card style={{ gap: space.md }}>
        <CardHead title="Training volume" sub={`Weekly tonnage lifted (${units})`} />
        <BarChart
          data={buckets.map((b) => ({
            label: label(b.weekStart),
            value: toDisplay(b.volume, units),
            detail: `Week of ${formatDayMonth(b.weekStart)}: ${formatNumber(toDisplay(b.volume, units))} ${units}`,
          }))}
          color={t.strength}
          format={(v) => formatNumber(v)}
          summary={`Avg ${formatNumber(toDisplay(buckets.reduce((a, b) => a + b.volume, 0) / Math.max(1, buckets.filter((b) => b.volume > 0).length), units))} ${units} per training week`}
        />
      </Card>

      <Card style={{ gap: space.md }}>
        <CardHead title="Outside the gym" sub="Weekly distance from runs, walks & rides" />
        <BarChart
          data={buckets.map((b) => ({
            label: label(b.weekStart),
            value: b.distanceKm,
            detail: `Week of ${formatDayMonth(b.weekStart)}: ${b.distanceKm.toFixed(1)} km`,
          }))}
          color={t.cardio}
          summary={`${buckets.reduce((a, b) => a + b.distanceKm, 0).toFixed(1)} km total`}
        />
      </Card>

      {steps.length ? (
        <Card style={{ gap: space.md }}>
          <CardHead title="Steps" sub={s.settings.demo && !s.settings.healthEnabled ? 'Sample data' : 'From Apple Health'} />
          <BarChart
            data={steps.map((d) => ({
              label: formatDayMonth(d.date).split(' ')[0],
              value: d.value,
              detail: `${formatDayMonth(d.date)}: ${formatNumber(d.value)} steps`,
            }))}
            color={t.good}
            target={10000}
            format={formatNumber}
            summary={`Avg ${formatNumber(steps.reduce((a, d) => a + d.value, 0) / steps.length)} / day · dashed = 10k`}
          />
        </Card>
      ) : null}

      <Card style={{ gap: space.md }}>
        <CardHead title="Nutrition" sub={`Average over logged days (${avg.days})`} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Stat label="Calories" value={formatNumber(avg.kcal)} unit={`/ ${formatNumber(s.targets.kcal)}`} />
          <Stat label="Protein" value={String(Math.round(avg.protein))} unit={`/ ${s.targets.protein}g`} color={t.protein} />
          <Stat label="Carbs" value={String(Math.round(avg.carbs))} unit="g" color={t.carbs} />
          <Stat label="Fat" value={String(Math.round(avg.fat))} unit="g" color={t.fat} />
        </View>
      </Card>
    </>
  );
}

function CardHead({ title, sub }: { title: string; sub?: string }) {
  const t = useTheme();
  return (
    <View>
      <Text style={[type.headline, { color: t.text }]}>{title}</Text>
      {sub ? <Text style={[type.footnote, { color: t.text3 }]}>{sub}</Text> : null}
    </View>
  );
}

function goalValue(g: Goal, current: number, units: 'kg' | 'lb') {
  switch (g.type) {
    case 'strength':
    case 'bodyweight':
      return { now: formatWeight(current, units), target: formatWeight(g.target, units) };
    case 'frequency':
      return { now: `${current.toFixed(1)}/wk`, target: `${g.target}/wk` };
    case 'distance':
      return { now: `${current.toFixed(1)} km`, target: `${g.target} km` };
    case 'protein':
      return { now: `${Math.round(current)}%`, target: `${g.target}%` };
  }
}

const GOAL_SUB: Record<Goal['type'], string> = {
  strength: 'Estimated 1RM',
  bodyweight: 'Body weight',
  frequency: '3-week average',
  distance: 'This month',
  protein: 'Days hitting protein (14 d)',
};

function Goals() {
  const t = useTheme();
  const s = useStore();
  if (s.goals.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="flag-outline"
          title="No goals yet"
          body="Goals give your trends a finish line. Add a strength, body-weight, consistency, distance or protein goal."
          action={<Button title="Add goal" icon="add" variant="accent" size="md" onPress={() => router.push('/goal-add')} />}
        />
      </Card>
    );
  }
  const remove = (g: Goal) => {
    confirmAction('Delete goal?', g.title, 'Delete', () => s.deleteGoal(g.id));
  };
  return (
    <>
      {s.goals.map((g) => {
        const p = goalProgress(g, s);
        const v = goalValue(g, p.current, s.settings.units);
        const done = p.pct >= 1;
        const color = done
          ? t.good
          : g.type === 'strength'
            ? t.strength
            : g.type === 'distance'
              ? t.cardio
              : g.type === 'bodyweight'
                ? t.sport
                : t.accent;
        return (
          <Card key={g.id} style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
              <View style={{ flex: 1 }}>
                <Text style={[type.overline, { color }]}>
                  {GOAL_SUB[g.type]}
                  {g.exerciseId ? ` · ${getExercise(g.exerciseId).name}` : ''}
                </Text>
                <Text style={[type.title2, { color: t.text, marginTop: 2 }]}>{g.title}</Text>
              </View>
              <IconButton icon="trash-outline" label="Delete goal" filled={false} tint={t.text3} onPress={() => remove(g)} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <Text style={{ color: t.text }}>
                <Text style={[type.metric]}>{v.now}</Text>
                <Text style={[type.subhead, { color: t.text3 }]}> → {v.target}</Text>
              </Text>
              <Text style={[type.headline, { color, fontVariant: ['tabular-nums'] }]}>{Math.round(p.pct * 100)}%</Text>
            </View>
            <ProgressBar value={p.pct} color={color} height={10} />
            <Text style={[type.footnote, { color: t.text3 }]}>
              {done
                ? 'Goal reached — time to set a new one.'
                : [p.eta ? `On pace for ${formatDayMonth(p.eta)}` : null, g.deadline ? `Deadline ${formatDayMonth(g.deadline)}` : null]
                    .filter(Boolean)
                    .join(' · ') || 'Keep logging to see your projected finish date.'}
            </Text>
          </Card>
        );
      })}
      <Button title="Add goal" icon="add" variant="secondary" onPress={() => router.push('/goal-add')} />
    </>
  );
}

function History() {
  const s = useStore();
  const logs = sortedLogs(s.logs).reverse();
  if (logs.length === 0) {
    return (
      <Card>
        <EmptyState icon="time-outline" title="No sessions yet" body="Completed workouts and activities from Apple Health appear here." />
      </Card>
    );
  }
  const totalMin = logs.reduce((a, l) => a + (l.durationMin ?? 0), 0);
  const totalKm = logs.reduce((a, l) => a + (l.distanceKm ?? 0), 0);
  const groups = new Map<string, typeof logs>();
  logs.forEach((l) => {
    const k = l.date.slice(0, 7);
    groups.set(k, [...(groups.get(k) ?? []), l]);
  });
  return (
    <>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Stat label="Sessions" value={String(logs.length)} />
          <Stat label="Time" value={formatNumber(totalMin / 60)} unit="h" />
          <Stat label="Distance" value={formatNumber(totalKm)} unit="km" />
        </View>
      </Card>
      {[...groups.entries()].map(([month, items]) => (
        <View key={month} style={{ gap: space.sm }}>
          <SectionTitle title={formatMonthYear(`${month}-01`)} />
          <Card style={{ paddingVertical: space.xs }}>
            {items.map((l, i) => (
              <View key={l.id}>
                {i > 0 ? <Divider inset={52} /> : null}
                <SessionRow
                  date={l.date}
                  log={l}
                  template={s.templates.find((x) => x.id === l.templateId)}
                  showStatus={false}
                  onPress={() => router.push(`/log/${l.id}`)}
                />
              </View>
            ))}
          </Card>
        </View>
      ))}
    </>
  );
}
