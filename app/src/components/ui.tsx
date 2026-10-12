import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import type { ComponentProps, ReactNode } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type ScrollViewProps,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { radius, space, type, useTheme } from '@/lib/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Icon({ name, size = 20, color }: { name: IconName | string; size?: number; color?: string }) {
  const t = useTheme();
  return <Ionicons name={name as IconName} size={size} color={color ?? t.text} />;
}

export function tap(style: 'light' | 'medium' | 'success' = 'light') {
  if (Platform.OS === 'web') return;
  if (style === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else Haptics.impactAsync(style === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Scrollable screen. `tab` screens rely on native-tab automatic insets on iOS. */
export function Screen({ children, tab, contentStyle, ...rest }: ScrollViewProps & { tab?: boolean; contentStyle?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const manualTop = tab && Platform.OS !== 'ios' ? insets.top : 0;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      {...rest}
      contentContainerStyle={[
        { paddingTop: manualTop + space.sm, paddingBottom: 48, paddingHorizontal: space.lg, gap: space.lg },
        contentStyle,
      ]}
    >
      {children}
    </ScrollView>
  );
}

export function LargeHeader({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  const t = useTheme();
  return (
    <View style={styles.headerRow}>
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text style={[type.overline, { color: t.text3, marginBottom: 2 }]}>{eyebrow}</Text> : null}
        <Text style={[type.largeTitle, { color: t.text }]} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit>
          {title}
        </Text>
        {subtitle ? <Text style={[type.callout, { color: t.text2, marginTop: 2 }]}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={{ flexDirection: 'row', gap: space.sm }}>{right}</View> : null}
    </View>
  );
}

export function Card({
  children,
  style,
  onPress,
  padded = true,
  accessibilityLabel,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
  accessibilityLabel?: string;
}) {
  const t = useTheme();
  const base: ViewStyle = {
    backgroundColor: t.card,
    borderRadius: radius.lg,
    padding: padded ? space.lg : 0,
    borderWidth: t.scheme === 'dark' ? StyleSheet.hairlineWidth : 0,
    borderColor: t.separator,
    ...(t.scheme === 'light'
      ? { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 1 }
      : null),
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [base, style, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}
    >
      {children}
    </Pressable>
  );
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const t = useTheme();
  return (
    <View style={[styles.headerRow, { marginBottom: -space.xs, marginTop: space.xs }]}>
      <Text style={[type.title2, { color: t.text, flex: 1 }]} accessibilityRole="header">
        {title}
      </Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={12} accessibilityRole="button">
          <Text style={[type.subhead, { color: t.accent }]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';

export function Button({
  title,
  icon,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled,
  style,
  flex,
}: {
  title: string;
  icon?: IconName;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  flex?: boolean;
}) {
  const t = useTheme();
  const palette: Record<ButtonVariant, { bg: string; fg: string }> = {
    primary: { bg: t.ink, fg: t.onInk },
    accent: { bg: t.accent, fg: t.onAccent },
    secondary: { bg: t.fill, fg: t.text },
    ghost: { bg: 'transparent', fg: t.accent },
    danger: { bg: t.badSoft, fg: t.bad },
  };
  const c = palette[variant];
  const h = size === 'lg' ? 52 : size === 'md' ? 44 : 34;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        tap(variant === 'primary' || variant === 'accent' ? 'medium' : 'light');
        onPress();
      }}
      style={({ pressed }) => [
        {
          height: h,
          borderRadius: size === 'sm' ? radius.pill : radius.md + 2,
          backgroundColor: c.bg,
          paddingHorizontal: size === 'sm' ? space.md : space.lg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: space.sm,
          opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
        },
        flex && { flex: 1 },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={size === 'sm' ? 15 : 18} color={c.fg} /> : null}
      <Text style={[size === 'sm' ? type.subhead : type.headline, { color: c.fg }]} numberOfLines={1}>
        {title}
      </Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  tint,
  filled = true,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  tint?: string;
  filled?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => ({
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: filled ? t.card : 'transparent',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name={icon} size={20} color={tint ?? t.text} />
    </Pressable>
  );
}

export function Chip({
  label,
  color,
  icon,
  selected,
  onPress,
  style,
}: {
  label: string;
  color?: string;
  icon?: IconName;
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const content = (
    <>
      {color ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} /> : null}
      {icon ? <Ionicons name={icon} size={13} color={selected ? t.onInk : t.text2} /> : null}
      <Text style={[type.caption, { color: selected ? t.onInk : t.text2 }]} numberOfLines={1}>
        {label}
      </Text>
    </>
  );
  const s: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: onPress ? 32 : 24,
    borderRadius: radius.pill,
    backgroundColor: selected ? t.ink : t.fill,
    alignSelf: 'flex-start',
  };
  if (!onPress) return <View style={[s, style]}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [s, style, pressed && { opacity: 0.7 }]}
    >
      {content}
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: t.fill, borderRadius: radius.md, padding: 3 }} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              tap();
              onChange(o.value);
            }}
            style={{
              flex: 1,
              height: 32,
              borderRadius: radius.md - 3,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? t.elevated : 'transparent',
              ...(active && t.scheme === 'light'
                ? { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }
                : null),
            }}
          >
            <Text style={[type.subhead, { color: active ? t.text : t.text2, fontWeight: active ? '600' : '500' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ProgressBar({ value, color, height = 8, track }: { value: number; color?: string; height?: number; track?: string }) {
  const t = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: track ?? t.fill, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: height / 2, backgroundColor: color ?? t.accent }} />
    </View>
  );
}

export function Ring({
  value,
  size = 64,
  stroke = 8,
  color,
  track,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color: string;
  track?: string;
  children?: ReactNode;
}) {
  const t = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track ?? t.fill} strokeWidth={stroke} fill="none" />
        {pct > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${c * pct} ${c}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      {children}
    </View>
  );
}

export function Stat({
  label,
  value,
  unit,
  color,
  align = 'left',
}: {
  label: string;
  value: string;
  unit?: string;
  color?: string;
  align?: 'left' | 'center';
}) {
  const t = useTheme();
  return (
    <View style={{ alignItems: align === 'center' ? 'center' : 'flex-start' }}>
      <Text style={[type.caption, { color: t.text3, marginBottom: 2 }]}>{label}</Text>
      <Text style={{ color: color ?? t.text }}>
        <Text style={[type.title2, { fontVariant: ['tabular-nums'] }]}>{value}</Text>
        {unit ? <Text style={[type.footnote, { color: t.text3 }]}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

export function Row({
  title,
  subtitle,
  left,
  right,
  onPress,
  chevron = !!onPress,
  destructive,
}: {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
}) {
  const t = useTheme();
  const body = (
    <>
      {left}
      <View style={{ flex: 1 }}>
        <Text style={[type.body, { color: destructive ? t.bad : t.text }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[type.footnote, { color: t.text3, marginTop: 1 }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {chevron ? <Ionicons name="chevron-forward" size={16} color={t.text3} /> : null}
    </>
  );
  const s: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48, paddingVertical: space.sm };
  if (!onPress) return <View style={s}>{body}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s, pressed && { opacity: 0.6 }]}>
      {body}
    </Pressable>
  );
}

export function Divider({ inset = 0 }: { inset?: number }) {
  const t = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.separator, marginLeft: inset }} />;
}

export function IconBadge({ name, color, size = 34 }: { name: IconName | string; color: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        backgroundColor: color + '22',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={name as IconName} size={size * 0.52} color={color} />
    </View>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: IconName; title: string; body: string; action?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: space.xl, gap: space.sm }}>
      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: t.fill, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={24} color={t.text2} />
      </View>
      <Text style={[type.headline, { color: t.text, textAlign: 'center' }]}>{title}</Text>
      <Text style={[type.footnote, { color: t.text3, textAlign: 'center', maxWidth: 280 }]}>{body}</Text>
      {action ? <View style={{ marginTop: space.sm }}>{action}</View> : null}
    </View>
  );
}

export function Field({
  label,
  suffix,
  style,
  inputStyle,
  ...props
}: TextInputProps & { label?: string; suffix?: string; style?: StyleProp<ViewStyle>; inputStyle?: StyleProp<TextStyle> }) {
  const t = useTheme();
  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? <Text style={[type.caption, { color: t.text2 }]}>{label}</Text> : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: t.fill,
          borderRadius: radius.md,
          paddingHorizontal: space.md,
          minHeight: 46,
        }}
      >
        <TextInput
          placeholderTextColor={t.text3}
          selectionColor={t.accent}
          {...props}
          style={[
            type.body,
            { flex: 1, minWidth: 0, color: t.text, paddingVertical: 10 },
            Platform.OS === 'web' && ({ outlineStyle: 'none' } as unknown as TextStyle),
            inputStyle,
          ]}
        />
        {suffix ? <Text style={[type.footnote, { color: t.text3 }]}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 999,
  format,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  format?: (v: number) => string;
}) {
  const t = useTheme();
  const btn = (icon: IconName, delta: number, label: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={() => {
        tap();
        onChange(Math.max(min, Math.min(max, Math.round((value + delta) * 100) / 100)));
      }}
      style={({ pressed }) => ({
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: t.fill,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name={icon} size={16} color={t.text} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      {btn('remove', -step, 'Decrease')}
      <Text style={[type.headline, { color: t.text, minWidth: 44, textAlign: 'center', fontVariant: ['tabular-nums'] }]}>
        {format ? format(value) : value}
      </Text>
      {btn('add', step, 'Increase')}
    </View>
  );
}

export function PressableScale(props: PressableProps & { style?: StyleProp<ViewStyle> }) {
  const { style, ...rest } = props;
  return <Pressable {...rest} style={({ pressed }) => [style, pressed && { opacity: 0.7 }]} />;
}

export const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});

/** Header for modal sheets: Cancel · Title · Save. */
export function ModalHeader({
  title,
  onCancel,
  onSave,
  saveLabel = 'Save',
  canSave = true,
}: {
  title: string;
  onCancel: () => void;
  onSave?: () => void;
  saveLabel?: string;
  canSave?: boolean;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: space.lg,
        paddingTop: Platform.OS === 'ios' ? space.md : insets.top + space.sm,
        paddingBottom: space.md,
        backgroundColor: t.bg,
      }}
    >
      <Pressable onPress={onCancel} hitSlop={10} accessibilityRole="button" style={{ minWidth: 70 }}>
        <Text style={[type.body, { color: t.accent }]}>Cancel</Text>
      </Pressable>
      <Text style={[type.headline, { color: t.text, flex: 1, textAlign: 'center' }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={{ minWidth: 70, alignItems: 'flex-end' }}>
        {onSave ? (
          <Pressable
            onPress={() => {
              if (!canSave) return;
              tap('success');
              onSave();
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSave }}
          >
            <Text style={[type.headline, { color: canSave ? t.accent : t.text3 }]}>{saveLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** Destructive confirmation: native alert on iOS/Android, browser confirm on web. */
export function confirmAction(title: string, body: string, action: string, go: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${body}`) ?? true) go();
    return;
  }
  Alert.alert(title, body, [
    { text: 'Cancel', style: 'cancel' },
    { text: action, style: 'destructive', onPress: go },
  ]);
}
