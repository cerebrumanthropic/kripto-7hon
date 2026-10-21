import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Delta, T, webPress } from '@/components/ui/primitives';
import { sortCoins, topByRank, type SortKey } from '@/lib/coins';
import { mnt, price, usdCompact } from '@/lib/format';
import { t } from '@/lib/i18n-mn';
import type { LiveCoin } from '@/types/schemas';
import { radius, space } from '@/theme/tokens';
import { useLayout, useTheme } from '@/theme/use-theme';

import { CoinBadge } from './cards';


const COLS: Array<{ key: SortKey | 'name' | 'priceMnt'; label: string; flex: number; align: 'left' | 'right' }> = [
  { key: 'rank', label: t.market.cols.rank, flex: 0.4, align: 'left' },
  { key: 'name', label: t.market.cols.name, flex: 2, align: 'left' },
  { key: 'priceUsd', label: t.market.cols.priceUsd, flex: 1.2, align: 'right' },
  { key: 'priceMnt', label: t.market.cols.priceMnt, flex: 1.4, align: 'right' },
  { key: 'change24hPct', label: t.market.cols.ch24, flex: 1, align: 'right' },
  { key: 'change7dPct', label: t.market.cols.ch7, flex: 1, align: 'right' },
  { key: 'marketCapUsd', label: t.market.cols.mcap, flex: 1.5, align: 'right' },
  { key: 'volume24hUsd', label: t.market.cols.vol, flex: 1.4, align: 'right' },
];


function MobileRow({ c: coin }: { c: LiveCoin }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: c.border, paddingVertical: space.sm }}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`${coin.name} — ${open ? t.market.hide : t.market.details}`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <CoinBadge symbol={coin.symbol} stable={coin.isStablecoin} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T v="smallStrong" numberOfLines={1}>
            {coin.name}
          </T>
          <T v="caption" color="textMuted">
            #{coin.rank} · {coin.symbol.toUpperCase()}
          </T>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <T v="smallStrong" num>
            {price(coin.priceUsd)}
          </T>
          <Delta value={coin.change7dPct} v="caption" />
        </View>
        <T v="caption" color="textMuted" style={{ width: 14, textAlign: 'center' }}>
          {open ? '−' : '+'}
        </T>
      </Pressable>
      {open ? (
        <View style={{ paddingLeft: 36, paddingTop: space.sm, gap: 2 }}>
          {[
            [t.market.cols.priceMnt, mnt(coin.priceMnt)],
            [t.market.cols.mcap, usdCompact(coin.marketCapUsd)],
            [t.market.cols.vol, usdCompact(coin.volume24hUsd)],
          ].map(([k, v]) => (
            <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T v="caption" color="textMuted">
                {k}
              </T>
              <T v="caption" num>
                {v}
              </T>
            </View>
          ))}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T v="caption" color="textMuted">
              {t.market.cols.ch24}
            </T>
            <Delta value={coin.change24hPct} v="caption" />
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** Топ 20 хүснэгт (SPEC §8.2). Мобайлд Нэр/Үнэ/7 хоног, бусад нь «дэлгэрэнгүй». */
export function CoinTable({ coins }: { coins: LiveCoin[] }) {
  const { c } = useTheme();
  const { isMobile } = useLayout();
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: 'rank', asc: true });
  // Эхлээд зах зээлийн үнэлгээгээр топ 20-ийг сонгоод, дараа нь тэр дотроо эрэмбэлнэ
  const top20 = useMemo(() => topByRank(coins), [coins]);
  const rows = useMemo(() => sortCoins(top20, sort.key, sort.asc), [top20, sort]);

  if (isMobile) {
    return (
      <View role="list">
        {top20.map((coin) => (
          <MobileRow key={coin.id} c={coin} />
        ))}
      </View>
    );
  }

  const onSort = (key: SortKey) =>
    setSort((s) => ({ key, asc: s.key === key ? !s.asc : key === 'rank' }));

  return (
    <View role="table" aria-label={t.market.top20}>
      <View role="row" style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: c.borderStrong, paddingBottom: space.sm }}>
        {COLS.map((col) => {
          const sortable = col.key !== 'name' && col.key !== 'priceMnt';
          const active = sort.key === col.key;
          const label = `${col.label}${active ? (sort.asc ? ' ↑' : ' ↓') : ''}`;
          return (
            <View key={col.key} role="columnheader" style={{ flex: col.flex }}>
              {sortable ? (
                <Pressable
                  onPress={() => onSort(col.key as SortKey)}
                  aria-label={t.market.sortBy(col.label)}
                  aria-sort={active ? (sort.asc ? 'ascending' : 'descending') : 'none'}
                  style={(s) => ({
                    alignSelf: col.align === 'right' ? 'flex-end' : 'flex-start',
                    borderRadius: radius.sm,
                    paddingHorizontal: 2,
                    outlineColor: c.brand,
                    outlineWidth: webPress(s).focused ? 2 : 0,
                    outlineStyle: 'solid',
                  })}>
                  <T v="caption" color={active ? 'brandText' : 'textMuted'} style={{ fontWeight: '600' }}>
                    {label}
                  </T>
                </Pressable>
              ) : (
                <T v="caption" color="textMuted" style={{ fontWeight: '600', textAlign: col.align }}>
                  {col.label}
                </T>
              )}
            </View>
          );
        })}
      </View>
      {rows.map((coin) => (
        <View
          key={coin.id}
          role="row"
          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: c.border }}>
          <T v="small" color="textMuted" num style={{ flex: 0.4 }}>
            {coin.rank}
          </T>
          <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: space.sm, minWidth: 0 }}>
            <CoinBadge symbol={coin.symbol} stable={coin.isStablecoin} />
            <T v="smallStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
              {coin.name}{' '}
              <T v="caption" color="textMuted">
                {coin.symbol.toUpperCase()}
              </T>
            </T>
          </View>
          <T v="small" num style={{ flex: 1.2, textAlign: 'right' }}>
            {price(coin.priceUsd)}
          </T>
          <T v="small" num color="textMuted" style={{ flex: 1.4, textAlign: 'right' }}>
            {mnt(coin.priceMnt)}
          </T>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Delta value={coin.change24hPct} v="small" />
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Delta value={coin.change7dPct} v="small" />
          </View>
          <T v="small" num style={{ flex: 1.5, textAlign: 'right' }}>
            {usdCompact(coin.marketCapUsd)}
          </T>
          <T v="small" num color="textMuted" style={{ flex: 1.4, textAlign: 'right' }}>
            {usdCompact(coin.volume24hUsd)}
          </T>
        </View>
      ))}
    </View>
  );
}
