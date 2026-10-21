import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import type { NewsItem } from '../../src/types/schemas';
import { parseGlobal, parseMarketChart, parseMarkets } from '../sources/coingecko';
import { parseStableChart, parseStablecoins, parseTvl } from '../sources/defillama';
import { parseFearGreed } from '../sources/feargreed';
import { parseFx } from '../sources/fx';

import { parseEditorial } from './reports';
import { reportMarkdown } from './report-md';
import { buildWeekly, pickNewsCandidates, pointDaysBefore, top100Change7d, type WeeklyInputs } from './weekly';

const fx = (name: string) =>
  JSON.parse(readFileSync(path.join(process.cwd(), 'scripts', '__fixtures__', name), 'utf8')) as unknown;

const news = (id: string, tag: NewsItem['tags'][number], at: string, mn = false): NewsItem => ({
  id: id.padEnd(12, '0'),
  title: `Title ${id}`,
  url: `https://n.example/${id}`,
  source: 'N',
  sourceUrl: 'https://n.example',
  publishedAt: at,
  tags: [tag],
  isMongolia: mn,
});

const btcChart = parseMarketChart(fx('coingecko-market-chart-bitcoin.json'));

const inputs = (over: Partial<WeeklyInputs> = {}): WeeklyInputs => ({
  week: '2026-W43',
  now: new Date('2026-10-21T08:00:00Z'),
  global: parseGlobal(fx('coingecko-global.json')),
  coins: parseMarkets(fx('coingecko-markets.json')),
  charts: { BTC: btcChart, ETH: btcChart.map((p) => ({ ...p, priceUsd: p.priceUsd / 30 })) },
  tvl: parseTvl(fx('defillama-historicalChainTvl.json')),
  stablecoins: { ...parseStableChart(fx('defillama-stablecoincharts-all.json')), ...parseStablecoins(fx('defillama-stablecoins.json')) },
  dexs: { dexVolume7dUsd: 5e10, dexChange7dPct: -1 },
  fearGreed: parseFearGreed(fx('feargreed.json'), 8),
  fx: parseFx(fx('fx-open-er-api.json')),
  trending: [{ symbol: 'sui', name: 'Sui' }],
  news: [news('a', 'etf', '2026-10-20T01:00:00Z'), news('b', 'market', '2026-10-20T02:00:00Z')],
  hacks: null,
  history: { schemaVersion: 1, points: [] },
  sources: [],
  ...over,
});

describe('weekly', () => {
  it('top100Change7d', () => {
    const c = (mcap: number, ch: number | null) =>
      ({ marketCapUsd: mcap, change7dPct: ch }) as Parameters<typeof top100Change7d>[0][number];
    // 110 (өмнө 100) + 90 (өмнө 100) → 200/200 = 0%
    expect(top100Change7d([c(110, 10), c(90, -10)])).toBeCloseTo(0);
    expect(top100Change7d([c(110, 10), c(5, null)])).toBeCloseTo(10);
    expect(top100Change7d([])).toBeNull();
  });

  it('түүх байхгүй → top100-estimate', () => {
    const w = buildWeekly(inputs());
    expect(w.global.change7dMethod).toBe('top100-estimate');
    expect(w.global.totalMarketCapUsd7dAgo).not.toBeNull();
    expect(w.periodStart).toBe('2026-10-19');
    expect(w.cutoffUtc).toBe('2026-10-25T23:59:59Z');
  });

  it('түүхэнд 7 хоногийн өмнөх цэг байвал history (лавлах өдөр = min(тасалбар, одоо))', () => {
    const point = {
      date: '2026-10-14',
      totalMarketCapUsd: 2.5e12,
      totalVolume24hUsd: null,
      btcDominancePct: 58.123,
      btcUsd: null,
      ethUsd: null,
      stablecoinsUsd: null,
      defiTvlUsd: null,
      fearGreed: null,
      usdMnt: null,
    };
    const w = buildWeekly(inputs({ history: { schemaVersion: 1, points: [point] } }));
    expect(w.global.change7dMethod).toBe('history');
    expect(w.global.totalMarketCapUsd7dAgo).toBe(2.5e12);
    expect(w.global.btcDominancePct7dAgo).toBe(58.12);
    expect(pointDaysBefore({ schemaVersion: 1, points: [{ ...point, provisional: true }] }, '2026-10-21', 7)).toBeNull();
  });

  it('өсөлт/бууралт стейблкойнгүй, 5-аад, heatmap 20, majors', () => {
    const w = buildWeekly(inputs());
    expect(w.topGainers).toHaveLength(5);
    expect(w.topLosers).toHaveLength(5);
    expect(w.heatmapTop20).toHaveLength(20);
    expect([...w.topGainers, ...w.topLosers, ...w.heatmapTop20].some((m) => ['USDT', 'USDC'].includes(m.symbol))).toBe(false);
    expect(w.topGainers[0].change7dPct).toBeGreaterThanOrEqual(w.topGainers[4].change7dPct);
    expect(w.topLosers[0].change7dPct).toBeLessThanOrEqual(w.topLosers[4].change7dPct);
    expect(w.majors.map((m) => m.symbol)).toEqual(['BTC', 'ETH']);
    expect(w.majors[0].chart30d.length).toBeGreaterThanOrEqual(30);
    expect(w.majors[0].priceMnt).toBeGreaterThan(w.majors[0].priceUsd);
  });

  it('F&G: 7 хоногийн өмнөх утга ба 7 цэг', () => {
    const w = buildWeekly(inputs());
    expect(w.fearGreed.series7d).toHaveLength(7);
    expect(w.fearGreed.value7dAgo).not.toBeNull();
    expect(w.fearGreed.series7d.at(-1)!.value).toBe(w.fearGreed.value);
  });

  it('санал болгох өгүүлбэрүүд монгол, тоотой', () => {
    const w = buildWeekly(inputs());
    expect(w.suggestedSentences.length).toBeGreaterThanOrEqual(7);
    expect(w.suggestedSentences[0]).toMatch(/^Биткойн|^Биткойны/);
    expect(w.suggestedSentences[1]).toContain('топ 100-аар тооцоолсон');
  });

  it('pickNewsCandidates: Монгол эхэнд, ангилал бүрээс ээлжилж, ≤15', () => {
    const items = [
      ...Array.from({ length: 10 }, (_, k) => news(`m${k}`, 'market', `2026-10-2${k % 2}T0${k}:00:00Z`)),
      news('e1', 'etf', '2026-10-19T01:00:00Z'),
      news('r1', 'regulation', '2026-10-19T02:00:00Z'),
      news('mn', 'regulation', '2026-10-19T03:00:00Z', true),
    ];
    const r = pickNewsCandidates(items);
    expect(r[0].id.startsWith('mn')).toBe(true);
    expect(r.length).toBeLessThanOrEqual(15);
    expect(r.slice(1, 4).map((i) => i.tags[0]).sort()).toEqual(['etf', 'market', 'regulation']);
  });
});

describe('report-md', () => {
  const w = buildWeekly(inputs());

  it('draft загвар нь gray-matter-ээр задарч, схемд тэнцэнэ', () => {
    const { editorial, body } = parseEditorial(reportMarkdown(w));
    expect(editorial.status).toBe('draft');
    expect(editorial.week).toBe('2026-W43');
    expect(editorial.takeaways).toEqual(['', '', '']);
    expect(body).toEqual([]); // auto-suggestions коммент сайтад гарахгүй
  });

  it('--auto-publish: headline = 1-р өгүүлбэр, takeaways = дараагийн 3', () => {
    const { editorial } = parseEditorial(reportMarkdown(w, { autoPublish: true }));
    expect(editorial.status).toBe('published');
    expect(editorial.headline).toBe(w.suggestedSentences[0]);
    expect(editorial.takeaways).toEqual(w.suggestedSentences.slice(1, 4));
    expect(editorial.summary.length).toBeGreaterThan(0);
  });
});
