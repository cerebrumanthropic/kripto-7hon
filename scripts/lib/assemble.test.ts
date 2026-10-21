import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { LiveMarketSchema } from '../../src/types/schemas';
import { parseGlobal, parseMarkets, parseTrending } from '../sources/coingecko';
import { parseDexs, parseStableChart, parseStablecoins, parseTvl } from '../sources/defillama';
import { parseFearGreed } from '../sources/feargreed';
import { parseFx } from '../sources/fx';

import { allMarketSourcesFailed, buildMarket, dailyValues, type MarketInputs } from './assemble';

const fx = (name: string) =>
  JSON.parse(readFileSync(path.join(process.cwd(), 'scripts', '__fixtures__', name), 'utf8')) as unknown;

const ok = <T>(value: T) => ({ ok: true as const, value });
const fail = (error = 'HTTP 503') => ({ ok: false as const, error });

const allOk = (): MarketInputs => ({
  coingecko: ok({
    global: parseGlobal(fx('coingecko-global.json')),
    coins: parseMarkets(fx('coingecko-markets.json')),
    trending: parseTrending(fx('coingecko-trending.json')),
  }),
  tvl: ok(parseTvl(fx('defillama-historicalChainTvl.json'))),
  stablecoins: ok({
    ...parseStableChart(fx('defillama-stablecoincharts-all.json')),
    ...parseStablecoins(fx('defillama-stablecoins.json')),
  }),
  dexs: ok(parseDexs(fx('defillama-dexs-overview.json'))),
  feargreed: ok(parseFearGreed(fx('feargreed.json'))),
  fx: ok(parseFx(fx('fx-open-er-api.json'))),
});

const T1 = new Date('2026-10-21T04:07:00Z');
const T2 = new Date('2026-10-21T05:07:00Z');

describe('buildMarket', () => {
  it('бүх эх сурвалж амжилттай → схемд тэнцэнэ, топ 50, ₮ үнэ, стейблкойн', () => {
    const m = buildMarket(allOk(), null, T1);
    expect(LiveMarketSchema.safeParse(m).success).toBe(true);
    expect(m.coins).toHaveLength(50);
    expect(m.sources.every((s) => s.ok)).toBe(true);
    const btc = m.coins.find((c) => c.symbol === 'btc')!;
    expect(btc.priceMnt).toBeCloseTo(btc.priceUsd * m.fx!.usdMnt, -1);
    expect(m.coins.find((c) => c.symbol === 'usdt')?.isStablecoin).toBe(true);
    expect(btc.isStablecoin).toBe(false);
    expect(m.trending.length).toBeLessThanOrEqual(7);
  });

  it('нэг эх сурвалж унахад бусад нь ажиллаж, өмнөх утга + stale', () => {
    const prev = buildMarket(allOk(), null, T1);
    const inputs = { ...allOk(), feargreed: fail('timeout') };
    const m = buildMarket(inputs, prev, T2);
    expect(LiveMarketSchema.safeParse(m).success).toBe(true);
    expect(m.fearGreed).toEqual(prev.fearGreed);
    const s = m.sources.find((x) => x.id === 'feargreed')!;
    expect(s).toMatchObject({ ok: false, stale: true, error: 'timeout', fetchedAt: T1.toISOString() });
    expect(m.sources.filter((x) => x.ok)).toHaveLength(5);
    expect(m.updatedAt).toBe(T2.toISOString());
  });

  it('өмнөх утга байхгүй үед унасан хэсэг null (stale биш)', () => {
    const m = buildMarket({ ...allOk(), coingecko: fail(), stablecoins: fail() }, null, T1);
    expect(LiveMarketSchema.safeParse(m).success).toBe(true);
    expect(m.global).toBeNull();
    expect(m.coins).toEqual([]);
    expect(m.stablecoins).toBeNull();
    expect(m.sources.find((s) => s.id === 'coingecko')?.stale).toBeUndefined();
  });

  it('DEX унавал TVL шинэ, DEX өмнөх утгаараа', () => {
    const prev = buildMarket(allOk(), null, T1);
    const m = buildMarket({ ...allOk(), dexs: fail() }, prev, T2);
    expect(m.defi?.dexVolume24hUsd).toBe(prev.defi?.dexVolume24hUsd);
    expect(m.sources.find((s) => s.id === 'defillama-dexs')).toMatchObject({ ok: false, stale: true });
  });

  it('CoinGecko унаж ханш шинэчлэгдвэл өмнөх coin-уудын ₮ үнийг дахин тооцно', () => {
    const prev = buildMarket(allOk(), null, T1);
    const inputs = allOk();
    const newFx = { ...(inputs.fx.ok ? inputs.fx.value : parseFx(fx('fx-open-er-api.json'))), usdMnt: 4000 };
    const m = buildMarket({ ...inputs, coingecko: fail(), fx: ok(newFx) }, prev, T2);
    expect(m.coins[0].priceMnt).toBeCloseTo(m.coins[0].priceUsd * 4000, -1);
  });

  it('dailyValues: зөвхөн шинээр татсан эх сурвалжаас', () => {
    const prev = buildMarket(allOk(), null, T1);
    const inputs = { ...allOk(), coingecko: fail() };
    const v = dailyValues(buildMarket(inputs, prev, T2), inputs);
    expect(v.btcUsd).toBeNull();
    expect(v.totalMarketCapUsd).toBeNull();
    expect(v.fearGreed).not.toBeNull();
    expect(v.usdMnt).not.toBeNull();
  });

  it('allMarketSourcesFailed', () => {
    const all = Object.fromEntries(Object.keys(allOk()).map((k) => [k, fail()])) as unknown as MarketInputs;
    expect(allMarketSourcesFailed(all)).toBe(true);
    expect(allMarketSourcesFailed({ ...all, fx: allOk().fx })).toBe(false);
  });
});
