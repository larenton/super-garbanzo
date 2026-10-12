import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { BarChart } from '@/components/Charts';
import { MacroSummary } from '@/components/MacroSummary';
import { Card, Divider, Icon, IconButton, LargeHeader, Screen, SectionTitle, tap, confirmAction } from '@/components/ui';
import { dailyMacroSeries, macroAverages, macroTotals, proteinHitRate } from '@/lib/analytics';
import { addDays, relativeDay, today, WEEKDAYS_SHORT, weekdayOf } from '@/lib/dates';
import { useStore } from '@/lib/store';
import { space, type, useTheme } from '@/lib/theme';
import type { FoodEntry, Meal } from '@/lib/types';
import { formatNumber } from '@/lib/units';

const MEALS: { key: Meal; label: string; icon: string }[] = [
  { key: 'breakfast', label: 'Breakfast', icon: 'cafe-outline' },
  { key: 'lunch', label: 'Lunch', icon: 'sunny-outline' },
  { key: 'dinner', label: 'Dinner', icon: 'moon-outline' },
  { key: 'snack', label: 'Snacks', icon: 'nutrition-outline' },
];

export default function NutritionScreen() {
  const t = useTheme();
  const s = useStore();
  const [date, setDate] = useState(today());
  const totals = macroTotals(s.food, date);
  const entries = s.food.filter((f) => f.date === date);
  const week = dailyMacroSeries(s.food, 7, today());
  const avg = macroAverages(s.food, 7);
  const hit = proteinHitRate(s.food, s.targets, 7);

  const remove = (f: FoodEntry) => {
    const go = () => {
      tap();
      s.deleteFood(f.id);
    };
    confirmAction('Delete entry?', f.name, 'Delete', go);
  };

  return (
    <Screen tab>
      <LargeHeader
        title="Macros"
        right={<IconButton icon="add" label="Log food" onPress={() => router.push({ pathname: '/food-add', params: { date } })} />}
      />

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <IconButton icon="chevron-back" label="Previous day" onPress={() => setDate(addDays(date, -1))} />
        <Pressable style={{ flex: 1, alignItems: 'center' }} onPress={() => setDate(today())} accessibilityRole="button">
          <Text style={[type.headline, { color: t.text }]}>{relativeDay(date)}</Text>
        </Pressable>
        <IconButton
          icon="chevron-forward"
          label="Next day"
          onPress={() => setDate(addDays(date, 1))}
          tint={date >= today() ? t.text3 : undefined}
        />
      </View>

      <Card>
        <MacroSummary totals={totals} targets={s.targets} />
      </Card>

      {MEALS.map((m) => {
        const items = entries.filter((e) => e.meal === m.key);
        const kcal = items.reduce((a, e) => a + e.kcal, 0);
        return (
          <Card key={m.key} style={{ paddingVertical: space.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 }}>
              <Icon name={m.icon} size={18} color={t.text2} />
              <Text style={[type.headline, { color: t.text, flex: 1 }]}>{m.label}</Text>
              {kcal ? (
                <Text style={[type.footnote, { color: t.text3, fontVariant: ['tabular-nums'] }]}>{formatNumber(kcal)} kcal</Text>
              ) : null}
              <IconButton
                icon="add-circle"
                label={`Add to ${m.label}`}
                tint={t.accent}
                filled={false}
                onPress={() => router.push({ pathname: '/food-add', params: { date, meal: m.key } })}
              />
            </View>
            {items.map((f) => (
              <View key={f.id}>
                <Divider />
                <Pressable
                  onLongPress={() => remove(f)}
                  accessibilityHint="Long press to delete"
                  style={({ pressed }) => ({
                    paddingVertical: space.md,
                    opacity: pressed ? 0.6 : 1,
                    flexDirection: 'row',
                    gap: space.md,
                    alignItems: 'center',
                  })}
                >
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={[type.body, { color: t.text }]} numberOfLines={1}>
                      {f.name}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: space.md }}>
                      <Macro color={t.protein} label="P" value={f.protein} />
                      <Macro color={t.carbs} label="C" value={f.carbs} />
                      <Macro color={t.fat} label="F" value={f.fat} />
                    </View>
                  </View>
                  <Text style={[type.subhead, { color: t.text2, fontVariant: ['tabular-nums'] }]}>{f.kcal}</Text>
                  {Platform.OS === 'web' ? (
                    <IconButton icon="trash-outline" label="Delete" filled={false} tint={t.text3} onPress={() => remove(f)} />
                  ) : null}
                </Pressable>
              </View>
            ))}
          </Card>
        );
      })}

      <SectionTitle title="Last 7 days" />
      <Card style={{ gap: space.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Mini label="Avg calories" value={formatNumber(avg.kcal)} unit="kcal" />
          <Mini label="Avg protein" value={String(Math.round(avg.protein))} unit="g" />
          <Mini label="Protein target hit" value={`${Math.round(hit * 100)}%`} unit="of days" />
        </View>
        <BarChart
          data={week.map((d) => ({
            label: WEEKDAYS_SHORT[weekdayOf(d.date)].slice(0, 1),
            value: d.kcal,
            detail: `${formatNumber(d.kcal)} kcal · P ${Math.round(d.protein)}g · C ${Math.round(d.carbs)}g · F ${Math.round(d.fat)}g`,
          }))}
          color={t.accent}
          target={s.targets.kcal}
          summary={`Dashed line = ${formatNumber(s.targets.kcal)} kcal target · tap a bar`}
        />
      </Card>
      <Text style={[type.caption, { color: t.text3, textAlign: 'center' }]}>
        {Platform.OS === 'web' ? 'Targets live in Settings.' : 'Long-press an entry to delete it. Targets live in Settings.'}
      </Text>
    </Screen>
  );
}

function Macro({ color, label, value }: { color: string; label: string; value: number }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      <Text style={[type.caption, { color: t.text3, fontVariant: ['tabular-nums'] }]}>
        {label} {Math.round(value)}g
      </Text>
    </View>
  );
}

function Mini({ label, value, unit }: { label: string; value: string; unit: string }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={[type.caption, { color: t.text3 }]}>{label}</Text>
      <Text style={[type.title2, { color: t.text, fontVariant: ['tabular-nums'] }]}>{value}</Text>
      <Text style={[type.caption, { color: t.text3 }]}>{unit}</Text>
    </View>
  );
}
