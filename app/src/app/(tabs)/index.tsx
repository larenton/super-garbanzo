import { router } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';

import { MacroSummary } from '@/components/MacroSummary';
import { HeroSession, SessionRow } from '@/components/SessionCard';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Icon,
  IconBadge,
  IconButton,
  LargeHeader,
  ProgressBar,
  Screen,
  SectionTitle,
  Divider,
} from '@/components/ui';
import { WeekStrip } from '@/components/WeekStrip';
import { getExercise } from '@/data/exercises';
import { goalProgress, logsOn, macroTotals, nextSessions, plannedTemplate, weeklyBuckets } from '@/lib/analytics';
import { formatLong, greeting, startOfWeek, today } from '@/lib/dates';
import * as Health from '@/lib/health';
import { useStore } from '@/lib/store';
import { syncFromHealth, useHealthDay } from '@/lib/sync';
import { space, type, useTheme } from '@/lib/theme';
import { formatNumber, formatWeight } from '@/lib/units';

export default function TodayScreen() {
  const t = useTheme();
  const s = useStore();
  const date = today();
  const tpl = plannedTemplate(s, date);
  const todaysLogs = logsOn(s.logs, date);
  const log = todaysLogs[0];
  const totals = macroTotals(s.food, date);
  const upcoming = nextSessions(s, s.logs, date, 4)
    .filter((u) => u.date !== date)
    .slice(0, 3);
  const week = weeklyBuckets(s, s.logs, 1)[0];
  const health = useHealthDay(date);

  useEffect(() => {
    syncFromHealth().catch(() => {});
  }, []);

  const start = (templateId?: string) => {
    const tp = s.templates.find((x) => x.id === templateId);
    if (tp && tp.kind !== 'strength') {
      router.push({ pathname: '/log-activity', params: { date, templateId } });
      return;
    }
    if (!s.active) s.startWorkout(date, templateId);
    router.push('/workout');
  };

  return (
    <Screen tab>
      <LargeHeader
        eyebrow={formatLong(date)}
        title="Today"
        subtitle={s.settings.name ? `${greeting()}, ${s.settings.name}` : greeting()}
        right={<IconButton icon="person-circle-outline" label="Settings" onPress={() => router.push('/settings')} />}
      />

      {s.active ? (
        <Card onPress={() => router.push('/workout')} style={{ backgroundColor: t.accent }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Icon name="timer-outline" color="#fff" size={22} />
            <View style={{ flex: 1 }}>
              <Text style={[type.headline, { color: '#fff' }]}>Workout in progress</Text>
              <Text style={[type.footnote, { color: '#ffffffcc' }]}>{s.active.name} · tap to resume</Text>
            </View>
            <Icon name="chevron-forward" color="#fff" size={18} />
          </View>
        </Card>
      ) : null}

      {tpl ? (
        <HeroSession
          date={date}
          template={tpl}
          log={log}
          onOpen={() => (log ? router.push(`/log/${log.id}`) : router.push(`/session/${date}`))}
          onStart={() => start(tpl.id)}
        />
      ) : (
        <Card>
          <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
            <IconBadge name="moon" color={t.sport} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={[type.title2, { color: t.text }]}>Rest day</Text>
              <Text style={[type.footnote, { color: t.text2 }]}>
                {log
                  ? `You still logged ${log.name.toLowerCase()} — nice.`
                  : 'Recovery is where the gains happen. A walk or mobility work is a bonus.'}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.lg }}>
            <Button
              title="Log activity"
              icon="add"
              variant="secondary"
              size="md"
              flex
              onPress={() => router.push({ pathname: '/log-activity', params: { date } })}
            />
            <Button title="Quick workout" icon="barbell-outline" variant="secondary" size="md" flex onPress={() => start(undefined)} />
          </View>
        </Card>
      )}

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.sm }}>
          <Text style={[type.headline, { color: t.text, flex: 1 }]}>This week</Text>
          <Text style={[type.subhead, { color: t.text2, fontVariant: ['tabular-nums'] }]}>
            {week.done}/{week.planned} sessions
          </Text>
        </View>
        <ProgressBar value={week.planned ? week.done / week.planned : 0} color={t.good} height={6} />
        <View style={{ marginTop: space.md }}>
          <WeekStrip weekStart={startOfWeek(date)} selected={date} onSelect={(d) => router.push(`/session/${d}`)} />
        </View>
      </Card>

      <SectionTitle title="Macros" action="Log food" onAction={() => router.push({ pathname: '/food-add', params: { date } })} />
      <Card onPress={() => router.navigate('/nutrition')} accessibilityLabel="Open macros">
        <MacroSummary totals={totals} targets={s.targets} compact />
      </Card>

      <SectionTitle title="Activity" />
      <Card>
        {health.data ? (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <HealthStat icon="footsteps" color={t.good} label="Steps" value={formatNumber(health.data.steps)} />
              <HealthStat icon="flame" color={t.cardio} label="Active" value={formatNumber(health.data.activeKcal)} unit="kcal" />
              <HealthStat
                icon="stopwatch"
                color={t.accent}
                label="Exercise"
                value={String(Math.round(health.data.exerciseMin))}
                unit="min"
              />
              <HealthStat
                icon="heart"
                color={t.bad}
                label="Resting"
                value={health.data.restingHr ? String(Math.round(health.data.restingHr)) : '—'}
                unit="bpm"
              />
            </View>
            <Text style={[type.caption, { color: t.text3, marginTop: space.md }]}>
              {health.source === 'demo' ? 'Sample data — connect Apple Health on iPhone for live numbers' : 'From Apple Health'}
            </Text>
          </>
        ) : (
          <EmptyState
            icon="heart-outline"
            title={Health.healthPlatformSupported ? 'Connect Apple Health' : 'Apple Health on iPhone'}
            body={
              Health.healthPlatformSupported
                ? 'See steps, active energy, runs and walks next to your training — and save your workouts and food back to Health.'
                : 'Install the iOS build to pull steps, workouts and weight from Apple Health. You can still log everything manually.'
            }
            action={
              Health.healthPlatformSupported ? (
                <Button
                  title="Connect"
                  icon="heart"
                  variant="accent"
                  size="md"
                  onPress={async () => {
                    const ok = await Health.connectHealth();
                    if (ok) {
                      s.updateSettings({ healthEnabled: true });
                      syncFromHealth().catch(() => {});
                    }
                  }}
                />
              ) : undefined
            }
          />
        )}
      </Card>

      <SectionTitle title="Up next" action="Full plan" onAction={() => router.navigate('/plan')} />
      <Card style={{ paddingVertical: space.xs }}>
        {upcoming.length ? (
          upcoming.map((u, i) => (
            <View key={u.date}>
              {i > 0 ? <Divider inset={52} /> : null}
              <SessionRow date={u.date} template={u.template} onPress={() => router.push(`/session/${u.date}`)} />
            </View>
          ))
        ) : (
          <EmptyState icon="calendar-outline" title="Nothing scheduled" body="Set up your weekly plan to see what's coming." />
        )}
      </Card>

      {s.goals.length ? (
        <>
          <SectionTitle
            title="Goals"
            action="All goals"
            onAction={() => router.navigate({ pathname: '/progress', params: { tab: 'goals' } })}
          />
          <Card style={{ gap: space.lg }}>
            {s.goals.slice(0, 3).map((g) => {
              const p = goalProgress(g, s);
              const value =
                g.type === 'strength' || g.type === 'bodyweight'
                  ? `${formatWeight(p.current, s.settings.units)} → ${formatWeight(g.target, s.settings.units)}`
                  : g.type === 'protein'
                    ? `${Math.round(p.current)}% of days`
                    : g.type === 'distance'
                      ? `${p.current.toFixed(1)} / ${g.target} km`
                      : `${p.current.toFixed(1)} / ${g.target} per week`;
              return (
                <View key={g.id} style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[type.subhead, { color: t.text, flex: 1 }]} numberOfLines={1}>
                      {g.title}
                    </Text>
                    <Text style={[type.caption, { color: t.text2, fontVariant: ['tabular-nums'] }]}>{value}</Text>
                  </View>
                  <ProgressBar value={p.pct} color={p.pct >= 1 ? t.good : t.accent} height={6} />
                  {g.exerciseId ? (
                    <Text style={[type.caption, { color: t.text3 }]}>{getExercise(g.exerciseId).name} · estimated 1RM</Text>
                  ) : null}
                </View>
              );
            })}
          </Card>
        </>
      ) : (
        <Card>
          <EmptyState
            icon="flag-outline"
            title="Set your first goal"
            body="Strength, body weight, consistency or distance — track what matters to you."
            action={<Button title="Add goal" icon="add" variant="secondary" size="md" onPress={() => router.push('/goal-add')} />}
          />
        </Card>
      )}

      {s.settings.demo ? (
        <Chip label="Demo data — reset in Settings" icon="information-circle-outline" style={{ alignSelf: 'center' }} />
      ) : null}
    </Screen>
  );
}

function HealthStat({ icon, color, label, value, unit }: { icon: string; color: string; label: string; value: string; unit?: string }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'flex-start', gap: 4, flex: 1 }}>
      <Icon name={icon} size={18} color={color} />
      <Text style={[type.headline, { color: t.text, fontVariant: ['tabular-nums'] }]}>
        {value}
        {unit ? <Text style={[type.caption, { color: t.text3 }]}> {unit}</Text> : null}
      </Text>
      <Text style={[type.caption, { color: t.text3 }]}>{label}</Text>
    </View>
  );
}
