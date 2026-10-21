// DefiLlama (түлхүүргүй, SPEC §5.2). Live: TVL, стейблкойны нийт (chart), стейблкойны жагсаалт, DEX = 4 дуудлага.
import { z } from 'zod';

import { getJson, type HttpOptions } from '../lib/http';

const DAY = 86_400;

export const TvlSchema = z.array(z.looseObject({ date: z.number(), tvl: z.number() }));
export const StableChartSchema = z.array(
  z.looseObject({
    date: z.union([z.number(), z.string()]),
    totalCirculatingUSD: z.record(z.string(), z.number()),
  }),
);
export const StablecoinsSchema = z.looseObject({
  peggedAssets: z.array(
    z.looseObject({
      name: z.string(),
      symbol: z.string(),
      pegType: z.string().optional(),
      circulating: z.record(z.string(), z.number()).optional(),
      circulatingPrevWeek: z.record(z.string(), z.number()).optional(),
    }),
  ),
});
export const DexsSchema = z.looseObject({
  total24h: z.number().nullable().optional(),
  total7d: z.number().nullable().optional(),
  change_7dover7d: z.number().nullable().optional(),
});
export const HacksSchema = z.array(
  z.looseObject({
    date: z.number(),
    name: z.string(),
    amount: z.number().nullable().optional(),
    source: z.string().nullable().optional(),
  }),
);

const pctChange = (now: number, prev: number | undefined) =>
  prev === undefined || prev === 0 ? null : (now / prev - 1) * 100;

/** Сүүлийн цэгээс яг 7 хоногийн өмнөх (эсвэл түүнээс өмнөх хамгийн ойр) цэгийн утга. */
function valueDaysAgo(points: Array<{ t: number; v: number }>, days: number): number | undefined {
  const target = points[points.length - 1].t - days * DAY;
  let found: number | undefined;
  for (const p of points) if (p.t <= target) found = p.v;
  return found;
}

export type DaySeries = Array<{ date: string; value: number }>;

/** Сүүлийн `days` өдрийн цуваа (sparkline-д). */
function lastDays(points: Array<{ t: number; v: number }>, days: number): DaySeries {
  return points.slice(-days).map((p) => ({ date: new Date(p.t * 1000).toISOString().slice(0, 10), value: p.v }));
}

export function parseTvl(raw: unknown): { tvlUsd: number; change7dPct: number | null; series30d: DaySeries } {
  const pts = TvlSchema.parse(raw).map((p) => ({ t: p.date, v: p.tvl }));
  if (pts.length === 0) throw new Error('TVL цуваа хоосон');
  const now = pts[pts.length - 1].v;
  return { tvlUsd: now, change7dPct: pctChange(now, valueDaysAgo(pts, 7)), series30d: lastDays(pts, 30) };
}

/** Нийт = totalCirculatingUSD-ийн бүх peg-ийн нийлбэр (SPEC §5.2). */
export function parseStableChart(raw: unknown): { totalUsd: number; change7dPct: number | null; series30d: DaySeries } {
  const pts = StableChartSchema.parse(raw).map((p) => ({
    t: Number(p.date),
    v: Object.values(p.totalCirculatingUSD).reduce((s, x) => s + x, 0),
  }));
  if (pts.length === 0) throw new Error('Стейблкойны цуваа хоосон');
  const now = pts[pts.length - 1].v;
  return { totalUsd: now, change7dPct: pctChange(now, valueDaysAgo(pts, 7)), series30d: lastDays(pts, 30) };
}

export type StableTop = { symbol: string; name: string; circulatingUsd: number; change7dPct: number | null };

export function parseStablecoins(raw: unknown): { symbols: string[]; top: StableTop[] } {
  const assets = StablecoinsSchema.parse(raw).peggedAssets;
  const usd = assets
    .map((a) => ({
      symbol: a.symbol,
      name: a.name,
      circulatingUsd: a.circulating?.peggedUSD ?? 0,
      prev: a.circulatingPrevWeek?.peggedUSD,
    }))
    .filter((a) => a.circulatingUsd > 0)
    .sort((a, b) => b.circulatingUsd - a.circulatingUsd);
  return {
    symbols: [...new Set(assets.map((a) => a.symbol.toLowerCase()))],
    top: usd.slice(0, 5).map(({ symbol, name, circulatingUsd, prev }) => ({
      symbol,
      name,
      circulatingUsd,
      change7dPct: pctChange(circulatingUsd, prev),
    })),
  };
}

export function parseDexs(raw: unknown): {
  dexVolume24hUsd: number | null;
  dexVolume7dUsd: number | null;
  dexChange7dPct: number | null;
} {
  const d = DexsSchema.parse(raw);
  return { dexVolume24hUsd: d.total24h ?? null, dexVolume7dUsd: d.total7d ?? null, dexChange7dPct: d.change_7dover7d ?? null };
}

/** Тухайн [fromSec, toSec] хоорондох хакердалт (7 хоногийн тайланд, SPEC §5.2). */
export function parseHacks(raw: unknown, fromSec: number, toSec: number) {
  return HacksSchema.parse(raw)
    .filter((h) => h.date >= fromSec && h.date <= toSec)
    .sort((a, b) => b.date - a.date)
    .map((h) => ({
      name: h.name,
      date: new Date(h.date * 1000).toISOString().slice(0, 10),
      amountUsd: h.amount ?? null,
      ...(h.source?.startsWith('https://') ? { url: h.source } : {}),
    }));
}

export const DEFILLAMA = {
  tvl: 'https://api.llama.fi/v2/historicalChainTvl',
  stableChart: 'https://stablecoins.llama.fi/stablecoincharts/all',
  stablecoins: 'https://stablecoins.llama.fi/stablecoins?includePrices=true',
  dexs: 'https://api.llama.fi/overview/dexs?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true',
  hacks: 'https://api.llama.fi/hacks',
} as const;

export async function fetchTvl(http: HttpOptions = {}) {
  return parseTvl(await getJson(DEFILLAMA.tvl, http));
}

export async function fetchStablecoins(http: HttpOptions = {}) {
  const [chart, list] = await Promise.all([getJson(DEFILLAMA.stableChart, http), getJson(DEFILLAMA.stablecoins, http)]);
  return { ...parseStableChart(chart), ...parseStablecoins(list) };
}

export async function fetchDexs(http: HttpOptions = {}) {
  return parseDexs(await getJson(DEFILLAMA.dexs, http));
}

/** Хакердалт (сонголттой): алдаа гарвал null — тайлан үргэлжилнэ. */
export async function fetchHacks(fromSec: number, toSec: number, http: HttpOptions = {}) {
  return parseHacks(await getJson(DEFILLAMA.hacks, http), fromSec, toSec);
}
