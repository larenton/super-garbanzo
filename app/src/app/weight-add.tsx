import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Card, ModalHeader, Stepper } from '@/components/ui';
import { addDays, relativeDay, today } from '@/lib/dates';
import * as Health from '@/lib/health';
import { latestWeight } from '@/lib/analytics';
import { useStore } from '@/lib/store';
import { space, type, useTheme } from '@/lib/theme';
import { fromDisplay, toDisplay } from '@/lib/units';

export default function WeightAdd() {
  const t = useTheme();
  const s = useStore();
  const units = s.settings.units;
  const last = latestWeight(s.weights);
  const [value, setValue] = useState(toDisplay(last?.kg ?? 80, units));
  const [date, setDate] = useState(today());

  const save = () => {
    const kg = fromDisplay(value, units);
    s.addWeight({ date, kg });
    if (s.settings.healthEnabled) Health.saveBodyWeight(kg, new Date(`${date}T08:00:00`)).catch(() => {});
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ModalHeader title="Log weight" onCancel={() => router.back()} onSave={save} />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
        <Card style={{ alignItems: 'center', gap: space.lg, paddingVertical: space.xxl }}>
          <Text style={{ color: t.text }}>
            <Text style={{ fontSize: 56, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{value.toFixed(1)}</Text>
            <Text style={[type.title2, { color: t.text3 }]}> {units}</Text>
          </Text>
          <View style={{ flexDirection: 'row', gap: space.xl }}>
            <Stepper value={value} step={0.1} min={30} max={300} format={() => '0.1'} onChange={setValue} />
            <Stepper value={value} step={1} min={30} max={300} format={() => '1'} onChange={setValue} />
          </View>
          {last ? (
            <Text style={[type.footnote, { color: t.text3 }]}>
              Last: {toDisplay(last.kg, units).toFixed(1)} {units} ({relativeDay(last.date)})
            </Text>
          ) : null}
        </Card>
        <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[type.subhead, { color: t.text, flex: 1 }]}>Date</Text>
          <Stepper
            value={0}
            min={-1}
            max={1}
            format={() => relativeDay(date)}
            onChange={(d) => setDate(addDays(date, d) > today() ? today() : addDays(date, d))}
          />
        </Card>
        <Text style={[type.caption, { color: t.text3, textAlign: 'center' }]}>
          Weigh in first thing in the morning for the most consistent trend.
        </Text>
      </ScrollView>
    </View>
  );
}
