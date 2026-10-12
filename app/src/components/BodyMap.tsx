import { Text, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { MUSCLE_LABELS } from '@/data/exercises';
import type { Muscle } from '@/lib/types';
import { space, type, useTheme } from '@/lib/theme';

/**
 * Stylised anatomical muscle map. Shapes are drawn for the figure's left half
 * (x < 50 in a 100 × 200 box) and mirrored, so both sides always match.
 */
type Shape = { muscle: Muscle; d: string };

const FRONT: Shape[] = [
  { muscle: 'traps', d: 'M45,26 C42,28 38,30 35,32 L45,32 Z' },
  { muscle: 'frontDelts', d: 'M34,33 C28,32 24,35 23,41 C22,45 23,48 24,50 C27,47 30,43 33,39 Z' },
  { muscle: 'chest', d: 'M49,34 C43,33 37,34 34,38 C32,43 33,48 37,51 C42,52 47,51 49,49 Z' },
  { muscle: 'biceps', d: 'M24,52 C22,57 21,62 22,68 C24,69 27,69 29,67 C30,61 30,55 29,50 C27,49 25,50 24,52 Z' },
  { muscle: 'forearms', d: 'M22,71 C20,78 18,85 17,93 C19,94 21,94 23,93 C25,86 28,78 29,70 C27,69 24,69 22,71 Z' },
  { muscle: 'obliques', d: 'M42,54 C38,55 36,58 36,64 C36,73 38,82 41,90 L43,90 C43,78 42,66 42,54 Z' },
  {
    muscle: 'quads',
    d: 'M37,95 C34,103 33,114 34,125 C35,133 37,139 40,143 C43,141 46,135 47,127 C48,115 47,104 46,97 C43,95 40,94 37,95 Z',
  },
  { muscle: 'adductors', d: 'M47,97 C48,103 49,109 49,117 L49,99 C48,98 48,97 47,97 Z' },
  { muscle: 'calves', d: 'M37,150 C35,160 35,171 37,184 C39,186 41,186 42,184 C44,172 45,161 44,151 C42,148 39,148 37,150 Z' },
];

const FRONT_ABS: { x: number; y: number; w: number; h: number }[] = [
  { x: 43.5, y: 54, w: 5.5, h: 8 },
  { x: 43.5, y: 63.5, w: 5.5, h: 8 },
  { x: 43.5, y: 73, w: 5.5, h: 8 },
  { x: 44, y: 82.5, w: 5, h: 8 },
];

const BACK: Shape[] = [
  { muscle: 'traps', d: 'M50,25 C46,27 40,30 34,33 C40,35 45,40 50,48 Z' },
  { muscle: 'rearDelts', d: 'M33,34 C28,34 24,37 23,43 C26,44 30,42 34,38 Z' },
  { muscle: 'sideDelts', d: 'M23,45 C22,47 22,49 23,50 C25,48 28,46 31,43 C28,44 25,45 23,45 Z' },
  { muscle: 'triceps', d: 'M24,52 C22,58 21,63 22,69 C25,70 28,69 29,67 C30,60 30,54 29,49 C27,49 25,50 24,52 Z' },
  { muscle: 'forearms', d: 'M22,72 C20,79 18,86 17,93 C19,94 21,94 23,93 C25,86 28,79 29,71 C27,70 24,70 22,72 Z' },
  { muscle: 'upperBack', d: 'M49,49 C46,44 42,40 37,38 C38,43 42,49 49,56 Z' },
  { muscle: 'lats', d: 'M36,41 C35,50 37,60 42,70 C45,68 47,64 48,60 C44,54 39,48 36,41 Z' },
  { muscle: 'lowerBack', d: 'M49,60 C46,64 44,68 43,74 C44,79 46,83 49,85 Z' },
  { muscle: 'glutes', d: 'M49,87 C44,86 39,88 37,93 C36,100 38,106 43,108 C46,108 48,106 49,104 Z' },
  { muscle: 'hamstrings', d: 'M38,110 C36,120 36,131 38,141 C40,143 43,143 45,141 C47,131 48,120 47,110 C44,109 41,109 38,110 Z' },
  { muscle: 'calves', d: 'M37,150 C34,158 34,167 37,177 C39,179 42,179 44,177 C46,167 46,158 44,150 C42,148 39,148 37,150 Z' },
];

/** Mirrors a path drawn with absolute M/L/C/Q/Z commands across x = 50. */
function mirror(d: string): string {
  return d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, x, y) => `${100 - Number(x)},${y}`);
}

export type MuscleLevels = Partial<Record<Muscle, number>>;

function Figure({ side, levels, width }: { side: 'front' | 'back'; levels: MuscleLevels; width: number }) {
  const t = useTheme();
  const max = Math.max(1, ...Object.values(levels).map((v) => v ?? 0));
  const fill = (m: Muscle) => {
    const v = levels[m] ?? 0;
    if (v <= 0) return t.muscleIdle;
    return v / max >= 0.55 ? t.musclePrimary : t.muscleSecondary;
  };
  const shapes = side === 'front' ? FRONT : BACK;
  const neutral = t.bodyNeutral;
  return (
    <Svg width={width} height={width * 2} viewBox="0 0 100 200">
      {/* head, neck, hands, knees, feet */}
      <Ellipse cx={50} cy={13} rx={8} ry={10} fill={neutral} />
      <Rect x={46} y={22} width={8} height={6} rx={2} fill={neutral} />
      {[0, 1].map((i) => (
        <G key={i}>
          <Ellipse cx={i ? 83 : 17} cy={98} rx={3.5} ry={4.5} fill={neutral} />
          <Circle cx={i ? 59 : 41} cy={146} r={3} fill={neutral} />
          <Ellipse cx={i ? 60 : 40} cy={191} rx={4.5} ry={3} fill={neutral} />
        </G>
      ))}
      {shapes.map((s, i) => (
        <G key={i}>
          <Path d={s.d} fill={fill(s.muscle)} />
          <Path d={mirror(s.d)} fill={fill(s.muscle)} />
        </G>
      ))}
      {side === 'front'
        ? FRONT_ABS.map((r, i) => (
            <G key={`abs${i}`}>
              <Rect x={r.x} y={r.y} width={r.w} height={r.h} rx={1.6} fill={fill('abs')} />
              <Rect x={100 - r.x - r.w} y={r.y} width={r.w} height={r.h} rx={1.6} fill={fill('abs')} />
            </G>
          ))
        : null}
      {side === 'front' ? <Path d="M41,92 C44,95 47,96 50,96 C53,96 56,95 59,92 L56,98 C54,99 46,99 44,98 Z" fill={neutral} /> : null}
    </Svg>
  );
}

/** Front and back figures side by side, with an optional legend. */
export function BodyMap({ levels, size = 120, legend = true }: { levels: MuscleLevels; size?: number; legend?: boolean }) {
  const t = useTheme();
  const worked = (Object.entries(levels) as [Muscle, number][]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...worked.map(([, v]) => v));
  const primary = worked.filter(([, v]) => v / max >= 0.55).map(([m]) => MUSCLE_LABELS[m]);
  const secondary = worked.filter(([, v]) => v / max < 0.55).map(([m]) => MUSCLE_LABELS[m]);
  return (
    <View
      style={{ alignItems: 'center', gap: space.md }}
      accessible
      accessibilityLabel={`Muscles worked. Primary: ${primary.join(', ') || 'none'}. Secondary: ${secondary.join(', ') || 'none'}.`}
    >
      <View style={{ flexDirection: 'row', gap: space.xl }}>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Figure side="front" levels={levels} width={size * 0.5} />
          <Text style={[type.caption, { color: t.text3 }]}>Front</Text>
        </View>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Figure side="back" levels={levels} width={size * 0.5} />
          <Text style={[type.caption, { color: t.text3 }]}>Back</Text>
        </View>
      </View>
      {legend ? (
        <View style={{ alignSelf: 'stretch', gap: 6 }}>
          <LegendLine color={t.musclePrimary} label="Primary" items={primary} />
          {secondary.length ? <LegendLine color={t.muscleSecondary} label="Secondary" items={secondary} /> : null}
        </View>
      ) : null}
    </View>
  );
}

function LegendLine({ color, label, items }: { color: string; label: string; items: string[] }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color, marginTop: 4 }} />
      <Text style={[type.footnote, { color: t.text2, flex: 1 }]}>
        <Text style={{ fontWeight: '600', color: t.text }}>{label} </Text>
        {items.join(' · ') || '—'}
      </Text>
    </View>
  );
}

/** Compact single-figure thumbnail, choosing the side with more work. */
export function MuscleThumb({ primary, secondary, size = 44 }: { primary: Muscle[]; secondary: Muscle[]; size?: number }) {
  const levels: MuscleLevels = {};
  secondary.forEach((m) => (levels[m] = 0.5));
  primary.forEach((m) => (levels[m] = 1));
  const backMuscles: Muscle[] = ['traps', 'rearDelts', 'sideDelts', 'triceps', 'upperBack', 'lats', 'lowerBack', 'glutes', 'hamstrings'];
  const backScore = primary.filter((m) => backMuscles.includes(m)).length;
  const frontScore = primary.length - backScore;
  return <Figure side={backScore > frontScore ? 'back' : 'front'} levels={levels} width={size / 2} />;
}
