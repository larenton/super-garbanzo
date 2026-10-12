import { useMemo, useState } from 'react';
import { Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { formatDayMonth } from '@/lib/dates';
import { space, type, useTheme, svgFont } from '@/lib/theme';

export interface Point {
  date: string;
  value: number;
  /** Optional raw reading drawn as a faint dot behind a smoothed line. */
  raw?: number;
}

function niceTicks(min: number, max: number, count = 3) {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  const step0 = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) ?? step0;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}

function useWidth() {
  const [w, setW] = useState(0);
  return [w, (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)] as const;
}

/**
 * Line chart with press-and-drag scrubbing. The readout above the plot shows
 * the selected point (or the latest one), like Apple Health.
 */
export function LineChart({
  data,
  color,
  height = 160,
  format = (v) => v.toFixed(1),
  unit,
  target,
  targetLabel,
  emptyText = 'Not enough data yet',
}: {
  data: Point[];
  color: string;
  height?: number;
  format?: (v: number) => string;
  unit?: string;
  target?: number;
  targetLabel?: string;
  emptyText?: string;
}) {
  const t = useTheme();
  const [w, onLayout] = useWidth();
  const [sel, setSel] = useState<number | null>(null);
  const padL = 4;
  const padR = 36;
  const padT = 10;
  const padB = 22;

  const geo = useMemo(() => {
    if (data.length === 0 || w === 0) return null;
    const values = data.flatMap((d) => (d.raw !== undefined ? [d.value, d.raw] : [d.value]));
    if (target !== undefined) values.push(target);
    const ticks = niceTicks(Math.min(...values), Math.max(...values));
    const lo = ticks[0];
    const hi = ticks[ticks.length - 1];
    const plotW = w - padL - padR;
    const plotH = height - padT - padB;
    const t0 = Date.parse(data[0].date);
    const t1 = Date.parse(data[data.length - 1].date);
    const xOf = (date: string) => padL + (t1 === t0 ? plotW / 2 : ((Date.parse(date) - t0) / (t1 - t0)) * plotW);
    const yOf = (v: number) => padT + plotH - ((v - lo) / (hi - lo || 1)) * plotH;
    const pts = data.map((d) => ({ x: xOf(d.date), y: yOf(d.value), ry: d.raw !== undefined ? yOf(d.raw) : undefined }));
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${padT + plotH} L${pts[0].x.toFixed(1)},${padT + plotH} Z`;
    return { ticks, yOf, pts, line, area, plotW, plotH };
  }, [data, w, height, target]);

  const idx = sel ?? data.length - 1;
  const cur = data[idx];
  const first = data[0];
  const delta = cur && first ? cur.value - first.value : 0;

  const scrub = (e: GestureResponderEvent) => {
    if (!geo) return;
    const x = e.nativeEvent.locationX;
    let best = 0;
    geo.pts.forEach((p, i) => {
      if (Math.abs(p.x - x) < Math.abs(geo.pts[best].x - x)) best = i;
    });
    setSel(best);
  };

  return (
    <View onLayout={onLayout} style={{ gap: space.sm }}>
      <View style={{ minHeight: 44 }}>
        {cur ? (
          <>
            <Text style={{ color: t.text }}>
              <Text style={[type.metric]}>{format(cur.value)}</Text>
              {unit ? <Text style={[type.subhead, { color: t.text3 }]}> {unit}</Text> : null}
            </Text>
            <Text style={[type.footnote, { color: t.text3 }]}>
              {sel !== null ? formatDayMonth(cur.date) : 'Latest'}
              {sel === null && data.length > 1 ? (
                <Text style={{ color: t.text2 }}>
                  {'  ·  '}
                  {delta >= 0 ? '+' : '−'}
                  {format(Math.abs(delta))} since {formatDayMonth(first.date)}
                </Text>
              ) : null}
            </Text>
          </>
        ) : (
          <Text style={[type.footnote, { color: t.text3 }]}>{emptyText}</Text>
        )}
      </View>
      <View
        style={{ height }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={scrub}
        onResponderMove={scrub}
        onResponderRelease={() => setSel(null)}
        accessible
        accessibilityLabel={cur ? `Chart. Latest ${format(cur.value)} ${unit ?? ''}. ${data.length} points.` : 'Empty chart'}
      >
        {geo ? (
          <Svg width={w} height={height}>
            <Defs>
              <LinearGradient id={`g${color.replace(/\W/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color} stopOpacity={0.18} />
                <Stop offset="1" stopColor={color} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {geo.ticks.map((v) => (
              <G key={v}>
                <Line x1={padL} x2={padL + geo.plotW} y1={geo.yOf(v)} y2={geo.yOf(v)} stroke={t.separator} strokeWidth={1} />
                <SvgText fontFamily={svgFont} x={w - 2} y={geo.yOf(v) + 4} fontSize={10} fill={t.text3} textAnchor="end">
                  {Number.isInteger(v) ? String(v) : format(v)}
                </SvgText>
              </G>
            ))}
            {target !== undefined ? (
              <G>
                <Line
                  x1={padL}
                  x2={padL + geo.plotW}
                  y1={geo.yOf(target)}
                  y2={geo.yOf(target)}
                  stroke={t.text2}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
                {targetLabel ? (
                  <SvgText fontFamily={svgFont} x={padL + 2} y={geo.yOf(target) - 5} fontSize={10} fill={t.text2}>
                    {targetLabel}
                  </SvgText>
                ) : null}
              </G>
            ) : null}
            {geo.pts.map((p, i) =>
              p.ry !== undefined ? <Circle key={`r${i}`} cx={p.x} cy={p.ry} r={2.2} fill={color} opacity={0.25} /> : null,
            )}
            {geo.pts.length > 1 ? <Path d={geo.area} fill={`url(#g${color.replace(/\W/g, '')})`} /> : null}
            <Path d={geo.line} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            {sel !== null ? (
              <Line x1={geo.pts[idx].x} x2={geo.pts[idx].x} y1={padT} y2={padT + geo.plotH} stroke={t.text3} strokeWidth={1} />
            ) : null}
            <Circle cx={geo.pts[idx].x} cy={geo.pts[idx].y} r={5} fill={color} stroke={t.card} strokeWidth={2} />
            <SvgText fontFamily={svgFont} x={padL} y={height - 4} fontSize={10} fill={t.text3}>
              {formatDayMonth(data[0].date)}
            </SvgText>
            <SvgText fontFamily={svgFont} x={padL + geo.plotW} y={height - 4} fontSize={10} fill={t.text3} textAnchor="end">
              {formatDayMonth(data[data.length - 1].date)}
            </SvgText>
          </Svg>
        ) : (
          <View style={{ flex: 1, borderRadius: 12, backgroundColor: t.cardAlt }} />
        )}
      </View>
    </View>
  );
}

export interface Bar {
  label: string;
  value: number;
  /** Drawn as a faint outline bar behind the value (e.g. planned sessions). */
  ghost?: number;
  detail?: string;
}

/** Vertical bars with tap-to-inspect. The last bar is emphasised as "current". */
export function BarChart({
  data,
  color,
  height = 140,
  format = (v) => String(Math.round(v)),
  target,
  summary,
}: {
  data: Bar[];
  color: string;
  height?: number;
  format?: (v: number) => string;
  target?: number;
  summary?: string;
}) {
  const t = useTheme();
  const [w, onLayout] = useWidth();
  const [sel, setSel] = useState<number | null>(null);
  const padB = 20;
  const padT = 6;
  const plotH = height - padB - padT;
  const max = Math.max(1, target ?? 0, ...data.map((d) => Math.max(d.value, d.ghost ?? 0)));
  const slot = data.length ? w / data.length : 0;
  const bw = Math.min(28, Math.max(4, slot * 0.6));
  const yOf = (v: number) => padT + plotH - (v / max) * plotH;
  const active = sel !== null ? data[sel] : null;

  return (
    <View onLayout={onLayout} style={{ gap: space.sm }}>
      <Text style={[type.footnote, { color: t.text2, minHeight: 18 }]}>
        {active ? `${active.label}: ${active.detail ?? format(active.value)}` : (summary ?? '')}
      </Text>
      <View style={{ height }}>
        {w > 0 ? (
          <Svg width={w} height={height}>
            <Line x1={0} x2={w} y1={padT + plotH} y2={padT + plotH} stroke={t.separator} strokeWidth={1} />
            {target !== undefined ? (
              <Line x1={0} x2={w} y1={yOf(target)} y2={yOf(target)} stroke={t.text2} strokeWidth={1.5} strokeDasharray="4 4" />
            ) : null}
            {data.map((d, i) => {
              const cx = slot * i + slot / 2;
              const isLast = i === data.length - 1;
              const dim = sel !== null && sel !== i;
              const h = (d.value / max) * plotH;
              return (
                <G key={i} onPress={() => setSel(sel === i ? null : i)}>
                  <Rect x={cx - slot / 2} y={0} width={slot} height={height} fill="transparent" />
                  {d.ghost ? (
                    <Rect
                      x={cx - bw / 2}
                      y={yOf(d.ghost)}
                      width={bw}
                      height={(d.ghost / max) * plotH}
                      rx={4}
                      fill="none"
                      stroke={t.text3}
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />
                  ) : null}
                  {d.value > 0 ? (
                    <Rect
                      x={cx - bw / 2}
                      y={yOf(d.value)}
                      width={bw}
                      height={Math.max(2, h)}
                      rx={4}
                      fill={color}
                      opacity={dim ? 0.3 : isLast || sel === i ? 1 : 0.7}
                    />
                  ) : null}
                  {data.length <= 14 || i % 2 === 0 ? (
                    <SvgText fontFamily={svgFont} x={cx} y={height - 5} fontSize={10} fill={t.text3} textAnchor="middle">
                      {d.label}
                    </SvgText>
                  ) : null}
                </G>
              );
            })}
          </Svg>
        ) : null}
      </View>
    </View>
  );
}

/** Tiny trend line for list rows and stat tiles. */
export function Sparkline({
  values,
  color,
  width = 72,
  height = 28,
}: {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return <View style={{ width, height }} />;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (width - 4) + 2, height - 3 - ((v - lo) / (hi - lo || 1)) * (height - 6)]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <Svg width={width} height={height}>
      <Path d={d} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={last[0]} cy={last[1]} r={3} fill={color} />
    </Svg>
  );
}
