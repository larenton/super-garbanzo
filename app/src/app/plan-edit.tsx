import { router, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { templateIcon, templateSummary } from '@/components/SessionCard';
import { Button, Card, Chip, Divider, Field, IconBadge, Row, Screen, SectionTitle, Stepper } from '@/components/ui';
import { addDays, formatDayMonth, WEEKDAYS_LONG } from '@/lib/dates';
import { uid, useStore } from '@/lib/store';
import { resyncCalendarIfEnabled } from '@/lib/sync';
import { kindColor, space, type, useTheme } from '@/lib/theme';
import type { Weekday } from '@/lib/types';

const TIMES = ['05:30', '06:00', '06:30', '07:00', '12:00', '17:00', '17:30', '18:00', '18:30', '19:00'];

export default function PlanEditScreen() {
  const t = useTheme();
  const s = useStore();
  const nav = useNavigation();
  const [open, setOpen] = useState<Weekday | null>(null);

  // Push plan changes to the device calendar when leaving the editor.
  useEffect(() => nav.addListener('beforeRemove', () => void resyncCalendarIfEnabled().catch(() => {})), [nav]);

  return (
    <Screen>
      <Card style={{ gap: space.lg }}>
        <Field label="Program name" value={s.program.name} onChangeText={(name) => s.updateProgram({ name })} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={[type.subhead, { color: t.text }]}>Starts</Text>
            <Text style={[type.footnote, { color: t.text3 }]}>Week beginning {formatDayMonth(s.program.startDate)}</Text>
          </View>
          <Stepper
            value={0}
            format={() => '1 wk'}
            min={-1}
            max={1}
            onChange={(v) => s.updateProgram({ startDate: addDays(s.program.startDate, v * 7) })}
          />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={[type.subhead, { color: t.text }]}>Length</Text>
            <Text style={[type.footnote, { color: t.text3 }]}>
              Ends {formatDayMonth(addDays(s.program.startDate, s.program.weeks * 7 - 1))}
            </Text>
          </View>
          <Stepper value={s.program.weeks} min={1} max={52} format={(v) => `${v} wk`} onChange={(weeks) => s.updateProgram({ weeks })} />
        </View>
        <View style={{ gap: space.sm }}>
          <Text style={[type.subhead, { color: t.text }]}>Usual session time</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
            {TIMES.map((tm) => (
              <Chip key={tm} label={tm} selected={s.program.sessionTime === tm} onPress={() => s.updateProgram({ sessionTime: tm })} />
            ))}
          </ScrollView>
        </View>
      </Card>

      <SectionTitle title="Weekly schedule" />
      <Card style={{ paddingVertical: space.xs }}>
        {([0, 1, 2, 3, 4, 5, 6] as Weekday[]).map((d, i) => {
          const tpl = s.templates.find((x) => x.id === s.program.schedule[d]);
          return (
            <View key={d}>
              {i > 0 ? <Divider inset={48} /> : null}
              <Row
                title={WEEKDAYS_LONG[d]}
                subtitle={tpl ? tpl.name : 'Rest'}
                left={<IconBadge name={tpl ? templateIcon(tpl) : 'moon-outline'} color={tpl ? kindColor(t, tpl.kind) : t.text3} />}
                onPress={() => setOpen(open === d ? null : d)}
              />
              {open === d ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: space.sm, paddingBottom: space.md, paddingLeft: 48 }}
                >
                  {s.templates.map((x) => (
                    <Chip key={x.id} label={x.name} selected={tpl?.id === x.id} onPress={() => s.setScheduleDay(d, x.id)} />
                  ))}
                  <Chip label="Rest" icon="moon-outline" selected={!tpl} onPress={() => s.setScheduleDay(d, null)} />
                </ScrollView>
              ) : null}
            </View>
          );
        })}
      </Card>

      <SectionTitle title="Workouts" />
      <Card style={{ paddingVertical: space.xs }}>
        {s.templates.map((x, i) => (
          <View key={x.id}>
            {i > 0 ? <Divider inset={48} /> : null}
            <Row
              title={x.name}
              subtitle={templateSummary(x)}
              left={<IconBadge name={templateIcon(x)} color={kindColor(t, x.kind)} />}
              onPress={() => router.push(`/template/${x.id}`)}
            />
          </View>
        ))}
      </Card>
      <Button
        title="New workout"
        icon="add"
        variant="secondary"
        onPress={() => {
          const id = uid();
          s.upsertTemplate({ id, name: 'New workout', kind: 'strength', location: 'gym', durationMin: 45, description: '', exercises: [] });
          router.push(`/template/${id}`);
        }}
      />
    </Screen>
  );
}
