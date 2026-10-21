import { useState, type ReactNode } from 'react';
import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';

import { getExercise } from '@/data/exercises';
import { formatWeight } from '@/lib/units';
import type { CardioSegment, ExerciseLog, PlannedExercise, Units, WorkoutTemplate } from '@/lib/types';
import { kindColor, radius, space, type, useTheme, svgFont } from '@/lib/theme';
import { getMedia } from '@/data/exerciseMedia';
import { MuscleThumb } from './BodyMap';
import { ExerciseVisual, VideoButton } from './PlanVisuals';
import { Icon } from './ui';

function fmtRest(sec: number) {
  if (sec === 0) return 'straight into the next';
  return sec >= 60 ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')} rest` : `${sec} s rest`;
}

/** Splits a plan's exercises into superset blocks by letter: A1 + A2 → block A. */
export function supersetBlocks(exercises: PlannedExercise[]) {
  const blocks: { letter: string; items: { pe: PlannedExercise; index: number }[] }[] = [];
  exercises.forEach((pe, index) => {
    const letter = pe.group?.charAt(0) ?? String(index + 1);
    const last = blocks[blocks.length - 1];
    if (pe.group && last && last.letter === letter) last.items.push({ pe, index });
    else blocks.push({ letter, items: [{ pe, index }] });
  });
  return blocks;
}

export function blockTitle(count: number, letter: string) {
  if (count >= 3) return `Giant set ${letter}`;
  if (count === 2) return `Superset ${letter}`;
  return `Block ${letter}`;
}

/** Vertical timeline of a strength session: warm-up → superset blocks → cool-down. */
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
      <View style={{ flex: 1, paddingBottom: isLast ? 0 : space.lg }}>{content}</View>
    </View>
  );
  const dot = (icon: string) => (
    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: t.fill, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={14} color={t.text2} />
    </View>
  );

  const card = (pe: PlannedExercise, index: number) => {
    const ex = getExercise(pe.exerciseId);
    const prev = last?.(pe.exerciseId);
    const prevTop = prev?.sets.reduce((a, s) => (s.weight > a.weight ? s : a), prev.sets[0]);
    return (
      <View
        key={`${pe.exerciseId}-${index}`}
        style={{ backgroundColor: t.cardAlt, borderRadius: radius.md, padding: space.md, gap: space.sm }}
      >
        <Pressable
          onPress={() => onPressExercise?.(pe.exerciseId)}
          accessibilityRole="button"
          accessibilityLabel={`${pe.group ?? ''} ${ex.name}, ${pe.sets} sets of ${pe.reps}`}
          style={({ pressed }) => ({ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start', opacity: pressed ? 0.7 : 1 })}
        >
          {pe.group ? (
            <View style={{ backgroundColor: color, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 2 }}>
              <Text style={[type.caption, { color: '#fff', fontWeight: '700' }]}>{pe.group}</Text>
            </View>
          ) : null}
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={[type.headline, { color: t.text }]}>{ex.name}</Text>
            <Text style={[type.footnote, { color: t.text2 }]}>
              <Text style={{ fontWeight: '700', color: t.text }}>
                {pe.sets} × {pe.reps}
              </Text>
              {'  ·  '}
              {fmtRest(pe.restSec)}
            </Text>
            {pe.note ? <Text style={[type.caption, { color: t.text3 }]}>{pe.note}</Text> : null}
            {prevTop && prevTop.weight > 0 ? (
              <Text style={[type.caption, { color: t.text3 }]}>
                Last: {formatWeight(prevTop.weight, units)} × {prevTop.reps}
                {ex.timed ? ' s' : ''}
              </Text>
            ) : null}
          </View>
          <Icon name="chevron-forward" size={16} color={t.text3} />
        </Pressable>
        {getMedia(pe.exerciseId) ? (
          <>
            <ExerciseVisual exerciseId={pe.exerciseId} maxHeight={120} />
            <VideoButton exerciseId={pe.exerciseId} compact />
          </>
        ) : (
          <View style={{ alignItems: 'flex-start' }}>
            <MuscleThumb primary={ex.primary} secondary={ex.secondary} size={64} />
          </View>
        )}
      </View>
    );
  };

  return (
    <View>
      {node(
        <View style={{ paddingTop: 4 }}>
          <Text style={[type.subhead, { color: t.text }]}>Warm-up · 5 min</Text>
          <Text style={[type.footnote, { color: t.text3 }]}>{template.warmup ?? 'Easy cardio, then 2 ramp-up sets of the first lift'}</Text>
        </View>,
        dot('flame-outline'),
      )}
      {supersetBlocks(template.exercises).map((b) => {
        const grouped = b.items.length > 1;
        const restAfter = b.items[b.items.length - 1].pe.restSec;
        const restBetween = b.items[0].pe.restSec;
        return node(
          <View style={{ gap: space.sm }}>
            {grouped ? (
              <View style={{ paddingTop: 4 }}>
                <Text style={[type.subhead, { color: t.text }]}>{blockTitle(b.items.length, b.letter)}</Text>
                <Text style={[type.footnote, { color: t.text3 }]}>
                  {b.items.map((x) => x.pe.group).join(' → ')}, {restBetween ? `${restBetween} s between` : 'back to back'}, {restAfter} s
                  after. Repeat for all sets.
                </Text>
              </View>
            ) : null}
            <View style={{ gap: space.sm, borderLeftWidth: grouped ? 3 : 0, borderLeftColor: color, paddingLeft: grouped ? space.sm : 0 }}>
              {b.items.map((x) => card(x.pe, x.index))}
            </View>
          </View>,
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: color,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 2,
            }}
          >
            <Text style={[type.caption, { color: '#fff', fontWeight: '700' }]}>{b.letter}</Text>
          </View>,
          false,
          `block-${b.letter}-${b.items[0].index}`,
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
