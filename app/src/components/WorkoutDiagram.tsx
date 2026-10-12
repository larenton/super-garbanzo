import { useState, type ReactNode } from 'react';
import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';

import { getExercise } from '@/data/exercises';
import { formatWeight } from '@/lib/units';
import type { CardioSegment, ExerciseLog, Units, WorkoutTemplate } from '@/lib/types';
import { kindColor, radius, space, type, useTheme, svgFont } from '@/lib/theme';
import { MuscleThumb } from './BodyMap';
import { Icon } from './ui';

function fmtRest(sec: number) {
  return sec >= 60 ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')} rest` : `${sec}s rest`;
}

/** Vertical timeline of a strength session: warm-up → exercises → cool-down. */
export function SessionFlow({
  template,
  onPressExercise,
  last,
  units,
}: {
  template: WorkoutTemplate;
  onPressExercise?: (id: string) => void;
  last?: (exerciseId: string) => ExerciseLog | undefined;
  units: Units;
}) {
  const t = useTheme();
  const color = kindColor(t, template.kind);
  const node = (content: ReactNode, marker: ReactNode, isLast = false, key?: string) => (
    <View key={key} style={{ flexDirection: 'row', gap: space.md }}>
      <View style={{ alignItems: 'center', width: 28 }}>
        {marker}
        {!isLast ? <View style={{ flex: 1, width: 2, backgroundColor: t.separator, marginVertical: 2 }} /> : null}
      </View>
      <View style={{ flex: 1, paddingBottom: isLast ? 0 : space.md }}>{content}</View>
    </View>
  );
  const dot = (icon: string) => (
    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: t.fill, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={14} color={t.text2} />
    </View>
  );

  return (
    <View>
      {node(
        <View style={{ paddingTop: 4 }}>
          <Text style={[type.subhead, { color: t.text }]}>Warm-up · 8 min</Text>
          <Text style={[type.footnote, { color: t.text3 }]}>Easy cardio, then 2 ramp-up sets of the first lift</Text>
        </View>,
        dot('flame-outline'),
      )}
      {template.exercises.map((pe, i) => {
        const ex = getExercise(pe.exerciseId);
        const prev = last?.(pe.exerciseId);
        const prevTop = prev?.sets.reduce((a, s) => (s.weight > a.weight ? s : a), prev.sets[0]);
        return node(
          <Pressable
            onPress={() => onPressExercise?.(pe.exerciseId)}
            accessibilityRole="button"
            accessibilityLabel={`${ex.name}, ${pe.sets} sets of ${pe.reps}`}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.md,
              backgroundColor: t.cardAlt,
              borderRadius: radius.md,
              padding: space.md,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[type.headline, { color: t.text }]} numberOfLines={1}>
                {ex.name}
              </Text>
              <Text style={[type.footnote, { color: t.text2 }]}>
                <Text style={{ fontWeight: '700', color: t.text }}>
                  {pe.sets} × {pe.reps}
                </Text>
                {'  ·  '}
                {fmtRest(pe.restSec)}
              </Text>
              {prevTop && prevTop.weight > 0 ? (
                <Text style={[type.caption, { color: t.text3 }]}>
                  Last: {formatWeight(prevTop.weight, units)} × {prevTop.reps}
                </Text>
              ) : null}
              {pe.note ? <Text style={[type.caption, { color: t.text3 }]}>{pe.note}</Text> : null}
            </View>
            <MuscleThumb primary={ex.primary} secondary={ex.secondary} size={64} />
          </Pressable>,
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: color,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: space.md,
            }}
          >
            <Text style={[type.caption, { color: '#fff', fontWeight: '700' }]}>{i + 1}</Text>
          </View>,
          false,
          `${pe.exerciseId}-${i}`,
        );
      })}
      {node(
        <View style={{ paddingTop: 4 }}>
          <Text style={[type.subhead, { color: t.text }]}>Cool-down · 5 min</Text>
          <Text style={[type.footnote, { color: t.text3 }]}>Light stretching for the muscles you trained</Text>
        </View>,
        dot('leaf-outline'),
        true,
      )}
    </View>
  );
}

const ZONE_NAMES = ['Recovery', 'Easy', 'Steady', 'Threshold', 'Max'];

/** Effort profile for cardio: block width = time, height and colour = heart-rate zone. */
export function EffortProfile({ segments }: { segments: CardioSegment[] }) {
  const t = useTheme();
  const [w, setW] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const total = segments.reduce((a, s) => a + s.minutes, 0);
  const H = 120;
  const top = 8;
  const axisW = 22;
  const plotW = Math.max(0, w - axisW);
  const gap = 2;
  const blocks = segments.reduce<{ x: number; w: number }[]>((acc, s) => {
    const prev = acc[acc.length - 1];
    const x = prev ? prev.x + prev.w + gap : axisW;
    acc.push({ x, w: Math.max(2, (s.minutes / total) * plotW - gap) });
    return acc;
  }, []);

  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const active = sel !== null ? segments[sel] : null;

  return (
    <View onLayout={onLayout} style={{ gap: space.sm }}>
      <Text style={[type.footnote, { color: t.text2, minHeight: 18 }]}>
        {active
          ? `${active.label} · ${active.minutes} min · Zone ${active.zone} (${ZONE_NAMES[active.zone - 1]})`
          : `${total} min total · tap a block for details`}
      </Text>
      {w > 0 ? (
        <Svg width={w} height={H + top + 18}>
          {[1, 2, 3, 4, 5].map((z) => {
            const y = top + H - (z / 5) * H;
            return (
              <G key={z}>
                <Line x1={axisW} x2={w} y1={y} y2={y} stroke={t.separator} strokeWidth={1} strokeDasharray="2 4" />
                <SvgText fontFamily={svgFont} x={0} y={y + 4} fontSize={10} fill={t.text3}>
                  Z{z}
                </SvgText>
              </G>
            );
          })}
          {segments.map((s, i) => {
            const bw = blocks[i].w;
            const bh = (s.zone / 5) * H;
            return (
              <Rect
                key={i}
                x={blocks[i].x}
                y={top + H - bh}
                width={bw}
                height={bh}
                rx={3}
                fill={t.zone[s.zone - 1]}
                opacity={sel === null || sel === i ? 1 : 0.35}
                onPress={() => setSel(sel === i ? null : i)}
              />
            );
          })}
          <SvgText fontFamily={svgFont} x={axisW} y={top + H + 14} fontSize={10} fill={t.text3}>
            0
          </SvgText>
          <SvgText fontFamily={svgFont} x={w} y={top + H + 14} fontSize={10} fill={t.text3} textAnchor="end">
            {total} min
          </SvgText>
        </Svg>
      ) : (
        <View style={{ height: H + top + 18 }} />
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        {[1, 2, 3, 4, 5]
          .filter((z) => segments.some((s) => s.zone === z))
          .map((z) => (
            <View key={z} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: t.zone[z - 1] }} />
              <Text style={[type.caption, { color: t.text2 }]}>
                Z{z} {ZONE_NAMES[z - 1]}
              </Text>
            </View>
          ))}
      </View>
    </View>
  );
}
