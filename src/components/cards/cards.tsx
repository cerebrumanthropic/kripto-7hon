import { Link } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { IconTile } from '@/components/ui/icons';
import { Badge, Card, dataAttrs, Delta, DeltaPill, ExtLink, T } from '@/components/ui/primitives';
import { formatDateTime, relativeTime, weekLabel } from '@/lib/dates';
import { int } from '@/lib/format';
import { t } from '@/lib/i18n-mn';
import type { NewsItem, ReportIndexEntry } from '@/types/schemas';
import { radius, space } from '@/theme/tokens';
import { useHydrated, useLayout, useTheme } from '@/theme/use-theme';

/** «$2.80 их наяд» → том тоо + жижиг нэгж (2 баганат мобайл картад багтаахын тулд). */
function splitUnit(value: string): [string, string | null] {
  const i = value.indexOf(' ');
  return i > 0 ? [value.slice(0, i), value.slice(i + 1)] : [value, null];
}

export function KpiCard({
  label,
  value,
  delta,
  deltaLabel,
  sub,
  note,
  meter,
  footer,
}: {
  label: string;
  value: string;
  delta?: number | null;
  deltaLabel?: string;
  sub?: string;
  note?: string;
  /** Тооны доорх хэмжүүр (`Meter`) */
  meter?: ReactNode;
  footer?: ReactNode;
}) {
  const { isDesktop } = useLayout();
  const [num, unit] = splitUnit(value);
  return (
    <Card style={{ gap: space.xs, height: '100%', padding: 14 }}>
      <T v={isDesktop ? 'small' : 'caption'} color="textMuted" numberOfLines={2}>
        {label}
      </T>
      <T v="kpi" num style={{ fontSize: isDesktop ? 28 : 24, lineHeight: isDesktop ? 34 : 30 }}>
        {num}
        {unit ? (
          <T v="smallStrong" color="textMuted">
            {` ${unit}`}
          </T>
        ) : null}
      </T>
      {sub ? (
        <T v="small" color="textMuted" num>
          {sub}
        </T>
      ) : null}
      {meter}
      {delta != null ? <DeltaPill value={delta} suffix={deltaLabel} /> : null}
      {note ? (
        <T v="caption" color="textMuted">
          {note}
        </T>
      ) : null}
      {footer}
    </Card>
  );
}

const SYMBOL_COLORS: Record<string, string> = { BTC: '#F7931A', ETH: '#627EEA' };

/** Coin-ийн лого ашиглахгүй (SPEC §5.1) — симболын өнгөт дугуй тэмдэг. */
export function CoinBadge({ symbol, stable }: { symbol: string; stable?: boolean }) {
  const { c } = useTheme();
  const s = symbol.toUpperCase();
  const bg = SYMBOL_COLORS[s] ?? (stable ? c.stable : c.surfaceAlt);
  // Цагаан текст BTC/ETH/стейблкойны өнгөн дээр AA хангахгүй (2.3–3.7:1) → бараан текст
  const fg = SYMBOL_COLORS[s] || stable ? '#14161B' : c.text;
  return (
    <View
      aria-hidden
      style={{
        width: 28,
        height: 28,
        borderRadius: radius.pill,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <T style={{ color: fg, fontSize: s.length > 3 ? 8 : 10, fontWeight: '700' }}>{s.slice(0, 4)}</T>
    </View>
  );
}

/** Мэдээний мөр: ангиллын дүрс, гарчиг (гадагш), эх сурвалж, харьцангуй цаг, ангилал. */
export function NewsRow({ item, now }: { item: NewsItem; now?: Date }) {
  const { c } = useTheme();
  const { isMobile } = useLayout();
  // «2 цагийн өмнө» нь build ба хөтчийн цагаас хамаардаг → hydration-ий дараа л (зөрүүгүй SSR)
  const hydrated = useHydrated();
  return (
    <View
      role="listitem"
      {...dataAttrs({ news: '' })}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: space.md,
        paddingVertical: space.md,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
      }}>
      <IconTile name={item.isMongolia ? 'mongolia' : (item.tags[0] ?? 'news')} size={isMobile ? 36 : 40} />
      <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
        <ExtLink href={item.url} v="bodyStrong" color="text" style={{ textDecorationLine: 'none' }}>
          {item.title}
        </ExtLink>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm }}>
          <T v="caption" color="textMuted">
            {item.source} · {hydrated ? relativeTime(item.publishedAt, now) : formatDateTime(item.publishedAt)}
          </T>
          {item.isMongolia ? <Badge label={t.news.mongoliaTag} tone="brand" /> : null}
          {item.tags.map((tag) => (
            <Badge key={tag} label={t.tags[tag]} />
          ))}
        </View>
      </View>
    </View>
  );
}

/** Тайлангийн архивын карт. */
export function ReportCard({ entry, takeaways }: { entry: ReportIndexEntry; takeaways?: string[] }) {
  const { c } = useTheme();
  return (
    // `Link asChild` + функц style вэбд алга болдог тул статик style
    <Link href={`/tailan/${entry.week}`} asChild>
      <Pressable
        {...dataAttrs({ lift: '' })}
        style={{
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: c.border,
          borderTopWidth: 3,
          borderTopColor: c.accent,
          backgroundColor: c.surface,
          boxShadow: c.shadow,
          padding: space.lg,
          gap: space.sm,
        }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' }}>
          <T v="label" color="accent">
            {weekLabel(entry.week)}
          </T>
          {entry.sample ? <Badge label={t.reports.sample} tone="warn" /> : null}
        </View>
        <T v="h3">{entry.headline}</T>
        {takeaways ? (
          <View style={{ gap: 4 }}>
            {takeaways.map((x) => (
              <T key={x} v="small" color="textMuted">
                • {x}
              </T>
            ))}
          </View>
        ) : (
          <T v="small" color="textMuted">
            {entry.summary}
          </T>
        )}
        <View style={{ flexDirection: 'row', gap: space.lg, flexWrap: 'wrap' }}>
          <View style={{ flexDirection: 'row', gap: space.xs, alignItems: 'center' }}>
            <T v="caption" color="textMuted">
              {t.reports.btc7d}
            </T>
            <Delta value={entry.btcChange7dPct} v="caption" />
          </View>
          <T v="caption" color="textMuted" num>
            {t.reports.fg}: {int(entry.fearGreed)}
          </T>
        </View>
      </Pressable>
    </Link>
  );
}
