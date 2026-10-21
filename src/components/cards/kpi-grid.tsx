import { View } from 'react-native';

import { LiveStatus, LoadError } from '@/components/layout/live-status';
import { Attribution } from '@/components/ui/attribution';
import { Grid, T } from '@/components/ui/primitives';
import { useMarket } from '@/lib/data-client';
import { groupDigits, mnt, pctPlain, price, usdCompact } from '@/lib/format';
import { fearGreedMn, t } from '@/lib/i18n-mn';
import type { LiveMarket } from '@/types/schemas';
import { space } from '@/theme/tokens';
import { useLayout } from '@/theme/use-theme';

import { KpiCard } from './cards';

/** Нүүрний 8 KPI карт (SPEC §8.1.2). */
export function KpiGrid({ snapshot }: { snapshot?: LiveMarket | null }) {
  const { data, isError, isPlaceholderData } = useMarket(snapshot);
  const { cols } = useLayout();
  if (isError) return <LoadError />;

  const m = data?.data;
  const btc = m?.coins.find((x) => x.symbol === 'btc');
  const eth = m?.coins.find((x) => x.symbol === 'eth');
  const k = t.kpi;

  return (
    <View style={{ gap: space.md }}>
      <LiveStatus updatedAt={m?.updatedAt} origin={data?.origin} sources={m?.sources} pending={isPlaceholderData} />
      <Grid cols={cols}>
        {[
          <KpiCard
            key="mcap"
            label={k.totalMcap}
            value={usdCompact(m?.global?.totalMarketCapUsd)}
            delta={m?.global?.marketCapChange24hPct ?? null}
            deltaLabel={k.change24h}
          />,
          <KpiCard
            key="btc"
            label={k.btc}
            value={price(btc?.priceUsd)}
            sub={mnt(btc?.priceMnt)}
            delta={btc?.change24hPct ?? null}
            deltaLabel={k.change24h}
          />,
          <KpiCard
            key="eth"
            label={k.eth}
            value={price(eth?.priceUsd)}
            sub={mnt(eth?.priceMnt)}
            delta={eth?.change24hPct ?? null}
            deltaLabel={k.change24h}
          />,
          <KpiCard key="dom" label={k.btcDominance} value={pctPlain(m?.global?.btcDominancePct)} />,
          <KpiCard
            key="fg"
            label={k.fearGreed}
            value={m?.fearGreed ? String(m.fearGreed.value) : '—'}
            sub={m?.fearGreed ? fearGreedMn(m.fearGreed.labelEn) : undefined}
            footer={<Attribution sources={['alternative']} />}
          />,
          <KpiCard
            key="stable"
            label={k.stablecoins}
            value={usdCompact(m?.stablecoins?.totalUsd)}
            delta={m?.stablecoins?.change7dPct ?? null}
            deltaLabel={k.change7d}
          />,
          <KpiCard
            key="tvl"
            label={k.defiTvl}
            value={usdCompact(m?.defi?.tvlUsd)}
            delta={m?.defi?.change7dPct ?? null}
            deltaLabel={k.change7d}
          />,
          <KpiCard
            key="fx"
            label={k.usdMnt}
            value={m?.fx ? `${groupDigits(m.fx.usdMnt, 2)} ₮` : '—'}
            note={k.usdMntNote}
            footer={<Attribution sources={['exchangerate']} />}
          />,
        ]}
      </Grid>
      <Attribution sources={['coingecko', 'defillama']} />
      {!m ? (
        <T v="small" color="textMuted">
          {t.live.loading}
        </T>
      ) : null}
    </View>
  );
}
