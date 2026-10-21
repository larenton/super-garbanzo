import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BodyMap } from '@/components/BodyMap';
import { Button, Field, Icon, Segmented } from '@/components/ui';
import { buildDemoData } from '@/lib/demo';
import { useStore } from '@/lib/store';
import { space, type, useTheme } from '@/lib/theme';
import type { Units } from '@/lib/types';

const FEATURES = [
  { icon: 'calendar', title: 'Your plan, weeks ahead', body: 'See every upcoming session and sync it to your calendar.' },
  { icon: 'barbell', title: 'Log every set', body: 'Weights and reps in the gym, with your last session alongside.' },
  { icon: 'walk', title: 'In and out of the gym', body: 'Runs, walks and rides — manually or from Apple Health.' },
  { icon: 'nutrition', title: 'Macros that add up', body: 'Protein, carbs and fat against your daily targets.' },
  { icon: 'trending-up', title: 'Goals & trends', body: 'Strength, body weight and consistency over time.' },
];

export default function Onboarding() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const complete = useStore((s) => s.completeOnboarding);
  const [name, setName] = useState('');
  const [units, setUnits] = useState<Units>('kg');

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + space.xl,
          paddingBottom: insets.bottom + space.xl,
          paddingHorizontal: space.xl,
          gap: space.xl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: 'center', gap: space.md }}>
          <BodyMap
            levels={{ chest: 2, quads: 2, lats: 2, glutes: 2, frontDelts: 1, hamstrings: 1, abs: 1, calves: 1 }}
            size={130}
            legend={false}
          />
          <Text style={[type.largeTitle, { color: t.text, textAlign: 'center' }]}>Kinetic</Text>
          <Text style={[type.callout, { color: t.text2, textAlign: 'center' }]}>Your training plan, progress and macros in one place.</Text>
        </View>

        <View style={{ gap: space.lg }}>
          {FEATURES.map((f) => (
            <View key={f.title} style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: t.accentSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={f.icon} color={t.accent} size={19} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[type.headline, { color: t.text }]}>{f.title}</Text>
                <Text style={[type.footnote, { color: t.text2 }]}>{f.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ gap: space.md }}>
          <Field
            label="What should we call you?"
            placeholder="First name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            returnKeyType="done"
          />
          <Segmented<Units>
            options={[
              { value: 'kg', label: 'kg' },
              { value: 'lb', label: 'lb' },
            ]}
            value={units}
            onChange={setUnits}
          />
        </View>

        <View style={{ gap: space.sm }}>
          <Button title="Get started" onPress={() => complete({ name: name.trim(), units })} />
          <Button
            title="Explore with sample data"
            variant="ghost"
            onPress={() => {
              const data = buildDemoData(name.trim() || 'Alex');
              complete({ name: name.trim() || 'Alex', units, demo: true }, data);
            }}
          />
          <Text style={[type.caption, { color: t.text3, textAlign: 'center' }]}>
            Loads your Week 1 plan: Push / Pull / Legs with rowing between, plus your macro targets. You can edit it any time.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
