import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Card, Divider, Field, ModalHeader, Segmented, Stepper, tap } from '@/components/ui';
import { today } from '@/lib/dates';
import * as Health from '@/lib/health';
import { useStore } from '@/lib/store';
import { space, type, useTheme } from '@/lib/theme';
import type { FoodEntry, Meal } from '@/lib/types';
import { kcalFromMacros } from '@/lib/units';

function defaultMeal(): Meal {
  const h = new Date().getHours();
  if (h < 10) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 17) return 'snack';
  return 'dinner';
}

const num = (s: string) => {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

export default function FoodAdd() {
  const params = useLocalSearchParams<{ date?: string; meal?: Meal }>();
  const t = useTheme();
  const s = useStore();
  const [meal, setMeal] = useState<Meal>(params.meal ?? defaultMeal());
  const [name, setName] = useState('');
  const [p, setP] = useState('');
  const [c, setC] = useState('');
  const [f, setF] = useState('');
  const [kcalOverride, setKcalOverride] = useState('');
  const [servings, setServings] = useState(1);
  const date = params.date ?? today();

  const base = { protein: num(p), carbs: num(c), fat: num(f) };
  const scaled = { protein: base.protein * servings, carbs: base.carbs * servings, fat: base.fat * servings };
  const kcal = kcalOverride ? num(kcalOverride) * servings : kcalFromMacros(scaled.protein, scaled.carbs, scaled.fat);
  const valid = name.trim().length > 0 && (kcal > 0 || scaled.protein + scaled.carbs + scaled.fat > 0);

  const recent = useMemo(() => {
    const seen = new Map<string, FoodEntry>();
    [...s.food].reverse().forEach((e) => {
      const k = e.name.toLowerCase();
      if (!seen.has(k)) seen.set(k, e);
    });
    return [...seen.values()].slice(0, 12);
  }, [s.food]);

  const fill = (e: FoodEntry) => {
    tap();
    setName(e.name);
    setP(String(e.protein));
    setC(String(e.carbs));
    setF(String(e.fat));
    setKcalOverride(e.kcal !== kcalFromMacros(e.protein, e.carbs, e.fat) ? String(e.kcal) : '');
    setServings(1);
  };

  const save = () => {
    const entry = s.addFood({
      date,
      meal,
      name: name.trim(),
      protein: Math.round(scaled.protein),
      carbs: Math.round(scaled.carbs),
      fat: Math.round(scaled.fat),
      kcal: Math.round(kcal),
    });
    if (s.settings.healthEnabled) Health.saveFood(entry).catch(() => {});
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ModalHeader title="Log food" onCancel={() => router.back()} onSave={save} canSave={valid} saveLabel="Add" />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <Segmented<Meal>
          options={[
            { value: 'breakfast', label: 'Breakfast' },
            { value: 'lunch', label: 'Lunch' },
            { value: 'dinner', label: 'Dinner' },
            { value: 'snack', label: 'Snack' },
          ]}
          value={meal}
          onChange={setMeal}
        />
        <Card style={{ gap: space.md }}>
          <Field
            label="Food"
            placeholder="e.g. Chicken & rice"
            value={name}
            onChangeText={setName}
            autoCapitalize="sentences"
            returnKeyType="next"
          />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <MacroField label="Protein" color={t.protein} value={p} onChange={setP} />
            <MacroField label="Carbs" color={t.carbs} value={c} onChange={setC} />
            <MacroField label="Fat" color={t.fat} value={f} onChange={setF} />
          </View>
          <Field
            label="Calories (optional — calculated from macros)"
            placeholder={String(kcalFromMacros(base.protein, base.carbs, base.fat))}
            value={kcalOverride}
            onChangeText={setKcalOverride}
            keyboardType="decimal-pad"
            suffix="kcal"
          />
          <Divider />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[type.subhead, { color: t.text, flex: 1 }]}>Servings</Text>
            <Stepper value={servings} step={0.5} min={0.5} max={10} format={(v) => `${v}×`} onChange={setServings} />
          </View>
        </Card>

        <Card style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <Total label="kcal" value={kcal} color={t.text} />
          <Total label="protein" value={scaled.protein} color={t.protein} suffix="g" />
          <Total label="carbs" value={scaled.carbs} color={t.carbs} suffix="g" />
          <Total label="fat" value={scaled.fat} color={t.fat} suffix="g" />
        </Card>

        {recent.length ? (
          <View style={{ gap: space.sm }}>
            <Text style={[type.overline, { color: t.text3 }]}>Recent</Text>
            <Card style={{ paddingVertical: space.xs }}>
              {recent.map((e, i) => (
                <View key={e.id}>
                  {i > 0 ? <Divider /> : null}
                  <Pressable
                    onPress={() => fill(e)}
                    style={({ pressed }) => ({ paddingVertical: space.md, opacity: pressed ? 0.6 : 1 })}
                    accessibilityRole="button"
                  >
                    <Text style={[type.body, { color: t.text }]} numberOfLines={1}>
                      {e.name}
                    </Text>
                    <Text style={[type.footnote, { color: t.text3 }]}>
                      {e.kcal} kcal · P {e.protein} · C {e.carbs} · F {e.fat}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </Card>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function MacroField({ label, color, value, onChange }: { label: string; color: string; value: string; onChange: (v: string) => void }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
        <Text style={[type.caption, { color: t.text2 }]}>{label}</Text>
      </View>
      <Field value={value} onChangeText={onChange} keyboardType="decimal-pad" placeholder="0" suffix="g" />
    </View>
  );
}

function Total({ label, value, color, suffix = '' }: { label: string; value: number; color: string; suffix?: string }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={[type.title2, { color, fontVariant: ['tabular-nums'] }]}>
        {Math.round(value)}
        {suffix}
      </Text>
      <Text style={[type.caption, { color: t.text3 }]}>{label}</Text>
    </View>
  );
}
