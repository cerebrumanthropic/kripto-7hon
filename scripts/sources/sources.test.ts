// Бодит хариуны fixture-ээр задлагчийг шалгана (scripts/__fixtures__, 2026.10.21 авсан).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { makeStableDetector } from '../lib/stablecoins';

import { parseGlobal, parseMarketChart, parseMarkets, parseTrending } from './coingecko';
import { parseDexs, parseHacks, parseStableChart, parseStablecoins, parseTvl } from './defillama';
import { parseFearGreed } from './feargreed';
import { parseFx } from './fx';

const fx = (name: string) =>
  JSON.parse(readFileSync(path.join(process.cwd(), 'scripts', '__fixtures__', name), 'utf8')) as unknown;

describe('CoinGecko', () => {
  it('global', () => {
    const g = parseGlobal(fx('coingecko-global.json'));
    expect(g.totalMarketCapUsd).toBeGreaterThan(1e12);
    expect(g.btcDominancePct).toBeGreaterThan(30);
    expect(g.btcDominancePct).toBeLessThan(80);
    expect(Number.isInteger(g.activeCryptocurrencies)).toBe(true);
  });

  it('markets: 100 мөр, эрэмбээр, 24h/7d %-тай', () => {
    const coins = parseMarkets(fx('coingecko-markets.json'));
    expect(coins.length).toBeGreaterThanOrEqual(95);
    expect(coins[0].symbol).toBe('btc');
    expect(coins.map((c) => c.rank)).toEqual([...coins.map((c) => c.rank)].sort((a, b) => a - b));
    expect(coins.filter((c) => c.change7dPct !== null).length).toBeGreaterThan(90);
  });

  it('trending', () => {
    const t = parseTrending(fx('coingecko-trending.json'));
    expect(t.length).toBeGreaterThan(0);
    expect(t[0]).toHaveProperty('symbol');
  });

  it('market_chart: өдрийн цуваа, давхардалгүй', () => {
    const s = parseMarketChart(fx('coingecko-market-chart-bitcoin.json'));
    expect(s.length).toBeGreaterThanOrEqual(30);
    expect(new Set(s.map((p) => p.date)).size).toBe(s.length);
  });

  it('буруу хариуг татгалзана', () => {
    expect(() => parseGlobal({ data: {} })).toThrow();
  });
});

describe('DefiLlama', () => {
  it('TVL ба 7 хоногийн %', () => {
    const r = parseTvl(fx('defillama-historicalChainTvl.json'));
    expect(r.tvlUsd).toBeGreaterThan(1e10);
    expect(r.change7dPct).not.toBeNull();
    expect(Math.abs(r.change7dPct!)).toBeLessThan(50);
  });

  it('TVL: 7 хоногийн өмнөх цэгийг нарийн сонгоно', () => {
    const day = 86_400;
    const pts = Array.from({ length: 10 }, (_, i) => ({ date: i * day, tvl: 100 + i }));
    // сүүлийн = 109 (өдөр 9), 7 хоногийн өмнө = өдөр 2 → 102
    expect(parseTvl(pts).change7dPct).toBeCloseTo((109 / 102 - 1) * 100);
  });

  it('стейблкойны нийт = бүх peg-ийн нийлбэр', () => {
    const raw = fx('defillama-stablecoincharts-all.json') as Array<{ totalCirculatingUSD: Record<string, number> }>;
    const lastSum = Object.values(raw[raw.length - 1].totalCirculatingUSD).reduce((s, v) => s + v, 0);
    const r = parseStableChart(raw);
    expect(r.totalUsd).toBeCloseTo(lastSum);
    expect(r.totalUsd).toBeGreaterThan(raw[raw.length - 1].totalCirculatingUSD.peggedUSD);
  });

  it('стейблкойны топ 5 USD', () => {
    const r = parseStablecoins(fx('defillama-stablecoins.json'));
    expect(r.top).toHaveLength(5);
    expect(r.top[0].symbol).toBe('USDT');
    expect(r.top[0].circulatingUsd).toBeGreaterThan(r.top[4].circulatingUsd);
    expect(r.symbols).toContain('usdt');
  });

  it('DEX', () => {
    const r = parseDexs(fx('defillama-dexs-overview.json'));
    expect(r.dexVolume24hUsd).toBeGreaterThan(0);
    expect(r.dexVolume7dUsd).toBeGreaterThan(r.dexVolume24hUsd!);
  });

  it('hacks: хугацаагаар шүүнэ', () => {
    const raw = fx('defillama-hacks.json') as Array<{ date: number }>;
    const newest = raw[0].date;
    const r = parseHacks(raw, newest - 7 * 86_400, newest);
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(parseHacks(raw, 0, 1)).toEqual([]);
  });
});

describe('Fear & Greed', () => {
  it('сүүлийн утга, монгол шошго, 30 хоногийн түүх (хуучнаас шинэ)', () => {
    const r = parseFearGreed(fx('feargreed.json'));
    expect(r.value).toBeGreaterThanOrEqual(0);
    expect(r.value).toBeLessThanOrEqual(100);
    expect(r.labelMn).not.toBe(r.labelEn);
    expect(r.history).toHaveLength(30);
    expect(r.history[0].date < r.history[29].date).toBe(true);
    expect(r.history[29].value).toBe(r.value);
  });
});

describe('FX', () => {
  it('USD/MNT', () => {
    const r = parseFx(fx('fx-open-er-api.json'));
    expect(r.usdMnt).toBeGreaterThan(2000);
    expect(r.usdMnt).toBeLessThan(6000);
    expect(r.asOf).toMatch(/Z$/);
  });
  it('result != success бол алдаа', () => {
    expect(() => parseFx({ result: 'error', rates: {} })).toThrow();
  });
});

describe('стейблкойн илрүүлэлт', () => {
  const coins = parseMarkets(fx('coingecko-markets.json'));
  const isStable = makeStableDetector(parseStablecoins(fx('defillama-stablecoins.json')).symbols);

  it('үндсэн стейблкойнуудыг таньна', () => {
    for (const s of ['usdt', 'usdc', 'dai', 'usde']) {
      const c = coins.find((x) => x.symbol === s);
      if (c) expect(isStable(c)).toBe(true);
    }
  });

  it('үнэ ≈$1 боловч стейблкойн биш хөрөнгийг андуурахгүй', () => {
    expect(isStable({ symbol: 'sui', name: 'Sui', priceUsd: 1.0 })).toBe(false);
    expect(isStable({ symbol: 'btc', name: 'Bitcoin', priceUsd: 82000 })).toBe(false);
  });

  it('нэрэнд USD бүхий ≈$1 хөрөнгө', () => {
    expect(makeStableDetector([])({ symbol: 'xyzusd', name: 'XYZ USD', priceUsd: 1.001 })).toBe(true);
    expect(makeStableDetector([])({ symbol: 'xyzusd', name: 'XYZ USD', priceUsd: 0.9 })).toBe(false);
  });
});
