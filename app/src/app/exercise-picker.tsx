import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';

import { MuscleThumb } from '@/components/BodyMap';
import { Chip, Divider, Field, ModalHeader, tap } from '@/components/ui';
import { EQUIPMENT_LABELS, EXERCISES, MUSCLE_LABELS } from '@/data/exercises';
import { useStore } from '@/lib/store';
import { space, type, useTheme } from '@/lib/theme';
import type { Muscle } from '@/lib/types';

const GROUPS: { label: string; muscles: Muscle[] }[] = [
  { label: 'Chest', muscles: ['chest'] },
  { label: 'Back', muscles: ['lats', 'upperBack', 'lowerBack', 'traps'] },
  { label: 'Shoulders', muscles: ['frontDelts', 'sideDelts', 'rearDelts'] },
  { label: 'Arms', muscles: ['biceps', 'triceps', 'forearms'] },
  { label: 'Legs', muscles: ['quads', 'hamstrings', 'glutes', 'adductors', 'calves'] },
  { label: 'Core', muscles: ['abs', 'obliques'] },
];

export default function ExercisePicker() {
  const { mode, templateId } = useLocalSearchParams<{ mode: 'active' | 'template'; templateId?: string }>();
  const t = useTheme();
  const s = useStore();
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<string | null>(null);

  const list = useMemo(() => {
    const g = GROUPS.find((x) => x.label === group);
    return EXERCISES.filter((e) => {
      if (q && !e.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (g && !e.primary.some((m) => g.muscles.includes(m))) return false;
      return true;
    });
  }, [q, group]);

  const pick = (id: string) => {
    tap('success');
    if (mode === 'template' && templateId) {
      const tpl = useStore.getState().templates.find((x) => x.id === templateId);
      if (tpl) s.upsertTemplate({ ...tpl, exercises: [...tpl.exercises, { exerciseId: id, sets: 3, reps: '8-12', restSec: 90 }] });
    } else {
      s.addExerciseToActive(id);
    }
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ModalHeader title="Add exercise" onCancel={() => router.back()} />
      <View style={{ paddingHorizontal: space.lg, gap: space.md, paddingBottom: space.md }}>
        <Field placeholder="Search exercises" value={q} onChangeText={setQ} autoFocus={false} clearButtonMode="while-editing" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          <Chip label="All" selected={!group} onPress={() => setGroup(null)} />
          {GROUPS.map((g) => (
            <Chip key={g.label} label={g.label} selected={group === g.label} onPress={() => setGroup(g.label)} />
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={list}
        keyExtractor={(e) => e.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: 40 }}
        ItemSeparatorComponent={() => <Divider inset={56} />}
        renderItem={({ item: e }) => (
          <Pressable
            onPress={() => pick(e.id)}
            accessibilityRole="button"
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.md,
              paddingVertical: space.sm,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <MuscleThumb primary={e.primary} secondary={e.secondary} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={[type.body, { color: t.text }]}>{e.name}</Text>
              <Text style={[type.footnote, { color: t.text3 }]} numberOfLines={1}>
                {e.primary.map((m) => MUSCLE_LABELS[m]).join(', ')} · {EQUIPMENT_LABELS[e.equipment]}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
