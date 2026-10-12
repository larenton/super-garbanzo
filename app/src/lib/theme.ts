import { Platform, useColorScheme } from 'react-native';

import type { SessionKind } from './types';

/**
 * Data colours come from a colour-blind-validated categorical palette
 * (slots 1–3 pass all-pairs CVD checks in both modes), so protein / carbs / fat
 * and strength / cardio / mobility stay distinguishable for everyone.
 */
const light = {
  scheme: 'light' as 'light' | 'dark',
  bg: '#F2F2F0',
  card: '#FFFFFF',
  cardAlt: '#F7F7F5',
  elevated: '#FFFFFF',
  text: '#0B0B0C',
  text2: '#52514E',
  text3: '#8A8984',
  separator: '#E3E2DD',
  fill: '#ECECE8',
  accent: '#2A78D6',
  accentSoft: '#E3EEFB',
  onAccent: '#FFFFFF',
  ink: '#0B0B0C',
  onInk: '#FFFFFF',
  good: '#0F8A3C',
  goodSoft: '#E1F3E7',
  warn: '#B86E00',
  warnSoft: '#FBEFD9',
  bad: '#C93A39',
  badSoft: '#FBE5E4',
  protein: '#2A78D6',
  carbs: '#EB6834',
  fat: '#1BAF7A',
  strength: '#2A78D6',
  cardio: '#EB6834',
  mobility: '#1BAF7A',
  sport: '#6250D6',
  muscleIdle: '#E2E1DC',
  muscleSecondary: '#9EC3EE',
  musclePrimary: '#2A78D6',
  bodyNeutral: '#D2D1CB',
  zone: ['#C9DDF5', '#8DB8EA', '#F2B03D', '#EB6834', '#C93A39'],
};

export type Theme = typeof light;

const dark: Theme = {
  scheme: 'dark',
  bg: '#000000',
  card: '#151515',
  cardAlt: '#1D1D1C',
  elevated: '#1F1F1E',
  text: '#F2F1EE',
  text2: '#C3C2B7',
  text3: '#8B8A83',
  separator: '#2A2A28',
  fill: '#262624',
  accent: '#3987E5',
  accentSoft: '#13263D',
  onAccent: '#FFFFFF',
  ink: '#F2F1EE',
  onInk: '#0B0B0C',
  good: '#3DBE6A',
  goodSoft: '#10291A',
  warn: '#E0A030',
  warnSoft: '#2E2210',
  bad: '#E66767',
  badSoft: '#331617',
  protein: '#3987E5',
  carbs: '#D95926',
  fat: '#199E70',
  strength: '#3987E5',
  cardio: '#D95926',
  mobility: '#199E70',
  sport: '#9085E9',
  muscleIdle: '#2C2C2A',
  muscleSecondary: '#2C5482',
  musclePrimary: '#3987E5',
  bodyNeutral: '#3A3A37',
  zone: ['#23415F', '#2F6AAE', '#C98500', '#D95926', '#E66767'],
};

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export function kindColor(t: Theme, kind: SessionKind): string {
  return t[kind];
}

export const KIND_LABELS: Record<SessionKind, string> = {
  strength: 'Strength',
  cardio: 'Cardio',
  mobility: 'Mobility',
  sport: 'Sport',
};

export const KIND_ICONS: Record<SessionKind, string> = {
  strength: 'barbell',
  cardio: 'walk',
  mobility: 'body',
  sport: 'football',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };
export const radius = { sm: 8, md: 12, lg: 18, xl: 24, pill: 999 };

export const type = {
  largeTitle: { fontSize: 34, fontWeight: '700' as const, letterSpacing: 0.2 },
  title: { fontSize: 24, fontWeight: '700' as const },
  title2: { fontSize: 20, fontWeight: '600' as const },
  headline: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  callout: { fontSize: 15, fontWeight: '400' as const },
  subhead: { fontSize: 14, fontWeight: '500' as const },
  footnote: { fontSize: 13, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
  overline: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.6, textTransform: 'uppercase' as const },
  metric: { fontSize: 28, fontWeight: '700' as const, fontVariant: ['tabular-nums' as const] },
};

/** SVG text doesn't inherit the system font on web. */
export const svgFont = Platform.select({ web: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', default: undefined });
