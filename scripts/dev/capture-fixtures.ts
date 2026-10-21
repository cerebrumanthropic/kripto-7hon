// SPEC §5: endpoint бүрийг нэг удаа дуудаж, бодит хариуг scripts/__fixtures__/-д хадгална (тестэд).
// Хэмжээг багасгахын тулд урт цувааг таслана. CoinGecko-д түлхүүр байвал Demo header ашиглана,
// үгүй бол түлхүүргүй нийтийн endpoint-оос НЭГ удаа авна (талбарын нэр ижил).
// Ажиллуулах: npx tsx scripts/dev/capture-fixtures.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { errorMessage, getJson } from '../lib/http';

try {
  process.loadEnvFile('.env.local');
} catch {}

const DIR = path.join(process.cwd(), 'scripts', '__fixtures__');
mkdirSync(DIR, { recursive: true });

const CG = 'https://api.coingecko.com/api/v3';
const cgHeaders: Record<string, string> = process.env.COINGECKO_DEMO_API_KEY
  ? { 'x-cg-demo-api-key': process.env.COINGECKO_DEMO_API_KEY }
  : {};

type Any = Record<string, unknown>;
const last = <T>(arr: T[], n: number) => arr.slice(-n);

const jobs: Array<[file: string, url: string, trim: (d: Any) => unknown, headers?: Record<string, string>]> = [
  ['coingecko-global.json', `${CG}/global`, (d) => d, cgHeaders],
  [
    'coingecko-markets.json',
    `${CG}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&price_change_percentage=24h,7d&sparkline=false`,
    (d) => d,
    cgHeaders,
  ],
  [
    'coingecko-trending.json',
    `${CG}/search/trending`,
    (d) => ({
      coins: ((d.coins as Any[]) ?? []).slice(0, 7).map((c) => {
        const { id, coin_id, name, symbol, market_cap_rank, slug, score } = c.item as Any;
        return { item: { id, coin_id, name, symbol, market_cap_rank, slug, score } };
      }),
    }),
    cgHeaders,
  ],
  [
    'coingecko-market-chart-bitcoin.json',
    `${CG}/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily`,
    (d) => d,
    cgHeaders,
  ],
  ['defillama-historicalChainTvl.json', 'https://api.llama.fi/v2/historicalChainTvl', (d) => last(d as unknown as Any[], 40)],
  ['defillama-stablecoincharts-all.json', 'https://stablecoins.llama.fi/stablecoincharts/all', (d) => last(d as unknown as Any[], 40)],
  [
    'defillama-stablecoins.json',
    'https://stablecoins.llama.fi/stablecoins?includePrices=true',
    (d) => ({
      peggedAssets: ((d.peggedAssets as Any[]) ?? [])
        .sort(
          (a, b) =>
            (((b.circulating as Any)?.peggedUSD as number) ?? 0) - (((a.circulating as Any)?.peggedUSD as number) ?? 0),
        )
        .slice(0, 12)
        .map(({ chainCirculating, chains, ...rest }) => rest),
    }),
  ],
  [
    'defillama-dexs-overview.json',
    'https://api.llama.fi/overview/dexs?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true',
    (d) => {
      const { protocols, totalDataChart, totalDataChartBreakdown, allChains, ...rest } = d;
      return { ...rest, protocols: ((protocols as Any[]) ?? []).slice(0, 2) };
    },
  ],
  [
    'defillama-hacks.json',
    'https://api.llama.fi/hacks',
    (d) => (d as unknown as Any[]).sort((a, b) => (b.date as number) - (a.date as number)).slice(0, 8),
  ],
  ['feargreed.json', 'https://api.alternative.me/fng/?limit=31', (d) => d],
  ['fx-open-er-api.json', 'https://open.er-api.com/v6/latest/USD', (d) => d],
];

async function main() {
  for (const [file, url, trim, headers] of jobs) {
    try {
      const data = await getJson<Any>(url, { headers, retries: 1 });
      const out = trim(data);
      const text = `${JSON.stringify(out, null, 2)}\n`;
      writeFileSync(path.join(DIR, file), text);
      console.log(`✓ ${file} (${Math.round(text.length / 1024)} KB)`);
    } catch (e) {
      console.log(`✗ ${file}: ${errorMessage(e)}`);
    }
  }
}

main();
