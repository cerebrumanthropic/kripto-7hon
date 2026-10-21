// CoinGecko Demo API (SPEC §5.1). Live: /global, /coins/markets, /search/trending = 3 дуудлага.
import { z } from 'zod';

import type { CallBudget } from '../lib/budget';
import { getJson, type HttpOptions } from '../lib/http';

export const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

const num = z.number();
const optNum = z.number().nullable().optional();

export const CgGlobalSchema = z.looseObject({
  data: z.looseObject({
    total_market_cap: z.looseObject({ usd: num }),
    total_volume: z.looseObject({ usd: num }),
    market_cap_percentage: z.looseObject({ btc: num, eth: num }),
    market_cap_change_percentage_24h_usd: num,
    active_cryptocurrencies: num,
  }),
});

export const CgMarketsSchema = z.array(
  z.looseObject({
    id: z.string(),
    symbol: z.string(),
    name: z.string(),
    current_price: z.number().nullable(),
    market_cap: z.number().nullable(),
    market_cap_rank: z.number().nullable(),
    total_volume: z.number().nullable(),
    price_change_percentage_24h_in_currency: optNum,
    price_change_percentage_7d_in_currency: optNum,
  }),
);

export const CgTrendingSchema = z.looseObject({
  coins: z.array(
    z.looseObject({
      item: z.looseObject({
        id: z.string(),
        symbol: z.string(),
        name: z.string(),
        market_cap_rank: z.number().nullable().optional(),
      }),
    }),
  ),
});

export const CgMarketChartSchema = z.looseObject({
  prices: z.array(z.tuple([num, num])),
});

export type CgGlobal = {
  totalMarketCapUsd: number;
  totalVolume24hUsd: number;
  marketCapChange24hPct: number;
  btcDominancePct: number;
  ethDominancePct: number;
  activeCryptocurrencies: number;
};

export type CgCoin = {
  id: string;
  symbol: string;
  name: string;
  rank: number;
  priceUsd: number;
  marketCapUsd: number;
  volume24hUsd: number;
  change24hPct: number | null;
  change7dPct: number | null;
};

export type CgTrending = Array<{ id: string; symbol: string; name: string; rank: number | null }>;

export function parseGlobal(raw: unknown): CgGlobal {
  const d = CgGlobalSchema.parse(raw).data;
  return {
    totalMarketCapUsd: d.total_market_cap.usd,
    totalVolume24hUsd: d.total_volume.usd,
    marketCapChange24hPct: d.market_cap_change_percentage_24h_usd,
    btcDominancePct: d.market_cap_percentage.btc,
    ethDominancePct: d.market_cap_percentage.eth,
    activeCryptocurrencies: d.active_cryptocurrencies,
  };
}

/** Үнэ/үнэлгээ/эрэмбэгүй мөрийг хасна; эрэмбээр эрэмбэлнэ. */
export function parseMarkets(raw: unknown): CgCoin[] {
  return CgMarketsSchema.parse(raw)
    .filter((c) => c.current_price !== null && c.market_cap !== null && c.market_cap_rank !== null)
    .map((c) => ({
      id: c.id,
      symbol: c.symbol,
      name: c.name,
      rank: c.market_cap_rank!,
      priceUsd: c.current_price!,
      marketCapUsd: c.market_cap!,
      volume24hUsd: c.total_volume ?? 0,
      change24hPct: c.price_change_percentage_24h_in_currency ?? null,
      change7dPct: c.price_change_percentage_7d_in_currency ?? null,
    }))
    .sort((a, b) => a.rank - b.rank);
}

export function parseTrending(raw: unknown): CgTrending {
  return CgTrendingSchema.parse(raw).coins.map(({ item }) => ({
    id: item.id,
    symbol: item.symbol,
    name: item.name,
    rank: item.market_cap_rank ?? null,
  }));
}

/** [ms, price][] → өдрийн цуваа (UTC огноогоор, өдөрт сүүлийн утга). */
export function parseMarketChart(raw: unknown): Array<{ date: string; priceUsd: number }> {
  const byDay = new Map<string, number>();
  for (const [ms, p] of CgMarketChartSchema.parse(raw).prices) {
    byDay.set(new Date(ms).toISOString().slice(0, 10), p);
  }
  return [...byDay].map(([date, priceUsd]) => ({ date, priceUsd }));
}

export type CoinGeckoLive = { global: CgGlobal; coins: CgCoin[]; trending: CgTrending };

export async function fetchCoinGeckoLive(apiKey: string | undefined, budget: CallBudget, http: HttpOptions = {}): Promise<CoinGeckoLive> {
  if (!apiKey) throw new Error('COINGECKO_DEMO_API_KEY тохируулаагүй');
  const opts: HttpOptions = { ...http, headers: { ...http.headers, 'x-cg-demo-api-key': apiKey } };
  const call = (label: string, path: string) => {
    budget.use(label);
    return getJson(`${COINGECKO_BASE}${path}`, opts);
  };
  // Дараалан дуудна: минутын хязгаарт өртөхгүй, төсөв тодорхой
  const global = parseGlobal(await call('global', '/global'));
  const coins = parseMarkets(
    await call(
      'markets',
      '/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&price_change_percentage=24h,7d&sparkline=false',
    ),
  );
  const trending = parseTrending(await call('trending', '/search/trending'));
  return { global, coins, trending };
}
