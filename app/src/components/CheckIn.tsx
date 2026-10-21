import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { dayStatus, macroTotals, targetsFor } from '@/lib/analytics';
import { useStore } from '@/lib/store';
import { radius, space, type, useTheme } from '@/lib/theme';
import { formatWeight } from '@/lib/units';
import { Divider, Icon, Stepper, tap } from './ui';

/** The plan's daily check-in: morning weight, session, energy, sleep, protein. */
export function CheckInCard({ date }: { date: string }) {
  const t = useTheme();
  const s = useStore();
  const ci = s.checkins[date] ?? {};
  const weight = s.weights.find((w) => w.date === date);
  const status = dayStatus(s, s.logs, date);
  const sessionDone = status === 'done' || status === 'extra';
  const restDay = status === 'rest';
  const protein = macroTotals(s.food, date).protein;
  const proteinTarget = targetsFor(s, date).protein;
  const proteinHit = protein >= proteinTarget * 0.95;

  const tick = (done: boolean, label: string, value: string, onPress?: () => void) => (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 40, opacity: pressed ? 0.6 : 1 })}
    >
      <Icon name={done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={done ? t.good : t.text3} />
      <Text style={[type.body, { color: t.text, flex: 1 }]}>{label}</Text>
      <Text style={[type.subhead, { color: done ? t.text2 : onPress ? t.accent : t.text3, fontVariant: ['tabular-nums'] }]}>{value}</Text>
    </Pressable>
  );

  return (
    <View style={{ gap: space.sm }}>
      {tick(
        !!weight,
        'Morning weight',
        weight ? formatWeight(weight.kg, s.settings.units) : 'Log',
        weight ? undefined : () => router.push('/weight-add'),
      )}
      {tick(sessionDone, 'Session done', restDay ? 'Rest day' : sessionDone ? 'Done' : 'Not yet')}
      {tick(proteinHit, 'Protein hit', `${Math.round(protein)} / ${proteinTarget} g`)}
      <Divider />
      <View style={{ gap: space.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={[type.body, { color: t.text }]}>Energy</Text>
          <Text style={[type.subhead, { color: t.text2 }]}>{ci.energy ? `${ci.energy}/10` : 'Tap 1-10'}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }} accessibilityRole="radiogroup">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
            const on = ci.energy !== undefined && n <= ci.energy;
            return (
              <Pressable
                key={n}
                accessibilityRole="radio"
                accessibilityState={{ selected: ci.energy === n }}
                accessibilityLabel={`Energy ${n}`}
                onPress={() => {
                  tap();
                  s.setCheckIn(date, { energy: n });
                }}
                style={{
                  flex: 1,
                  height: 30,
                  borderRadius: radius.sm,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: on ? (ci.energy! >= 7 ? t.good : ci.energy! >= 4 ? t.warn : t.bad) : t.fill,
                }}
              >
                <Text style={[type.caption, { color: on ? '#FFFFFF' : t.text3 }]}>{n}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[type.body, { color: t.text, flex: 1 }]}>Sleep</Text>
        <Stepper
          value={ci.sleepHours ?? 7.5}
          step={0.5}
          min={0}
          max={14}
          format={(v) => (ci.sleepHours === undefined ? '— h' : `${v} h`)}
          onChange={(v) => s.setCheckIn(date, { sleepHours: v })}
        />
      </View>
    </View>
  );
}
