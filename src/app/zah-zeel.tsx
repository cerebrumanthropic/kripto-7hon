import type { ReactNode } from 'react';
import { View } from 'react-native';

import { CoinTable } from '@/components/cards/coin-table';
import { BarList } from '@/components/charts/bar-list';
import { Gauge } from '@/components/charts/gauge';
import { LineChart } from '@/components/charts/line-chart';
import { Sparkline } from '@/components/charts/sparkline';
import { LiveStatus, LoadError } from '@/components/layout/live-status';
import { Page } from '@/components/layout/page';
import { Attribution } from '@/components/ui/attribution';
import { Card, Delta, Grid, SectionHeader, T } from '@/components/ui/primitives';
import { formatDay } from '@/lib/dates';
import { useHistory, useMarket } from '@/lib/data-client';
import { usdCompact } from '@/lib/format';
import { fearGreedMn, t } from '@/lib/i18n-mn';
import { pageMeta } from '@/lib/meta';
import type { DailyPoint, LiveMarket } from '@/types/schemas';
import { space } from '@/theme/tokens';
import { useLayout, useTheme } from '@/theme/use-theme';

export function generateMetadata() {
  return pageMeta(t.market.title, t.market.lead, '/zah-zeel');
}

function Movers({ m }: { m: LiveMarket }) {
  const { cols } = useLayout();
  const pool = m.coins.filter((c) => !c.isStablecoin && c.change7dPct !== null && c.rank <= 100);
  const sorted = [...pool].sort((a, b) => (b.change7dPct ?? 0) - (a.change7dPct ?? 0));
  const toItem = (c: (typeof pool)[number]) => ({
    key: c.id,
    label: c.symbol.toUpperCase(),
    sub: c.name,
    value: c.change7dPct ?? 0,
  });
  return (
    <Grid cols={cols >= 2 ? 3 : 1}>
      {[
        <Card key="g" style={{ gap: space.md }}>
          <T v="h3">{t.market.gainers}</T>
          <BarList label={t.market.gainers} items={sorted.slice(0, 5).map(toItem)} />
        </Card>,
        <Card key="l" style={{ gap: space.md }}>
          <T v="h3">{t.market.losers}</T>
          <BarList label={t.market.losers} items={sorted.slice(-5).reverse().map(toItem)} />
        </Card>,
        <Card key="t" style={{ gap: space.sm }}>
          <T v="h3">{t.market.trending}</T>
          {m.trending.map((x, i) => (
            <View key={x.id} style={{ flexDirection: 'row', gap: space.sm, alignItems: 'baseline' }}>
              <T v="small" color="textMuted" num style={{ width: 18 }}>
                {i + 1}.
              </T>
              <T v="smallStrong" style={{ flex: 1 }} numberOfLines={1}>
                {x.name}{' '}
                <T v="caption" color="textMuted">
                  {x.symbol.toUpperCase()}
                  {x.rank ? ` · #${x.rank}` : ''}
                </T>
              </T>
            </View>
          ))}
        </Card>,
      ]}
    </Grid>
  );
}

function HistoryCard({
  title,
  value,
  delta,
  points,
  pick,
  color,
  extra,
}: {
  title: string;
  value: string;
  delta: number | null;
  points: DailyPoint[];
  pick: (p: DailyPoint) => number | null;
  color: string;
  extra?: ReactNode;
}) {
  const series = points.map(pick).filter((v): v is number => v !== null);
  return (
    <Card style={{ gap: space.xs, height: '100%' }}>
      <T v="small" color="textMuted">
        {title}
      </T>
      <T v="kpi" num>
        {value}
      </T>
      <Delta value={delta} suffix={t.kpi.change7d} />
      <Sparkline values={series} color={color} label={`${title} — ${t.market.history}`} />
      {extra}
    </Card>
  );
}

export default function Market() {
  const { data, isError } = useMarket();
  const history = useHistory();
  const { c } = useTheme();
  const { cols, isDesktop } = useLayout();
  const m = data?.data;
  const points = history.data?.data.points ?? [];

  return (
    <Page
      title={t.market.title}
      lead={t.market.lead}
      meta={<LiveStatus updatedAt={m?.updatedAt} origin={data?.origin} sources={m?.sources} />}>
      {isError ? <LoadError /> : null}
      {m ? (
        <>
          <View>
            <SectionHeader title={t.market.top20} />
            <Card>
              {m.coins.length > 0 ? (
                <CoinTable coins={m.coins} />
              ) : (
                <T v="small" color="textMuted">
                  {t.live.noData}
                </T>
              )}
              <Attribution sources={['coingecko', 'exchangerate']} />
            </Card>
          </View>

          {m.coins.length > 0 ? (
            <View>
              <Movers m={m} />
              <Attribution sources={['coingecko']} />
            </View>
          ) : null}

          {m.fearGreed ? (
            <View>
              <SectionHeader title={t.market.fearGreed} />
              <Card style={{ flexDirection: isDesktop ? 'row' : 'column', gap: space.xl, alignItems: isDesktop ? 'center' : 'stretch' }}>
                <View style={{ alignItems: 'center' }}>
                  <Gauge value={m.fearGreed.value} label={fearGreedMn(m.fearGreed.labelEn)} />
                  <Attribution sources={['alternative']} />
                </View>
                <View style={{ flex: 1, gap: space.sm }}>
                  <T v="h3">{t.market.fearGreed30d}</T>
                  <LineChart
                    label={`${t.market.fearGreed} — ${t.market.fearGreed30d}`}
                    series={[{ name: t.market.fearGreed, color: c.brand, values: m.fearGreed.history.map((h) => h.value) }]}
                    dates={m.fearGreed.history.map((h) => formatDay(h.date))}
                    formatY={(v) => v.toFixed(0)}
                    height={180}
                  />
                </View>
              </Card>
            </View>
          ) : null}

          <View>
            <SectionHeader title={`${t.market.stablecoins} · ${t.market.defi}`} />
            <Grid cols={cols >= 2 ? 3 : 1}>
              {[
                <HistoryCard
                  key="s"
                  title={t.kpi.stablecoins}
                  value={usdCompact(m.stablecoins?.totalUsd)}
                  delta={m.stablecoins?.change7dPct ?? null}
                  points={points}
                  pick={(p) => p.stablecoinsUsd}
                  color={c.stable}
                  extra={
                    <View style={{ marginTop: space.sm, gap: 4 }}>
                      <T v="label" color="textMuted">
                        {t.market.stableTop}
                      </T>
                      {m.stablecoins?.top.map((s) => (
                        <View key={s.symbol} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
                          <T v="small">{s.symbol}</T>
                          <T v="small" num>
                            {usdCompact(s.circulatingUsd)}
                          </T>
                          <Delta value={s.change7dPct} v="caption" />
                        </View>
                      ))}
                    </View>
                  }
                />,
                <HistoryCard
                  key="tvl"
                  title={t.market.tvl}
                  value={usdCompact(m.defi?.tvlUsd)}
                  delta={m.defi?.change7dPct ?? null}
                  points={points}
                  pick={(p) => p.defiTvlUsd}
                  color={c.brand}
                />,
                <Card key="dex" style={{ gap: space.md, height: '100%' }}>
                  <View>
                    <T v="small" color="textMuted">
                      {t.market.dex24}
                    </T>
                    <T v="kpi" num>
                      {usdCompact(m.defi?.dexVolume24hUsd)}
                    </T>
                  </View>
                  <View>
                    <T v="small" color="textMuted">
                      {t.market.dex7}
                    </T>
                    <T v="kpi" num>
                      {usdCompact(m.defi?.dexVolume7dUsd)}
                    </T>
                  </View>
                </Card>,
              ]}
            </Grid>
            <Attribution sources={['defillama']} />
          </View>
        </>
      ) : null}
    </Page>
  );
}
