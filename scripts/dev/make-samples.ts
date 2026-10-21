// Үе шат 1-ийн ЖИШЭЭ дата үүсгэгч (PROGRESS D9). Бодит API дуудахгүй.
// Гаралт: public/fallback/{market,news,daily}.sample.json, scripts/__fixtures__/reports/2026-W42.json
// Ажиллуулах: npx tsx scripts/dev/make-samples.ts
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { classify, isMongolia } from '../../src/lib/classify';
import { weekRange } from '../../src/lib/dates';
import {
  DailyHistorySchema,
  LiveMarketSchema,
  NewsFeedSchema,
  WeeklyAutoSchema,
  type CoinMove,
  type NewsItem,
} from '../../src/types/schemas';

const ROOT = process.cwd();
const NOW = '2026-10-21T05:07:00Z';
const USD_MNT = 3412.5;

// Тогтвортой псевдо-санамсаргүй (mulberry32)
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(42);
const round = (v: number, d = 2) => Number(v.toFixed(d));

function walk(n: number, end: number, vol: number): number[] {
  const out = [end];
  for (let i = 1; i < n; i++) out.unshift(out[0] / (1 + (rand() - 0.5) * vol));
  return out.map((v) => round(v, v > 100 ? 0 : 4));
}

function days(n: number, endDay: string): string[] {
  const end = new Date(`${endDay}T00:00:00Z`).getTime();
  return Array.from({ length: n }, (_, i) =>
    new Date(end - (n - 1 - i) * 86400000).toISOString().slice(0, 10),
  );
}

type C = [id: string, symbol: string, name: string, price: number, mcap: number, stable?: boolean];
const COINS: C[] = [
  ['bitcoin', 'btc', 'Bitcoin', 68450, 1.355e12],
  ['ethereum', 'eth', 'Ethereum', 2470, 2.98e11],
  ['tether', 'usdt', 'Tether', 1.0, 1.82e11, true],
  ['ripple', 'xrp', 'XRP', 2.41, 1.41e11],
  ['binancecoin', 'bnb', 'BNB', 612, 8.9e10],
  ['solana', 'sol', 'Solana', 142.6, 7.4e10],
  ['usd-coin', 'usdc', 'USDC', 1.0, 7.3e10, true],
  ['tron', 'trx', 'TRON', 0.3142, 2.98e10],
  ['dogecoin', 'doge', 'Dogecoin', 0.1834, 2.71e10],
  ['cardano', 'ada', 'Cardano', 0.6123, 2.2e10],
  ['hyperliquid', 'hype', 'Hyperliquid', 38.4, 1.29e10],
  ['chainlink', 'link', 'Chainlink', 15.82, 1.07e10],
  ['ethena-usde', 'usde', 'Ethena USDe', 1.0, 1.05e10, true],
  ['stellar', 'xlm', 'Stellar', 0.3311, 1.03e10],
  ['sui', 'sui', 'Sui', 2.87, 1.01e10],
  ['bitcoin-cash', 'bch', 'Bitcoin Cash', 498.2, 9.9e9],
  ['avalanche-2', 'avax', 'Avalanche', 21.35, 9.0e9],
  ['litecoin', 'ltc', 'Litecoin', 88.4, 6.7e9],
  ['the-open-network', 'ton', 'Toncoin', 2.62, 6.6e9],
  ['shiba-inu', 'shib', 'Shiba Inu', 0.00001134, 6.68e9],
  ['dai', 'dai', 'Dai', 0.9998, 5.4e9, true],
  ['polkadot', 'dot', 'Polkadot', 3.41, 5.2e9],
  ['uniswap', 'uni', 'Uniswap', 7.12, 4.5e9],
  ['aave', 'aave', 'Aave', 254.1, 3.9e9],
];

const coins = COINS.map(([id, symbol, name, priceUsd, marketCapUsd, stable], i) => {
  const isStablecoin = Boolean(stable);
  return {
    id,
    symbol,
    name,
    rank: i + 1,
    priceUsd,
    priceMnt: round(priceUsd * USD_MNT, priceUsd < 1 ? 4 : 0),
    change24hPct: isStablecoin ? round((rand() - 0.5) * 0.1) : round((rand() - 0.45) * 8),
    change7dPct: isStablecoin ? round((rand() - 0.5) * 0.2) : round((rand() - 0.4) * 24),
    marketCapUsd,
    volume24hUsd: round(marketCapUsd * (0.02 + rand() * 0.08), 0),
    isStablecoin,
  };
});

const fgHistory = days(30, '2026-10-21').map((date, i) => ({
  date,
  value: Math.round(52 - i * 0.6 + (rand() - 0.5) * 10),
}));
fgHistory[fgHistory.length - 1].value = 34;

const market = LiveMarketSchema.parse({
  schemaVersion: 1,
  updatedAt: NOW,
  sources: ['coingecko', 'defillama', 'feargreed', 'fx'].map((id) => ({ id, ok: true, fetchedAt: NOW })),
  global: {
    totalMarketCapUsd: 2.45e12,
    totalVolume24hUsd: 9.81e10,
    marketCapChange24hPct: -1.42,
    btcDominancePct: 57.8,
    ethDominancePct: 12.2,
    activeCryptocurrencies: 17842,
  },
  coins,
  trending: ['hyperliquid', 'sui', 'aave', 'chainlink', 'toncoin', 'ondo-finance', 'pepe'].map(
    (id, i) => ({
      id,
      symbol: id.split('-')[0].slice(0, 4),
      name: id.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
      rank: [11, 15, 24, 12, 19, 61, 33][i],
    }),
  ),
  fearGreed: {
    value: 34,
    labelEn: 'Fear',
    labelMn: 'Айдас',
    timestamp: '2026-10-21T00:00:00Z',
    history: fgHistory,
  },
  stablecoins: {
    totalUsd: 3.124e11,
    change7dPct: 0.8,
    top: [
      { symbol: 'USDT', name: 'Tether', circulatingUsd: 1.82e11, change7dPct: 0.6 },
      { symbol: 'USDC', name: 'USDC', circulatingUsd: 7.31e10, change7dPct: 1.4 },
      { symbol: 'USDe', name: 'Ethena USDe', circulatingUsd: 1.05e10, change7dPct: -2.1 },
      { symbol: 'USDS', name: 'Sky Dollar', circulatingUsd: 8.2e9, change7dPct: 0.3 },
      { symbol: 'DAI', name: 'Dai', circulatingUsd: 5.4e9, change7dPct: -0.4 },
    ],
  },
  defi: { tvlUsd: 1.182e11, change7dPct: -2.3, dexVolume24hUsd: 6.4e9, dexVolume7dUsd: 4.31e10 },
  fx: { usdMnt: USD_MNT, source: 'exchangerate-api', asOf: '2026-10-21T00:02:31Z' },
});

// Түүх: 60 хоног
const histDays = days(60, '2026-10-20');
const btcHist = walk(60, 68450, 0.05);
const ethHist = walk(60, 2470, 0.07);
const mcapHist = walk(60, 2.45e12, 0.04);
const stableHist = walk(60, 3.124e11, 0.004);
const tvlHist = walk(60, 1.182e11, 0.03);
const history = DailyHistorySchema.parse({
  schemaVersion: 1,
  points: histDays.map((date, i) => ({
    date,
    totalMarketCapUsd: mcapHist[i],
    totalVolume24hUsd: round(mcapHist[i] * 0.04, 0),
    btcDominancePct: round(57 + rand() * 1.5),
    btcUsd: btcHist[i],
    ethUsd: ethHist[i],
    stablecoinsUsd: stableHist[i],
    defiTvlUsd: tvlHist[i],
    fearGreed: Math.round(30 + rand() * 30),
    usdMnt: round(USD_MNT + (rand() - 0.5) * 8),
  })),
});

// Мэдээ: [ЖИШЭЭ] тэмдэгтэй, эх сурвалжийн нүүр хуудас руу заана
const SRC = [
  ['CoinDesk', 'https://www.coindesk.com'],
  ['Cointelegraph', 'https://cointelegraph.com'],
  ['Decrypt', 'https://decrypt.co'],
  ['The Block', 'https://www.theblock.co'],
  ['CryptoSlate', 'https://cryptoslate.com'],
  ['U.S. SEC', 'https://www.sec.gov'],
] as const;
const TITLES = [
  'SEC opens comment period on new crypto custody rule',
  'Spot bitcoin ETFs log third straight week of outflows',
  'DeFi lending protocol drained of $18M in oracle exploit',
  'Fed minutes point to slower pace of rate cuts',
  'Tether expands USDT supply on new chains',
  'Uniswap governance approves fee switch pilot',
  'Bitcoin hashrate hits record as miners upgrade fleets',
  'Bitcoin slips below $70,000 as risk appetite cools',
  'EU regulators publish MiCA stablecoin guidance',
  'Ethereum ETF inflows return after two-week pause',
  'Mongolian regulator updates virtual asset service provider registry',
  'Phishing campaign targets hardware wallet users',
  'Treasury yields climb, weighing on crypto prices',
  'Circle reports USDC circulation growth in Asia',
  'Aave TVL rises as lending demand picks up',
  'Solana network activity reaches monthly high',
];
const newsItems: NewsItem[] = TITLES.map((title, i) => {
  const [source, sourceUrl] = SRC[i % SRC.length];
  const url = `${sourceUrl}/#sample-${i + 1}`;
  return {
    id: createHash('sha1').update(url).digest('hex').slice(0, 12),
    title: `[Жишээ] ${title}`,
    url,
    source,
    sourceUrl,
    publishedAt: new Date(Date.parse(NOW) - (i * 7 + 1) * 3600000).toISOString(),
    tags: classify(title),
    isMongolia: isMongolia(title),
  };
});
const news = NewsFeedSchema.parse({
  schemaVersion: 1,
  updatedAt: NOW,
  sources: SRC.map(([id]) => ({ id: id.toLowerCase().replace(/[^a-z]/g, ''), ok: true, fetchedAt: NOW })),
  items: newsItems,
});

// 7 хоногийн тайлан 2026-W42
const week = '2026-W42';
const range = weekRange(week);
const chartDays = days(31, range.end);
const btc30 = walk(31, 67120, 0.045);
const eth30 = walk(31, 2398, 0.06);
const move = (c: (typeof coins)[number]): CoinMove => ({
  symbol: c.symbol.toUpperCase(),
  name: c.name,
  priceUsd: c.priceUsd,
  change7dPct: c.change7dPct ?? 0,
  marketCapUsd: c.marketCapUsd,
});
const nonStable = coins.filter((c) => !c.isStablecoin);
const sorted = [...nonStable].sort((a, b) => (b.change7dPct ?? 0) - (a.change7dPct ?? 0));
const report = WeeklyAutoSchema.parse({
  schemaVersion: 1,
  week,
  periodStart: range.start,
  periodEnd: range.end,
  cutoffUtc: range.cutoffUtc,
  fetchedAt: '2026-10-18T23:55:41Z',
  global: {
    totalMarketCapUsd: 2.41e12,
    totalMarketCapUsd7dAgo: 2.49e12,
    change7dPct: -3.21,
    change7dMethod: 'history',
    btcDominancePct: 57.8,
    btcDominancePct7dAgo: 57.1,
    ethDominancePct: 12.1,
    totalVolume24hUsd: 9.4e10,
  },
  majors: [
    {
      symbol: 'BTC',
      priceUsd: 67120,
      priceMnt: Math.round(67120 * USD_MNT),
      change7dPct: -4.2,
      change30dPct: round((btc30[30] / btc30[0] - 1) * 100),
      chart30d: chartDays.map((date, i) => ({ date, priceUsd: btc30[i] })),
    },
    {
      symbol: 'ETH',
      priceUsd: 2398,
      priceMnt: Math.round(2398 * USD_MNT),
      change7dPct: -6.8,
      change30dPct: round((eth30[30] / eth30[0] - 1) * 100),
      chart30d: chartDays.map((date, i) => ({ date, priceUsd: eth30[i] })),
    },
  ],
  topGainers: sorted.slice(0, 5).map(move),
  topLosers: sorted.slice(-5).reverse().map(move),
  heatmapTop20: nonStable.slice(0, 20).map(move),
  stablecoins: {
    totalUsd: 3.099e11,
    change7dPct: 0.8,
    top: market.stablecoins!.top.map(({ symbol, circulatingUsd, change7dPct }) => ({
      symbol,
      circulatingUsd,
      change7dPct,
    })),
  },
  defi: { tvlUsd: 1.171e11, change7dPct: -2.9, dexVolume7dUsd: 4.1e10, dexChange7dPct: -8.4 },
  fearGreed: {
    value: 34,
    labelMn: 'Айдас',
    value7dAgo: 52,
    series7d: days(7, range.end).map((date, i) => ({ date, value: [52, 49, 47, 41, 38, 36, 34][i] })),
  },
  fx: { usdMnt: USD_MNT, source: 'exchangerate-api', asOf: '2026-10-18T00:02:31Z' },
  trending: market.trending.slice(0, 5).map(({ symbol, name }) => ({ symbol, name })),
  newsCandidates: newsItems.slice(0, 15),
  hacks: [{ name: '[Жишээ] DeFi lending protocol', date: '2026-10-15', amountUsd: 1.8e7 }],
  suggestedSentences: [
    'Биткойн 7 хоногт 4.2 хувиар буурч, 67,120 ам.долларт хүрлээ.',
    'Криптогийн нийт зах зээлийн үнэлгээ 2.41 их наяд ам.доллар болж, 7 хоногт 3.2 хувиар буурлаа.',
    'Биткойны давамгайлал 57.8 хувь боллоо (өмнөх 7 хоногт 57.1 хувь).',
    'Стейблкойны нийт нийлүүлэлт 309.9 тэрбум ам.доллар, 7 хоногт 0.8 хувиар өслөө.',
    'Айдас ба шунахайн индекс 34 (Айдас) байна, өмнөх 7 хоногт 52 байсан.',
  ],
  sources: market.sources,
});

function write(rel: string, data: unknown) {
  const file = path.join(ROOT, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  console.log('wrote', rel);
}

write('public/fallback/market.sample.json', market);
write('public/fallback/news.sample.json', news);
write('public/fallback/daily.sample.json', history);
// Тестийн fixture (scripts/__fixtures__/reports/2026-W42.md-тэй хамт)
write(`scripts/__fixtures__/reports/${week}.json`, report);
