// 7 хоногийн тайлангийн автомат хэсэг (SPEC §6 WeeklyAuto, §7.3) — цэвэр функцууд.
import { weekRange } from '../../src/lib/dates';
import {
  NEWS_TAGS,
  WeeklyAutoSchema,
  type CoinMove,
  type DailyHistory,
  type NewsItem,
  type SourceStatus,
  type WeeklyAuto,
} from '../../src/types/schemas';
import type { CgCoin, CgGlobal } from '../sources/coingecko';
import type { DaySeries, StableTop } from '../sources/defillama';
import type { FearGreed } from '../sources/feargreed';
import type { Fx } from '../sources/fx';

import { suggestSentences } from './sentences';
import { makeStableDetector } from './stablecoins';

const DAY_MS = 86_400_000;
const round = (v: number, d = 2) => Number(v.toFixed(d));

export type WeeklyInputs = {
  week: string;
  now: Date;
  global: CgGlobal;
  coins: CgCoin[]; // топ 100
  charts: { BTC: Array<{ date: string; priceUsd: number }>; ETH: Array<{ date: string; priceUsd: number }> };
  tvl: { tvlUsd: number; change7dPct: number | null; series30d: DaySeries };
  stablecoins: { totalUsd: number; change7dPct: number | null; series30d: DaySeries; symbols: string[]; top: StableTop[] };
  dexs: { dexVolume7dUsd: number | null; dexChange7dPct: number | null } | null;
  fearGreed: FearGreed; // history ≥ 8 өдөр (limit=8)
  fx: Fx | null;
  trending: Array<{ symbol: string; name: string }>;
  news: NewsItem[]; // тухайн долоо хоногийн архив
  hacks: WeeklyAuto['hacks'];
  history: DailyHistory;
  sources: SourceStatus[];
};

/** Топ 100-аар 7 хоногийн өмнөх нийт үнэлгээг тооцоолно: Σmcap / Σ(mcap / (1 + 7d%/100)). */
export function top100Change7d(coins: CgCoin[]): number | null {
  let now = 0;
  let prev = 0;
  for (const c of coins.slice(0, 100)) {
    if (c.change7dPct === null || c.change7dPct <= -100) continue;
    now += c.marketCapUsd;
    prev += c.marketCapUsd / (1 + c.change7dPct / 100);
  }
  return prev > 0 ? (now / prev - 1) * 100 : null;
}

/** Лавлах өдөр = min(тасалбар, одоо)-гийн UTC өдөр; түүнээс 7 хоногийн өмнөх цэг. */
export function pointDaysBefore(history: DailyHistory, refDay: string, days: number) {
  const target = new Date(Date.parse(`${refDay}T00:00:00Z`) - days * DAY_MS).toISOString().slice(0, 10);
  return history.points.find((p) => p.date === target && !p.provisional) ?? null;
}

const move = (c: CgCoin): CoinMove => ({
  symbol: c.symbol.toUpperCase(),
  name: c.name,
  priceUsd: c.priceUsd,
  change7dPct: round(c.change7dPct ?? 0),
  marketCapUsd: c.marketCapUsd,
});

/** Ангилал бүрээс тэнцвэртэй (эхний шошгоор, round-robin), Монгол мэдээ эхэнд, шинэ нь түрүүнд. */
export function pickNewsCandidates(items: NewsItem[], limit = 15): NewsItem[] {
  const sorted = [...items].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const picked: NewsItem[] = sorted.filter((i) => i.isMongolia).slice(0, 3);
  const queues = NEWS_TAGS.map((tag) => sorted.filter((i) => i.tags[0] === tag && !picked.includes(i)));
  while (picked.length < limit && queues.some((q) => q.length > 0)) {
    for (const q of queues) {
      const next = q.shift();
      if (next && picked.length < limit) picked.push(next);
    }
  }
  return picked;
}

export function changePct(series: Array<{ priceUsd: number }>): number | null {
  if (series.length < 2 || series[0].priceUsd === 0) return null;
  return (series[series.length - 1].priceUsd / series[0].priceUsd - 1) * 100;
}

export function buildWeekly(i: WeeklyInputs): WeeklyAuto {
  const range = weekRange(i.week);
  const refDay = new Date(Math.min(i.now.getTime(), Date.parse(range.cutoffUtc))).toISOString().slice(0, 10);
  const weekAgo = pointDaysBefore(i.history, refDay, 7);

  // Нийт зах зээлийн 7 хоногийн өөрчлөлт: түүх → топ 100 тооцоо
  const total = i.global.totalMarketCapUsd;
  let total7dAgo: number | null = null;
  let change7d: number | null = null;
  let method: WeeklyAuto['global']['change7dMethod'] = null;
  if (weekAgo?.totalMarketCapUsd) {
    total7dAgo = weekAgo.totalMarketCapUsd;
    change7d = (total / total7dAgo - 1) * 100;
    method = 'history';
  } else {
    const est = top100Change7d(i.coins);
    if (est !== null) {
      change7d = est;
      total7dAgo = total / (1 + est / 100);
      method = 'top100-estimate';
    }
  }

  const isStable = makeStableDetector(i.stablecoins.symbols);
  const pool = i.coins.filter((c) => !isStable(c) && c.change7dPct !== null);
  const byChange = [...pool].sort((a, b) => (b.change7dPct ?? 0) - (a.change7dPct ?? 0));
  const usdMnt = i.fx?.usdMnt ?? null;

  const majors = (['BTC', 'ETH'] as const).flatMap((sym) => {
    const c = i.coins.find((x) => x.symbol.toUpperCase() === sym);
    if (!c) return [];
    const chart = i.charts[sym].slice(-31);
    const ch30 = changePct(chart);
    return [
      {
        symbol: sym,
        priceUsd: c.priceUsd,
        priceMnt: usdMnt === null ? null : Math.round(c.priceUsd * usdMnt),
        change7dPct: round(c.change7dPct ?? 0),
        change30dPct: ch30 === null ? null : round(ch30),
        chart30d: chart.map((p) => ({ date: p.date, priceUsd: round(p.priceUsd, 2) })),
      },
    ];
  });

  const fgHist = i.fearGreed.history;
  const series7d = fgHist.slice(-7);
  const value7dAgo = fgHist.length >= 8 ? fgHist[fgHist.length - 8].value : null;

  const base: Omit<WeeklyAuto, 'suggestedSentences'> = {
    schemaVersion: 1,
    week: i.week,
    periodStart: range.start,
    periodEnd: range.end,
    cutoffUtc: range.cutoffUtc,
    fetchedAt: i.now.toISOString(),
    global: {
      totalMarketCapUsd: total,
      totalMarketCapUsd7dAgo: total7dAgo === null ? null : Math.round(total7dAgo),
      change7dPct: change7d === null ? null : round(change7d),
      change7dMethod: method,
      btcDominancePct: round(i.global.btcDominancePct),
      btcDominancePct7dAgo: weekAgo?.btcDominancePct == null ? null : round(weekAgo.btcDominancePct),
      ethDominancePct: round(i.global.ethDominancePct),
      totalVolume24hUsd: i.global.totalVolume24hUsd,
    },
    majors,
    topGainers: byChange.slice(0, 5).map(move),
    topLosers: byChange.slice(-5).reverse().map(move),
    heatmapTop20: pool.slice(0, 20).map(move),
    stablecoins: {
      totalUsd: i.stablecoins.totalUsd,
      change7dPct: i.stablecoins.change7dPct === null ? null : round(i.stablecoins.change7dPct),
      top: i.stablecoins.top.map(({ symbol, circulatingUsd, change7dPct }) => ({
        symbol,
        circulatingUsd,
        change7dPct: change7dPct === null ? null : round(change7dPct),
      })),
      series30d: i.stablecoins.series30d,
    },
    defi: {
      tvlUsd: i.tvl.tvlUsd,
      change7dPct: i.tvl.change7dPct === null ? null : round(i.tvl.change7dPct),
      dexVolume7dUsd: i.dexs?.dexVolume7dUsd ?? null,
      dexChange7dPct: i.dexs?.dexChange7dPct ?? null,
      series30d: i.tvl.series30d,
    },
    fearGreed: { value: i.fearGreed.value, labelMn: i.fearGreed.labelMn, value7dAgo, series7d },
    fx: i.fx,
    trending: i.trending.slice(0, 7),
    newsCandidates: pickNewsCandidates(i.news),
    hacks: i.hacks,
    sources: i.sources,
  };

  return WeeklyAutoSchema.parse({ ...base, suggestedSentences: suggestSentences(base) });
}
