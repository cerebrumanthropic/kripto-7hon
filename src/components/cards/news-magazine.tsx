// Сэтгүүлийн бүтэцтэй мэдээний блок (нүүр ба /medee-ийн дээд хэсэг, PROGRESS D70):
// зүүн — 2 карт, төв — онцлох мэдээ, баруун — «Сүүлийн мэдээ» жагсаалт. Мэдээний сайтын зураг ашиглахгүй
// (CLAUDE.md дүрэм 4) тул «нүүр зураг» нь ангиллын өнгөт градиент + том дүрс + эх сурвалжийн нэр.
import { Link, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Icon, useIconColor, type IconName } from '@/components/ui/icons';
import { dataAttrs, T } from '@/components/ui/primitives';
import { formatDateTime, relativeTime } from '@/lib/dates';
import { t } from '@/lib/i18n-mn';
import type { NewsItem } from '@/types/schemas';
import { font, radius, space } from '@/theme/tokens';
import { useHydrated, useLayout, useTheme } from '@/theme/use-theme';

const iconOf = (item: NewsItem): IconName => (item.isMongolia ? 'mongolia' : (item.tags[0] ?? 'news'));
const labelOf = (item: NewsItem): string => (item.isMongolia ? t.news.mongoliaTag : item.tags[0] ? t.tags[item.tags[0]] : t.news.title);

/** Ангиллын өнгөт «нүүр зураг» (чимэг). */
function Cover({ item, height, iconSize, showSource = true }: { item: NewsItem; height: number; iconSize: number; showSource?: boolean }) {
  const { c } = useTheme();
  const color = useIconColor(iconOf(item));
  return (
    <View
      aria-hidden
      style={{
        height,
        borderRadius: radius.md,
        overflow: 'hidden',
        backgroundColor: c.surfaceAlt,
        backgroundImage: `radial-gradient(120% 90% at 85% 15%, ${color}55 0%, transparent 60%), linear-gradient(135deg, ${color}33 0%, ${color}0D 70%)`,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon name={iconOf(item)} size={iconSize} color={color} />
      {showSource ? (
        <View
          style={{
            position: 'absolute',
            left: space.sm,
            bottom: space.sm,
            backgroundColor: c.surface,
            borderRadius: radius.sm,
            paddingHorizontal: 6,
            paddingVertical: 2,
          }}>
          <T v="caption" color="textMuted" style={font('bold')}>
            {item.source}
          </T>
        </View>
      ) : null}
    </View>
  );
}

function Category({ item, center }: { item: NewsItem; center?: boolean }) {
  const color = useIconColor(iconOf(item));
  return (
    <T v="smallStrong" style={{ color, textAlign: center ? 'center' : 'left' }}>
      {labelOf(item)}
    </T>
  );
}

function Meta({ item, center, source = true }: { item: NewsItem; center?: boolean; source?: boolean }) {
  // «2 цагийн өмнө» нь hydration-ий дараа л (статик HTML-тэй зөрөхгүй)
  const hydrated = useHydrated();
  const when = hydrated ? relativeTime(item.publishedAt) : formatDateTime(item.publishedAt);
  return (
    <T v="caption" color="textMuted" style={{ textAlign: center ? 'center' : 'left' }}>
      {source ? `${when} · ${item.source}` : when}
    </T>
  );
}

/** Гадагш холбоос (`noopener noreferrer`, SPEC §13.2), `lines` мөрөөр таслана. */
function Title({ item, size, lines, center }: { item: NewsItem; size: number; lines: number; center?: boolean }) {
  const { c } = useTheme();
  return (
    <Link
      href={item.url as Href}
      target="_blank"
      rel="noopener noreferrer"
      numberOfLines={lines}
      style={{
        ...font('bold'),
        fontSize: size,
        lineHeight: Math.round(size * 1.3),
        color: c.text,
        textDecorationLine: 'none',
        textAlign: center ? 'center' : 'left',
      }}>
      {item.title}
    </Link>
  );
}

function Featured({ item, coverHeight }: { item: NewsItem; coverHeight: number }) {
  const { c } = useTheme();
  const { isMobile } = useLayout();
  return (
    <View
      role="listitem"
      {...dataAttrs({ news: '' })}
      style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radius.lg, overflow: 'hidden', boxShadow: c.shadow }}>
      <Cover item={item} height={coverHeight} iconSize={Math.round(coverHeight * 0.36)} />
      <View style={{ padding: isMobile ? space.lg : space.xl, gap: space.sm, alignItems: 'center' }}>
        <Category item={item} center />
        <Title item={item} size={isMobile ? 21 : 26} lines={isMobile ? 4 : 3} center />
        <Meta item={item} center />
      </View>
    </View>
  );
}

function SideCard({ item }: { item: NewsItem }) {
  const { c } = useTheme();
  return (
    <View role="listitem" {...dataAttrs({ news: '' })} style={{ gap: space.sm, paddingBottom: space.lg, borderBottomWidth: 1, borderBottomColor: c.border }}>
      <Cover item={item} height={150} iconSize={56} />
      <Category item={item} />
      <Title item={item} size={18} lines={3} />
      <Meta item={item} />
    </View>
  );
}

function LatestItem({ item }: { item: NewsItem }) {
  const { c } = useTheme();
  return (
    <View
      role="listitem"
      {...dataAttrs({ news: '' })}
      style={{ flexDirection: 'row', gap: space.md, paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: c.border }}>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Category item={item} />
        <Title item={item} size={15} lines={3} />
        <Meta item={item} />
      </View>
      <View style={{ width: 96 }}>
        <Cover item={item} height={72} iconSize={30} showSource={false} />
      </View>
    </View>
  );
}

function ColumnTitle({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: space.sm, marginBottom: space.xs }}>
      <View aria-hidden style={{ width: 32, height: 3, backgroundColor: c.accent }} />
      <T v="h3" role="heading" aria-level={3}>
        {children}
      </T>
    </View>
  );
}

/** 8 мэдээ: [0] онцлох, [1–2] зүүн карт, [3–7] «Сүүлийн мэдээ». */
export function NewsMagazine({ items }: { items: NewsItem[] }) {
  const { c } = useTheme();
  const { isDesktop, isTablet } = useLayout();
  const [featured, ...rest] = items;
  if (!featured) return null;
  const side = rest.slice(0, 2);
  const latest = rest.slice(2, 7);

  const latestCol = (
    <View style={{ borderRightWidth: isDesktop ? 3 : 0, borderRightColor: c.accent, paddingRight: isDesktop ? space.lg : 0 }}>
      <ColumnTitle>{t.home.latestNews}</ColumnTitle>
      <View role="list">
        {latest.map((item) => (
          <LatestItem key={item.id} item={item} />
        ))}
      </View>
    </View>
  );
  const sideCol = (
    <View role="list" style={{ gap: space.lg, flexDirection: isTablet ? 'row' : 'column' }}>
      {side.map((item) => (
        <View key={item.id} style={isTablet ? { flex: 1 } : undefined}>
          <SideCard item={item} />
        </View>
      ))}
    </View>
  );
  const featuredEl = (
    <View role="list">
      <Featured item={featured} coverHeight={isDesktop ? 300 : 200} />
    </View>
  );

  if (isDesktop) {
    return (
      <View style={{ flexDirection: 'row', gap: space.xl, alignItems: 'flex-start' }}>
        <View style={{ flex: 3, minWidth: 0 }}>{sideCol}</View>
        <View style={{ flex: 5, minWidth: 0 }}>{featuredEl}</View>
        <View style={{ flex: 4, minWidth: 0 }}>{latestCol}</View>
      </View>
    );
  }
  return (
    <View style={{ gap: space.xl }}>
      {featuredEl}
      {sideCol}
      {latestCol}
    </View>
  );
}
