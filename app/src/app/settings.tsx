import { useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';

import { Button, Card, confirmAction, Divider, Field, Icon, Screen, SectionTitle, Segmented, Stepper, tap } from '@/components/ui';
import { calendarSupported, requestCalendarAccess } from '@/lib/calendar';
import { buildDemoData } from '@/lib/demo';
import * as Health from '@/lib/health';
import { initialData, useStore } from '@/lib/store';
import { resyncCalendarIfEnabled, syncFromHealth } from '@/lib/sync';
import { space, type, useTheme } from '@/lib/theme';
import type { MacroTargets, Units } from '@/lib/types';
import { kcalFromMacros } from '@/lib/units';

export default function SettingsScreen() {
  const t = useTheme();
  const s = useStore();
  const [busy, setBusy] = useState<string | null>(null);

  const toggleHealth = async (on: boolean) => {
    if (!on) return s.updateSettings({ healthEnabled: false });
    setBusy('health');
    try {
      const ok = await Health.connectHealth();
      s.updateSettings({ healthEnabled: ok });
      if (ok) {
        const r = await syncFromHealth();
        Alert.alert('Apple Health connected', `Imported ${r.workouts} workouts and ${r.weights} weigh-ins.`);
      }
    } catch (e) {
      Alert.alert('Apple Health', e instanceof Error ? e.message : 'Could not connect.');
    } finally {
      setBusy(null);
    }
  };

  const toggleCalendar = async (on: boolean) => {
    if (!on) return s.updateSettings({ calendarSync: false });
    setBusy('calendar');
    try {
      s.updateSettings({ calendarSync: true });
      const n = await resyncCalendarIfEnabled();
      Alert.alert('Calendar connected', `${n ?? 0} upcoming sessions added to your “Kinetic Training” calendar.`);
    } catch (e) {
      s.updateSettings({ calendarSync: false });
      Alert.alert('Calendar', e instanceof Error ? e.message : 'Could not access your calendar.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <SectionTitle title="Profile" />
      <Card style={{ gap: space.lg }}>
        <Field label="Name" value={s.settings.name} onChangeText={(name) => s.updateSettings({ name })} placeholder="Your first name" />
        <View style={{ gap: 6 }}>
          <Text style={[type.caption, { color: t.text2 }]}>Units</Text>
          <Segmented<Units>
            options={[
              { value: 'kg', label: 'Kilograms' },
              { value: 'lb', label: 'Pounds' },
            ]}
            value={s.settings.units}
            onChange={(units) => s.updateSettings({ units })}
          />
        </View>
      </Card>

      <SectionTitle title="Macro targets" />
      <TargetsCard title="Lift days (Mon / Wed / Fri)" targets={s.targets} onChange={s.setTargets} />
      <TargetsCard title="Cardio & rest days" targets={s.restTargets} onChange={s.setRestTargets} />

      <SectionTitle title="Connections" />
      <Card style={{ gap: space.md }}>
        <ToggleRow
          icon="heart"
          iconColor={t.bad}
          title="Apple Health"
          body={
            Health.healthPlatformSupported
              ? 'Read steps, workouts, active energy and weight. Save workouts, food and weigh-ins back to Health.'
              : 'Available in the iPhone app (needs a development or App Store build).'
          }
          value={s.settings.healthEnabled}
          disabled={!Health.healthPlatformSupported || busy === 'health'}
          onChange={toggleHealth}
        />
        {s.settings.healthEnabled ? (
          <Button
            title="Import from Health now"
            size="sm"
            variant="secondary"
            icon="refresh"
            onPress={async () => {
              const r = await syncFromHealth();
              tap('success');
              Alert.alert('Synced', `${r.workouts} new workouts, ${r.weights} weigh-ins.`);
            }}
          />
        ) : null}
        <Divider />
        <ToggleRow
          icon="calendar"
          iconColor={t.accent}
          title="Add sessions to calendar"
          body={
            calendarSupported
              ? 'Keeps a “Kinetic Training” calendar filled with the next 6 weeks, with a 1-hour reminder.'
              : 'Available in the iPhone app.'
          }
          value={s.settings.calendarSync}
          disabled={!calendarSupported || busy === 'calendar'}
          onChange={toggleCalendar}
        />
        <Divider />
        <ToggleRow
          icon="eye-outline"
          iconColor={t.text2}
          title="Show my other events"
          body="See meetings and plans from your other calendars next to your sessions in Plan."
          value={calendarSupported && s.settings.showCalendarEvents}
          disabled={!calendarSupported}
          onChange={async (on) => {
            if (on && !(await requestCalendarAccess())) return;
            s.updateSettings({ showCalendarEvents: on });
          }}
        />
      </Card>

      <SectionTitle title="Training plan" />
      <Card style={{ gap: space.md }}>
        <Text style={[type.footnote, { color: t.text3 }]}>
          {s.program.name}, starting {s.program.startDate}. Reloading puts back the Week 1 sessions, schedule and macro targets from your
          plan. Your logged history stays.
        </Text>
        <Button
          title="Reload Week 1 plan"
          icon="refresh"
          variant="secondary"
          size="md"
          onPress={() =>
            confirmAction('Reload Week 1 plan?', 'Any edits to your workouts and schedule will be replaced.', 'Reload', () => {
              s.loadPlan();
              resyncCalendarIfEnabled().catch(() => {});
            })
          }
        />
      </Card>

      <SectionTitle title="Data" />
      <Card style={{ gap: space.md }}>
        <Text style={[type.footnote, { color: t.text3 }]}>
          Everything is stored on this device. {s.settings.demo ? 'You are currently viewing sample data.' : ''}
        </Text>
        <Button
          title="Load sample data"
          icon="sparkles-outline"
          variant="secondary"
          size="md"
          onPress={() =>
            confirmAction(
              'Load sample data?',
              'This replaces your current data with 8 weeks of example training, food and weight.',
              'Load',
              () => useStore.setState({ ...buildDemoData(s.settings.name || 'Alex'), settings: { ...s.settings, demo: true } } as never),
            )
          }
        />
        <Button
          title={s.settings.demo ? 'Clear sample data & start fresh' : 'Erase all data'}
          icon="trash-outline"
          variant="danger"
          size="md"
          onPress={() =>
            confirmAction(
              'Erase all data?',
              'Workouts, food, weight and goals will be deleted. Your plan resets to the starter plan.',
              'Erase',
              () => {
                const base = initialData();
                useStore.setState({
                  ...base,
                  settings: { ...base.settings, name: s.settings.name, units: s.settings.units, onboarded: true },
                });
              },
            )
          }
        />
      </Card>
      <Text style={[type.caption, { color: t.text3, textAlign: 'center' }]}>Kinetic 1.0</Text>
    </Screen>
  );
}

function TargetRow({
  label,
  unit,
  value,
  step,
  onChange,
  color,
}: {
  label: string;
  unit: string;
  value: number;
  step: number;
  onChange: (v: number) => void;
  color?: string;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      {color ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} /> : null}
      <Text style={[type.body, { color: t.text, flex: 1 }]}>{label}</Text>
      <Stepper value={value} step={step} min={0} max={10000} format={(v) => `${v} ${unit}`} onChange={onChange} />
    </View>
  );
}

function ToggleRow({
  icon,
  iconColor,
  title,
  body,
  value,
  onChange,
  disabled,
}: {
  icon: string;
  iconColor: string;
  title: string;
  body: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start', opacity: disabled && !value ? 0.6 : 1 }}>
      <Icon name={icon} color={iconColor} size={22} />
      <View style={{ flex: 1 }}>
        <Text style={[type.body, { color: t.text }]}>{title}</Text>
        <Text style={[type.footnote, { color: t.text3 }]}>{body}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} disabled={disabled} trackColor={{ true: t.good }} accessibilityLabel={title} />
    </View>
  );
}

function TargetsCard({ title, targets, onChange }: { title: string; targets: MacroTargets; onChange: (t: MacroTargets) => void }) {
  const t = useTheme();
  const macroKcal = kcalFromMacros(targets.protein, targets.carbs, targets.fat);
  const off = Math.abs(macroKcal - targets.kcal) > 100;
  return (
    <Card style={{ gap: space.md }}>
      <Text style={[type.headline, { color: t.text }]}>{title}</Text>
      <TargetRow label="Calories" unit="kcal" value={targets.kcal} step={50} onChange={(kcal) => onChange({ ...targets, kcal })} />
      <Divider />
      <TargetRow
        label="Protein"
        unit="g"
        color={t.protein}
        value={targets.protein}
        step={5}
        onChange={(protein) => onChange({ ...targets, protein })}
      />
      <TargetRow
        label="Carbs"
        unit="g"
        color={t.carbs}
        value={targets.carbs}
        step={5}
        onChange={(carbs) => onChange({ ...targets, carbs })}
      />
      <TargetRow label="Fat" unit="g" color={t.fat} value={targets.fat} step={5} onChange={(fat) => onChange({ ...targets, fat })} />
      <Text style={[type.footnote, { color: off ? t.warn : t.text3 }]}>
        These macros add up to {macroKcal} kcal.{off ? ' That differs from the calorie target.' : ''}
      </Text>
      {off ? (
        <Button
          title={`Set calories to ${macroKcal}`}
          size="sm"
          variant="secondary"
          onPress={() => onChange({ ...targets, kcal: macroKcal })}
        />
      ) : null}
    </Card>
  );
}
