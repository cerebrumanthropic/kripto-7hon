import { Link, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import {
  Platform,
  Pressable,
  type PressableStateCallbackType,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { arrow, direction, pct } from '@/lib/format';
import { radius, space, type, type ThemeColors, type TypeVariant } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type ColorKey = keyof ThemeColors;

/** react-native-web Pressable-ийн нэмэлт төлөв (RN-ийн төрөлд байхгүй). */
export type WebPressState = PressableStateCallbackType & { hovered?: boolean; focused?: boolean };
export const webPress = (s: PressableStateCallbackType) => s as WebPressState;

/**
 * `data-*` атрибут (react-native-web `dataSet`). `+html.tsx`-ийн CSS hover/print дүрэмд:
 * `lift` — hover-т дээш хөдөлнө, `band` — бараан тууз, `news` — мэдээний мөр.
 */
export const dataAttrs = (d: Record<string, string>): object => (Platform.OS === 'web' ? { dataSet: d } : {});

type TProps = TextProps & {
  v?: TypeVariant;
  color?: ColorKey;
  /** Тоонд tabular-nums (SPEC §9) */
  num?: boolean;
  style?: StyleProp<TextStyle>;
  children?: ReactNode;
};

/** Сэдэвтэй текст. */
export function T({ v = 'body', color = 'text', num, style, ...rest }: TProps) {
  const { c } = useTheme();
  return (
    <Text
      {...rest}
      style={[type[v], { color: c[color] }, num && { fontVariant: ['tabular-nums'] }, style]}
    />
  );
}

/** Гадаад холбоос: шинэ таб, `rel="noopener noreferrer"` (SPEC §13.2). */
export function ExtLink({
  href,
  children,
  v = 'body',
  color = 'brandText',
  style,
}: {
  href: string;
  children: ReactNode;
  v?: TypeVariant;
  color?: ColorKey;
  style?: StyleProp<TextStyle>;
}) {
  const { c } = useTheme();
  return (
    <Link
      href={href as Href}
      target="_blank"
      rel="noopener noreferrer"
      style={[type[v], { color: c[color], textDecorationLine: 'underline' }, style]}>
      {children}
    </Link>
  );
}

/** Дотоод холбоос. */
export function InLink({
  href,
  children,
  v = 'body',
  color = 'brandText',
  style,
}: {
  href: Href;
  children: ReactNode;
  v?: TypeVariant;
  color?: ColorKey;
  style?: StyleProp<TextStyle>;
}) {
  const { c } = useTheme();
  return (
    <Link href={href} style={[type[v], { color: c[color] }, style]}>
      {children}
    </Link>
  );
}

/** Товч хэлбэртэй дотоод холбоос: `primary` — алтан дэвсгэр, бусад нь хүрээтэй. */
export function ButtonLink({ href, label, primary }: { href: Href; label: string; primary?: boolean }) {
  const { c } = useTheme();
  return (
    <Link
      href={href}
      {...dataAttrs({ lift: '' })}
      style={[
        type.bodyStrong,
        {
          color: primary ? c.onBrand : c.text,
          backgroundColor: primary ? c.accent : 'transparent',
          borderWidth: 1,
          borderColor: primary ? c.accent : c.borderStrong,
          borderRadius: radius.md,
          paddingVertical: 11,
          paddingHorizontal: 20,
          textDecorationLine: 'none',
        },
      ]}>
      {label}
    </Link>
  );
}

export function Card({
  children,
  style,
  tone = 'surface',
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'surface' | 'surfaceAlt';
}) {
  const { c } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: c[tone],
          borderColor: c.border,
          borderWidth: 1,
          borderRadius: radius.lg,
          padding: space.lg,
          boxShadow: c.shadow,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

/** Хэсгийн гарчиг: жижиг шошго + том гарчиг. `id` нь anchor (#id) болно. */
export function SectionHeader({
  title,
  kicker,
  id,
  right,
}: {
  title: string;
  kicker?: string;
  id?: string;
  right?: ReactNode;
}) {
  const { c } = useTheme();
  return (
    <View
      nativeID={id}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: space.md,
        marginBottom: space.md,
        flexWrap: 'wrap',
      }}>
      <View style={{ flexShrink: 1 }}>
        {kicker ? (
          <T v="label" color="accent" style={{ marginBottom: space.xs }}>
            {kicker}
          </T>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm }}>
          <View aria-hidden style={{ width: 4, height: 20, marginTop: 4, borderRadius: 2, backgroundColor: c.accent }} />
          <T v="h2" role="heading" aria-level={2} style={{ flexShrink: 1 }}>
            {title}
          </T>
        </View>
      </View>
      {right}
    </View>
  );
}

/** ▲ +4.2% — өнгө ба тэмдгээр (SPEC §9). */
export function Delta({
  value,
  v = 'smallStrong',
  suffix,
}: {
  value: number | null | undefined;
  v?: TypeVariant;
  suffix?: string;
}) {
  const d = direction(value);
  const color: ColorKey = d === 'up' ? 'positiveText' : d === 'down' ? 'negativeText' : 'neutralText';
  return (
    <T v={v} color={color} num>
      {arrow(value)} {pct(value)}
      {suffix ? ` ${suffix}` : ''}
    </T>
  );
}

/** KPI картын ▲ +4.2% pill + саарал тайлбар («24 цаг»). */
export function DeltaPill({ value, suffix }: { value: number | null | undefined; suffix?: string }) {
  const { c } = useTheme();
  const d = direction(value);
  const [bg, fg] = d === 'up' ? [c.upBg, c.upFg] : d === 'down' ? [c.downBg, c.downFg] : [c.surfaceAlt, c.neutralText];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
      <View style={{ backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
        <T v="smallStrong" num style={{ color: fg }}>
          {arrow(value)} {pct(value)}
        </T>
      </View>
      {suffix ? (
        <T v="caption" color="textMuted">
          {suffix}
        </T>
      ) : null}
    </View>
  );
}

/**
 * 0–100 хэмжүүр. `fearGreed` — улаан→ногоон шугам дээр тэмдэг; бусад нь өнгөөр дүүргэнэ.
 * Утга нь картад текстээр бичигдсэн тул чимэг (aria-hidden).
 */
export function Meter({ value, fill }: { value: number | null | undefined; fill: 'fearGreed' | string }) {
  const { c } = useTheme();
  if (value == null) return null;
  const v = Math.max(0, Math.min(100, value));
  const track = { height: 6, borderRadius: 3, marginVertical: 6, backgroundColor: c.surfaceAlt } as const;
  if (fill === 'fearGreed') {
    return (
      <View aria-hidden style={[track, { backgroundImage: 'linear-gradient(90deg, #DC2626, #F59E0B 50%, #16A34A)' }]}>
        <View
          style={{
            position: 'absolute',
            left: `${v}%`,
            top: -4,
            width: 14,
            height: 14,
            marginLeft: -7,
            borderRadius: 7,
            backgroundColor: c.text,
            borderWidth: 3,
            borderColor: c.bg,
          }}
        />
      </View>
    );
  }
  return (
    <View aria-hidden style={[track, { overflow: 'hidden' }]}>
      <View style={{ width: `${v}%`, height: '100%', borderRadius: 3, backgroundColor: fill }} />
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      role="checkbox"
      aria-checked={selected}
      style={(s) => {
        const { hovered, focused } = webPress(s);
        return {
        paddingVertical: 6,
        paddingHorizontal: space.md,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: selected ? c.brand : c.borderStrong,
        backgroundColor: selected ? c.brand : hovered ? c.surfaceAlt : c.surface,
        outlineColor: c.brand,
        outlineWidth: focused ? 2 : 0,
        outlineStyle: 'solid',
        };
      }}>
      <T v="smallStrong" color={selected ? 'onBrand' : 'text'}>
        {label}
      </T>
    </Pressable>
  );
}

/** Жижиг шошго (ангилал, «ЖИШЭЭ ДАТА» г.м.). */
export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'warn' | 'brand' }) {
  const { c } = useTheme();
  const bg = tone === 'warn' ? c.warnBg : tone === 'brand' ? c.brand : c.surfaceAlt;
  const fg: ColorKey = tone === 'warn' ? 'warnText' : tone === 'brand' ? 'onBrand' : 'textMuted';
  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: radius.sm,
        paddingHorizontal: 6,
        paddingVertical: 2,
        alignSelf: 'flex-start',
      }}>
      <T v="caption" color={fg} style={{ fontWeight: '600' }}>
        {label}
      </T>
    </View>
  );
}

/** Responsive grid: `cols` багана, `gap` зай. */
export function Grid({
  cols,
  gap = space.md,
  children,
}: {
  cols: number;
  gap?: number;
  children: ReactNode[];
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
      {children.map((child, i) => (
        <View
          key={i}
          style={{
            flexBasis: cols === 1 ? '100%' : `${100 / cols - 2}%`,
            flexGrow: 1,
            minWidth: 0,
          }}>
          {child}
        </View>
      ))}
    </View>
  );
}

export function Divider() {
  const { c } = useTheme();
  return <View style={{ height: 1, backgroundColor: c.border, marginVertical: space.lg }} />;
}

/** Жагсаалтын мөр «•» тэмдэгтэй. */
export function Bullet({ children }: { children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.xs }}>
      <T color="accent">•</T>
      <T style={{ flex: 1 }}>{children}</T>
    </View>
  );
}
