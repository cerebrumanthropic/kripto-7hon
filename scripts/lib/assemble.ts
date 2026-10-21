// Эх сурвалжуудын үр дүнг market.json болгон нэгтгэнэ (SPEC §6, §7.2).
// Бүтэлгүйтсэн эх сурвалж → өмнөх утга + stale:true (CLAUDE.md дүрэм 8).
import type { LiveMarket, SourceStatus } from '../../src/types/schemas';
import type { CoinGeckoLive } from '../sources/coingecko';
import type { StableTop } from '../sources/defillama';
import type { FearGreed } from '../sources/feargreed';
import type { Fx } from '../sources/fx';

import type { DailyValues } from './history';
import { makeStableDetector } from './stablecoins';

export type Outcome<T> = { ok: true; value: T } | { ok: false; error: string };

export type MarketInputs = {
  coingecko: Outcome<CoinGeckoLive>;
  tvl: Outcome<{ tvlUsd: number; change7dPct: number | null }>;
  stablecoins: Outcome<{ totalUsd: number; change7dPct: number | null; symbols: string[]; top: StableTop[] }>;
  dexs: Outcome<{ dexVolume24hUsd: number | null; dexVolume7dUsd: number | null }>;
  feargreed: Outcome<FearGreed>;
  fx: Outcome<Fx>;
};

/** SourceStatus.id ↔ inputs-ийн түлхүүр */
export const MARKET_SOURCE_IDS = {
  coingecko: 'coingecko',
  tvl: 'defillama-tvl',
  stablecoins: 'defillama-stablecoins',
  dexs: 'defillama-dexs',
  feargreed: 'feargreed',
  fx: 'fx',
} as const satisfies Record<keyof MarketInputs, string>;

export const TOP_COINS = 50;
export const TRENDING_MAX = 7;

const round = (v: number, d: number) => Number(v.toFixed(d));

export function sourceStatus(
  id: string,
  outcome: Outcome<unknown>,
  now: string,
  prev: LiveMarket | { updatedAt: string; sources: SourceStatus[] } | null,
  hasPrevValue: boolean,
): SourceStatus {
  if (outcome.ok) return { id, ok: true, fetchedAt: now };
  const prevStatus = prev?.sources.find((s) => s.id === id);
  return {
    id,
    ok: false,
    // Харуулж буй өгөгдлийг хэзээ татсан нь
    fetchedAt: hasPrevValue ? (prevStatus?.fetchedAt ?? prev?.updatedAt ?? now) : now,
    ...(hasPrevValue ? { stale: true } : {}),
    error: outcome.error,
  };
}

export function buildMarket(inputs: MarketInputs, prev: LiveMarket | null, now: Date): LiveMarket {
  const nowIso = now.toISOString();
  const { coingecko: cg, tvl, stablecoins: st, dexs, feargreed: fg, fx } = inputs;

  const fxValue = fx.ok ? fx.value : (prev?.fx ?? null);
  const usdMnt = fxValue?.usdMnt ?? null;
  const mnt = (usd: number) => (usdMnt === null ? null : round(usd * usdMnt, usd * usdMnt < 100 ? 4 : 0));

  const stableSymbols = st.ok
    ? st.value.symbols
    : (prev?.coins.filter((c) => c.isStablecoin).map((c) => c.symbol) ?? []);
  const isStable = makeStableDetector(stableSymbols);

  const coins: LiveMarket['coins'] = cg.ok
    ? cg.value.coins.slice(0, TOP_COINS).map((c) => ({
        id: c.id,
        symbol: c.symbol,
        name: c.name,
        rank: c.rank,
        priceUsd: c.priceUsd,
        priceMnt: mnt(c.priceUsd),
        change24hPct: c.change24hPct,
        change7dPct: c.change7dPct,
        marketCapUsd: c.marketCapUsd,
        volume24hUsd: c.volume24hUsd,
        isStablecoin: isStable(c),
      }))
    : (prev?.coins ?? []).map((c) => ({ ...c, priceMnt: fx.ok ? mnt(c.priceUsd) : c.priceMnt }));

  const prevDefi = prev?.defi ?? null;
  let defi: LiveMarket['defi'] = null;
  const tvlUsd = tvl.ok ? tvl.value.tvlUsd : prevDefi?.tvlUsd;
  if (tvlUsd !== undefined) {
    defi = {
      tvlUsd,
      change7dPct: tvl.ok ? tvl.value.change7dPct : (prevDefi?.change7dPct ?? null),
      dexVolume24hUsd: dexs.ok ? dexs.value.dexVolume24hUsd : (prevDefi?.dexVolume24hUsd ?? null),
      dexVolume7dUsd: dexs.ok ? dexs.value.dexVolume7dUsd : (prevDefi?.dexVolume7dUsd ?? null),
    };
  }

  const has = {
    coingecko: Boolean(prev?.global),
    tvl: prevDefi !== null,
    stablecoins: Boolean(prev?.stablecoins),
    dexs: prevDefi?.dexVolume24hUsd != null,
    feargreed: Boolean(prev?.fearGreed),
    fx: Boolean(prev?.fx),
  };

  const sources = (Object.keys(MARKET_SOURCE_IDS) as Array<keyof MarketInputs>).map((k) =>
    sourceStatus(MARKET_SOURCE_IDS[k], inputs[k], nowIso, prev, has[k]),
  );

  return {
    schemaVersion: 1,
    updatedAt: nowIso,
    sources,
    global: cg.ok ? cg.value.global : (prev?.global ?? null),
    coins,
    trending: cg.ok ? cg.value.trending.slice(0, TRENDING_MAX) : (prev?.trending ?? []),
    fearGreed: fg.ok ? fg.value : (prev?.fearGreed ?? null),
    stablecoins: st.ok
      ? { totalUsd: st.value.totalUsd, change7dPct: st.value.change7dPct, top: st.value.top }
      : (prev?.stablecoins ?? null),
    defi,
    fx: fxValue,
  };
}

/** Өдрийн цэгийн утгууд — зөвхөн энэ ажиллалтад шинээр татсан эх сурвалжаас (хоцорсон утга түүх рүү орохгүй). */
export function dailyValues(m: LiveMarket, inputs: MarketInputs): DailyValues {
  const cg = inputs.coingecko.ok;
  const btc = m.coins.find((c) => c.symbol === 'btc');
  const eth = m.coins.find((c) => c.symbol === 'eth');
  return {
    totalMarketCapUsd: cg ? (m.global?.totalMarketCapUsd ?? null) : null,
    totalVolume24hUsd: cg ? (m.global?.totalVolume24hUsd ?? null) : null,
    btcDominancePct: cg ? (m.global?.btcDominancePct ?? null) : null,
    btcUsd: cg ? (btc?.priceUsd ?? null) : null,
    ethUsd: cg ? (eth?.priceUsd ?? null) : null,
    stablecoinsUsd: inputs.stablecoins.ok ? (m.stablecoins?.totalUsd ?? null) : null,
    defiTvlUsd: inputs.tvl.ok ? (m.defi?.tvlUsd ?? null) : null,
    fearGreed: inputs.feargreed.ok ? (m.fearGreed?.value ?? null) : null,
    usdMnt: inputs.fx.ok ? (m.fx?.usdMnt ?? null) : null,
  };
}

export const allMarketSourcesFailed = (inputs: MarketInputs) => Object.values(inputs).every((o) => !o.ok);
