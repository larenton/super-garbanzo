import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { BarChart } from '@/components/Charts';
import { MacroSummary } from '@/components/MacroSummary';
import { Button, Card, Divider, Icon, IconButton, LargeHeader, Screen, SectionTitle, tap, confirmAction } from '@/components/ui';
import { dailyMacroSeries, macroAverages, macroTotals, plannedTemplate, proteinHitRate, targetsFor, weightTrend } from '@/lib/analytics';
import { NUTRITION_NOTES } from '@/data/templates';
import { addDays, relativeDay, today, WEEKDAYS_SHORT, weekdayOf } from '@/lib/dates';
import { useStore } from '@/lib/store';
import { space, type, useTheme } from '@/lib/theme';
import type { FoodEntry, Meal } from '@/lib/types';
import { formatNumber } from '@/lib/units';

const MEALS: { key: Meal; label: string; icon: string }[] = [
  { key: 'breakfast', label: 'Breakfast', icon: 'cafe-outline' },
  { key: 'lunch', label: 'Lunch', icon: 'sunny-outline' },
  { key: 'workout', label: 'Pre/post-workout', icon: 'barbell-outline' },
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
  const dayTargets = targetsFor(s, date);
  const isLiftDay = plannedTemplate(s, date)?.kind === 'strength';
  const trend = weightTrend(s.weights);
  const quickAdd = (m: (typeof s.mealGuide)[number]) =>
    router.push({
      pathname: '/food-add',
      params: { date, meal: m.meal, name: m.idea, protein: String(m.protein), carbs: String(m.carbs), fat: String(m.fat) },
    });

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

      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Icon name={isLiftDay ? 'barbell' : 'walk'} size={16} color={isLiftDay ? t.strength : t.cardio} />
          <Text style={[type.subhead, { color: t.text2 }]}>
            {isLiftDay ? 'Lift day' : 'Cardio / rest day'} · {formatNumber(dayTargets.kcal)} kcal · P {dayTargets.protein} · C{' '}
            {dayTargets.carbs} · F {dayTargets.fat}
          </Text>
        </View>
        <MacroSummary totals={totals} targets={dayTargets} />
      </Card>

      <SectionTitle title="Meal guide" />
      <Card style={{ paddingVertical: space.xs }}>
        {s.mealGuide.map((m, i) => {
          const logged = entries.some((e) => e.meal === m.meal);
          return (
            <View key={m.meal}>
              {i > 0 ? <Divider /> : null}
              <Pressable
                onPress={() => quickAdd(m)}
                accessibilityRole="button"
                accessibilityLabel={`Log ${m.label}: ${m.idea}`}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.md,
                  paddingVertical: space.md,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[type.subhead, { color: t.text }]}>{m.label}</Text>
                  <Text style={[type.footnote, { color: t.text3 }]} numberOfLines={1}>
                    {m.idea}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: space.md }}>
                    <Macro color={t.protein} label="P" value={m.protein} />
                    <Macro color={t.carbs} label="C" value={m.carbs} />
                    <Macro color={t.fat} label="F" value={m.fat} />
                  </View>
                </View>
                <Icon name={logged ? 'checkmark-circle' : 'add-circle-outline'} size={24} color={logged ? t.good : t.accent} />
              </Pressable>
            </View>
          );
        })}
        <Text style={[type.caption, { color: t.text3, paddingBottom: space.md }]}>
          Lift-day example · tap to log it, then adjust. {NUTRITION_NOTES.restDay}
        </Text>
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
            ghost: targetsFor(s, d.date).kcal,
            detail: `${formatNumber(d.kcal)} kcal · P ${Math.round(d.protein)}g · C ${Math.round(d.carbs)}g · F ${Math.round(d.fat)}g`,
          }))}
          color={t.accent}
          summary="Dashed outline = that day's target · tap a bar"
        />
      </Card>

      <SectionTitle title="Weekly weigh-in" />
      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Mini
            label="This week avg"
            value={trend.thisWeekAvg ? trend.thisWeekAvg.toFixed(1) : '—'}
            unit={`kg · ${trend.weighIns}/3 weigh-ins`}
          />
          <Mini label="Last week avg" value={trend.lastWeekAvg ? trend.lastWeekAvg.toFixed(1) : '—'} unit="kg" />
          <Mini
            label="Change"
            value={trend.change !== undefined ? `${trend.change >= 0 ? '+' : '−'}${Math.abs(trend.change).toFixed(2)}` : '—'}
            unit="kg"
          />
        </View>
        <View
          style={{
            flexDirection: 'row',
            gap: space.sm,
            alignItems: 'flex-start',
            backgroundColor:
              trend.status === 'dropping-fast' ? t.warnSoft : trend.status === 'on-target' || trend.status === 'flat' ? t.goodSoft : t.fill,
            borderRadius: 10,
            padding: space.md,
          }}
        >
          <Icon
            name={trend.status === 'dropping-fast' ? 'warning' : trend.status === 'need-data' ? 'scale-outline' : 'checkmark-circle'}
            size={18}
            color={trend.status === 'dropping-fast' ? t.warn : trend.status === 'need-data' ? t.text2 : t.good}
          />
          <Text style={[type.footnote, { color: t.text, flex: 1 }]}>{trend.advice}</Text>
        </View>
        <Text style={[type.caption, { color: t.text3 }]}>{NUTRITION_NOTES.adjusting}</Text>
        <Button title="Log morning weight" icon="add" size="md" variant="secondary" onPress={() => router.push('/weight-add')} />
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
