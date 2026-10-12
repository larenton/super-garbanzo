import { Pressable, Text, View } from 'react-native';

import { getExercise } from '@/data/exercises';
import { ACTIVITY_ICONS } from '@/data/templates';
import { dayStatus, muscleLoad, type DayStatus } from '@/lib/analytics';
import { formatDuration, fromISODate, relativeDay, WEEKDAYS_SHORT, weekdayOf } from '@/lib/dates';
import { useStore } from '@/lib/store';
import { KIND_ICONS, KIND_LABELS, kindColor, radius, space, type, useTheme, type Theme } from '@/lib/theme';
import type { SessionLog, WorkoutTemplate } from '@/lib/types';
import { BodyMap } from './BodyMap';
import { Icon, IconBadge, tap } from './ui';

export function statusMeta(t: Theme, s: DayStatus) {
  switch (s) {
    case 'done':
      return { label: 'Done', color: t.good, bg: t.goodSoft, icon: 'checkmark-circle' };
    case 'missed':
      return { label: 'Missed', color: t.bad, bg: t.badSoft, icon: 'close-circle' };
    case 'today':
      return { label: 'Today', color: t.accent, bg: t.accentSoft, icon: 'ellipse' };
    case 'planned':
      return { label: 'Planned', color: t.text3, bg: t.fill, icon: 'ellipse-outline' };
    case 'extra':
      return { label: 'Bonus', color: t.good, bg: t.goodSoft, icon: 'add-circle' };
    default:
      return { label: 'Rest', color: t.text3, bg: t.fill, icon: 'moon-outline' };
  }
}

export function templateIcon(tpl: Pick<WorkoutTemplate, 'kind' | 'activity'>) {
  return tpl.activity ? ACTIVITY_ICONS[tpl.activity] : KIND_ICONS[tpl.kind];
}

export function templateSummary(tpl: WorkoutTemplate) {
  if (tpl.exercises.length && tpl.kind === 'strength') {
    const sets = tpl.exercises.reduce((a, e) => a + e.sets, 0);
    return `${tpl.exercises.length} exercises · ${sets} sets · ${formatDuration(tpl.durationMin)}`;
  }
  const dist = tpl.targetDistanceKm ? `${tpl.targetDistanceKm} km · ` : '';
  return `${dist}${formatDuration(tpl.durationMin)} · ${tpl.location === 'outdoor' ? 'Outdoors' : tpl.location === 'home' ? 'Home' : 'Gym'}`;
}

/** Big hero card for today's planned session. */
export function HeroSession({
  date,
  template,
  log,
  onOpen,
  onStart,
}: {
  date: string;
  template: WorkoutTemplate;
  log?: SessionLog;
  onOpen: () => void;
  onStart: () => void;
}) {
  const t = useTheme();
  const color = kindColor(t, template.kind);
  const done = !!log;
  return (
    <Pressable
      onPress={() => {
        tap();
        onOpen();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${relativeDay(date)}: ${template.name}`}
      style={({ pressed }) => ({
        backgroundColor: t.card,
        borderRadius: radius.xl,
        overflow: 'hidden',
        opacity: pressed ? 0.92 : 1,
        borderWidth: t.scheme === 'dark' ? 1 : 0,
        borderColor: t.separator,
        ...(t.scheme === 'light'
          ? { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } }
          : null),
      })}
    >
      <View style={{ height: 4, backgroundColor: color }} />
      <View style={{ padding: space.lg, gap: space.md }}>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name={templateIcon(template)} size={14} color={color} />
              <Text style={[type.overline, { color }]}>
                {relativeDay(date)} · {KIND_LABELS[template.kind]}
              </Text>
            </View>
            <Text style={[type.title, { color: t.text }]} numberOfLines={2}>
              {template.name}
            </Text>
            <Text style={[type.footnote, { color: t.text2 }]}>{templateSummary(template)}</Text>
            {template.exercises.length > 0 && template.kind === 'strength' ? (
              <View style={{ gap: 3, marginTop: 4 }}>
                {template.exercises.slice(0, 4).map((e, i) => (
                  <Text key={i} style={[type.footnote, { color: t.text3 }]} numberOfLines={1}>
                    {getExercise(e.exerciseId).name}{' '}
                    <Text style={{ color: t.text2, fontWeight: '600' }}>
                      {e.sets}×{e.reps}
                    </Text>
                  </Text>
                ))}
                {template.exercises.length > 4 ? (
                  <Text style={[type.footnote, { color: t.text3 }]}>+{template.exercises.length - 4} more</Text>
                ) : null}
              </View>
            ) : (
              <Text style={[type.footnote, { color: t.text3, marginTop: 4 }]} numberOfLines={3}>
                {template.description}
              </Text>
            )}
          </View>
          {template.exercises.length > 0 ? <BodyMap levels={muscleLoad(template)} size={112} legend={false} /> : null}
        </View>
        {done ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.sm,
              backgroundColor: t.goodSoft,
              borderRadius: radius.md,
              padding: space.md,
            }}
          >
            <Icon name="checkmark-circle" color={t.good} size={20} />
            <Text style={[type.subhead, { color: t.good, flex: 1 }]}>
              Completed{log?.durationMin ? ` in ${formatDuration(log.durationMin)}` : ''}
            </Text>
            <Icon name="chevron-forward" color={t.good} size={16} />
          </View>
        ) : (
          <Pressable
            onPress={() => {
              tap('medium');
              onStart();
            }}
            accessibilityRole="button"
            style={({ pressed }) => ({
              height: 50,
              borderRadius: radius.md + 2,
              backgroundColor: t.ink,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: space.sm,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Icon name={template.kind === 'strength' ? 'play' : 'add'} color={t.onInk} size={18} />
            <Text style={[type.headline, { color: t.onInk }]}>{template.kind === 'strength' ? 'Start workout' : 'Log activity'}</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

/** Compact row used in lists of upcoming / past sessions. */
export function SessionRow({
  date,
  template,
  log,
  onPress,
  showDate = true,
  showStatus = true,
}: {
  date: string;
  template?: WorkoutTemplate;
  log?: SessionLog;
  onPress: () => void;
  showDate?: boolean;
  showStatus?: boolean;
}) {
  const t = useTheme();
  const plan = useStore();
  const status = dayStatus(plan, plan.logs, date);
  const meta = statusMeta(t, status);
  const kind = template?.kind ?? log?.kind ?? 'strength';
  const name = template?.name ?? log?.name ?? 'Rest day';
  const color = template || log ? kindColor(t, kind) : t.text3;
  const icon = template ? templateIcon(template) : log ? templateIcon({ kind: log.kind, activity: log.activity }) : 'moon-outline';
  const d = fromISODate(date);

  const sub = log
    ? [
        log.durationMin ? formatDuration(log.durationMin) : null,
        log.distanceKm ? `${log.distanceKm} km` : null,
        log.exercises.length ? `${log.exercises.length} exercises` : null,
        log.source === 'health' ? 'Apple Health' : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : template
      ? templateSummary(template)
      : 'Recover, stretch, sleep well';

  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${relativeDay(date)}, ${name}, ${meta.label}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingVertical: space.md,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {showDate ? (
        <View style={{ width: 40, alignItems: 'center' }}>
          <Text style={[type.caption, { color: t.text3 }]}>{WEEKDAYS_SHORT[weekdayOf(date)]}</Text>
          <Text style={[type.title2, { color: status === 'today' ? t.accent : t.text, fontVariant: ['tabular-nums'] }]}>{d.getDate()}</Text>
        </View>
      ) : null}
      <IconBadge name={icon} color={color} />
      <View style={{ flex: 1 }}>
        <Text style={[type.headline, { color: template || log ? t.text : t.text3 }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[type.footnote, { color: t.text3 }]} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      {showStatus && (status === 'done' || status === 'missed' || status === 'extra') ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: meta.bg,
            paddingHorizontal: 8,
            height: 24,
            borderRadius: 12,
          }}
        >
          <Icon name={meta.icon} size={12} color={meta.color} />
          <Text style={[type.caption, { color: meta.color }]}>{meta.label}</Text>
        </View>
      ) : null}
      <Icon name="chevron-forward" size={16} color={t.text3} />
    </Pressable>
  );
}
