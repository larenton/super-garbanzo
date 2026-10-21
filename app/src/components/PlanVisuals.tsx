import * as WebBrowser from 'expo-web-browser';
import { Image, Linking, Platform, Pressable, Text, View } from 'react-native';

import { getMedia } from '@/data/exerciseMedia';
import { RPE_GUIDE } from '@/data/templates';
import type { PlanRule } from '@/lib/types';
import { radius, space, type, useTheme } from '@/lib/theme';
import { Icon, tap } from './ui';

export async function openVideo(url: string) {
  tap();
  if (Platform.OS === 'web') {
    await Linking.openURL(url);
    return;
  }
  await WebBrowser.openBrowserAsync(url, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET });
}

/**
 * Start/finish illustration from the plan's exercise guide. The drawings are
 * dark-on-white, so they sit on a white plate in both themes.
 */
export function ExerciseVisual({ exerciseId, maxHeight }: { exerciseId: string; maxHeight?: number }) {
  const t = useTheme();
  const media = getMedia(exerciseId);
  if (!media) return null;
  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: radius.md,
        overflow: 'hidden',
        borderWidth: t.scheme === 'dark' ? 0 : 1,
        borderColor: t.separator,
        alignItems: 'center',
      }}
    >
      <Image
        source={media.image}
        accessibilityLabel="Start and finish positions"
        resizeMode="contain"
        style={{ width: '100%', aspectRatio: media.aspect, maxHeight }}
      />
    </View>
  );
}

export function VideoButton({ exerciseId, compact }: { exerciseId: string; compact?: boolean }) {
  const t = useTheme();
  const media = getMedia(exerciseId);
  if (!media) return null;
  return (
    <Pressable
      onPress={() => openVideo(media.video)}
      accessibilityRole="link"
      accessibilityLabel="Watch a demo video"
      hitSlop={8}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        paddingHorizontal: compact ? 0 : space.md,
        height: compact ? 24 : 36,
        borderRadius: radius.pill,
        backgroundColor: compact ? 'transparent' : t.badSoft,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Icon name="logo-youtube" size={compact ? 15 : 17} color={t.bad} />
      <Text style={[compact ? type.caption : type.subhead, { color: t.bad, fontWeight: '600' }]}>Watch a demo video</Text>
    </Pressable>
  );
}

/** Tempo bar, e.g. 3-0-1-0: block widths follow the seconds in each phase. */
export function TempoBar({ tempo }: { tempo: string }) {
  const t = useTheme();
  const parts = tempo.split('-').map((n) => parseInt(n, 10) || 0);
  const phases = [
    { label: 'Lower', color: t.cardio, fg: '#FFFFFF' },
    { label: 'Bottom', color: t.fill, fg: t.text2 },
    { label: 'Lift', color: t.mobility, fg: '#FFFFFF' },
    { label: 'Top', color: t.fill, fg: t.text2 },
  ];
  return (
    <View style={{ gap: space.sm }} accessible accessibilityLabel={`Tempo ${tempo}: ${parts[0]} seconds down, ${parts[2]} up`}>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        {phases.map((p, i) => (
          <View
            key={p.label}
            style={{
              flex: Math.max(0.8, parts[i] ?? 0),
              backgroundColor: p.color,
              borderRadius: 6,
              paddingVertical: space.sm,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={[type.headline, { color: p.fg, fontVariant: ['tabular-nums'] }]}>{parts[i] ?? 0} s</Text>
            <Text style={[type.caption, { color: p.fg, opacity: 0.85, textAlign: 'center' }]} numberOfLines={2}>
              {p.label}
            </Text>
          </View>
        ))}
      </View>
      <Text style={[type.caption, { color: t.text3 }]}>
        Lower for {parts[0]} s, {parts[1] ? `pause ${parts[1]} s` : 'no pause'} at the bottom, lift in {parts[2]} s,{' '}
        {parts[3] ? `pause ${parts[3]} s at the top` : 'straight into the next rep'}.
      </Text>
    </View>
  );
}

export function RulesList({ rules }: { rules: PlanRule[] }) {
  const t = useTheme();
  return (
    <View style={{ gap: space.md }}>
      {rules.map((r, i) => (
        <View key={r.title} style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
          <View style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: t.ink, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[type.caption, { color: t.onInk, fontWeight: '700' }]}>{i + 1}</Text>
          </View>
          <Text style={[type.footnote, { color: t.text2, flex: 1, paddingTop: 3 }]}>
            <Text style={{ color: t.text, fontWeight: '600' }}>{r.title} </Text>
            {r.body}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Easy / Steady / Hard effort scale for the cardio days. */
export function RpeScale({ highlight }: { highlight?: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: space.sm }}>
      {RPE_GUIDE.map((r) => {
        const on = !highlight || highlight === r.label;
        return (
          <View
            key={r.label}
            style={{
              flex: 1,
              borderRadius: radius.md,
              padding: space.sm,
              gap: 2,
              backgroundColor: on ? t.zone[r.zone - 1] : t.fill,
            }}
          >
            <Text style={[type.subhead, { color: on && r.zone >= 4 ? '#FFFFFF' : t.text, fontWeight: '700' }]}>{r.label}</Text>
            <Text style={[type.caption, { color: on && r.zone >= 4 ? '#FFFFFFDD' : t.text2 }]}>{r.rpe}</Text>
            <Text style={[type.caption, { color: on && r.zone >= 4 ? '#FFFFFFDD' : t.text3 }]}>{r.talk}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** Highlighted coach note (why this session, progression, benchmark). */
export function CoachNote({ title, body, icon = 'chatbubble-ellipses-outline' }: { title: string; body: string; icon?: string }) {
  const t = useTheme();
  return (
    <View style={{ backgroundColor: t.warnSoft, borderRadius: radius.lg, padding: space.lg, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Icon name={icon} size={17} color={t.warn} />
        <Text style={[type.headline, { color: t.text }]}>{title}</Text>
      </View>
      <Text style={[type.footnote, { color: t.text2, lineHeight: 19 }]}>{body}</Text>
    </View>
  );
}
