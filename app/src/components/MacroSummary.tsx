import { Text, View } from 'react-native';

import type { MacroTotals } from '@/lib/analytics';
import type { MacroTargets } from '@/lib/types';
import { formatNumber } from '@/lib/units';
import { space, type, useTheme } from '@/lib/theme';
import { ProgressBar, Ring } from './ui';

export function MacroBar({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const t = useTheme();
  const left = Math.round(target - value);
  return (
    <View style={{ gap: 6, flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
        <Text style={[type.caption, { color: t.text2 }]}>{label}</Text>
      </View>
      <Text style={{ color: t.text }}>
        <Text style={[type.headline, { fontVariant: ['tabular-nums'] }]}>{Math.round(value)}</Text>
        <Text style={[type.caption, { color: t.text3 }]}> / {target}g</Text>
      </Text>
      <ProgressBar value={value / target} color={color} height={6} />
      <Text style={[type.caption, { color: left < 0 ? t.warn : t.text3 }]}>{left >= 0 ? `${left}g left` : `${-left}g over`}</Text>
    </View>
  );
}

/** Calorie ring plus protein / carbs / fat bars. */
export function MacroSummary({ totals, targets, compact }: { totals: MacroTotals; targets: MacroTargets; compact?: boolean }) {
  const t = useTheme();
  const remaining = Math.round(targets.kcal - totals.kcal);
  const size = compact ? 92 : 132;
  return (
    <View style={{ gap: space.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
        <Ring value={totals.kcal / targets.kcal} size={size} stroke={compact ? 9 : 12} color={remaining < 0 ? t.warn : t.ink}>
          <Text style={[compact ? type.headline : type.title, { color: t.text, fontVariant: ['tabular-nums'] }]}>
            {formatNumber(Math.abs(remaining))}
          </Text>
          <Text style={[type.caption, { color: t.text3 }]}>{remaining >= 0 ? 'kcal left' : 'kcal over'}</Text>
        </Ring>
        <View style={{ flex: 1, gap: space.sm }}>
          <Line label="Eaten" value={`${formatNumber(totals.kcal)} kcal`} />
          <Line label="Target" value={`${formatNumber(targets.kcal)} kcal`} />
          <Line label="Protein" value={`${Math.round((totals.protein / Math.max(1, targets.protein)) * 100)}% of goal`} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: space.lg }}>
        <MacroBar label="Protein" value={totals.protein} target={targets.protein} color={t.protein} />
        <MacroBar label="Carbs" value={totals.carbs} target={targets.carbs} color={t.carbs} />
        <MacroBar label="Fat" value={totals.fat} target={targets.fat} color={t.fat} />
      </View>
    </View>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={[type.footnote, { color: t.text3 }]}>{label}</Text>
      <Text style={[type.footnote, { color: t.text, fontWeight: '600', fontVariant: ['tabular-nums'] }]}>{value}</Text>
    </View>
  );
}
