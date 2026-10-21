// `npm run report:draft -- [--week 2026-W43] [--auto-publish] [--dry-run] [--now ISO] [--print-week]` (SPEC §7.3)
// Гаралт: content/reports/<week>.json (дарж бичнэ), content/reports/<week>.md (ЗӨВХӨН байхгүй үед).
// index.json-ийг бичихгүй — prepare-build үүсгэнэ (PROGRESS D1).
import { appendFileSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { isoWeek, weekRange } from '../src/lib/dates';
import { DailyHistorySchema, LiveMarketSchema, NewsWeekArchiveSchema, type SourceStatus } from '../src/types/schemas';

import { CallBudget } from './lib/budget';
import { emptyHistory, finalized } from './lib/history';
import { errorMessage, getJson } from './lib/http';
import { reportMarkdown } from './lib/report-md';
import { loadOne, writeJson } from './lib/state';
import { buildWeekly } from './lib/weekly';
import { COINGECKO_BASE, parseGlobal, parseMarketChart, parseMarkets } from './sources/coingecko';
import { fetchDexs, fetchHacks, fetchStablecoins, fetchTvl } from './sources/defillama';
import { fetchFearGreed } from './sources/feargreed';
import { fetchFx } from './sources/fx';

try {
  process.loadEnvFile('.env.local');
} catch {}

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const flag = (name: string) => process.argv.includes(`--${name}`);

async function main(): Promise<number> {
  const now = arg('now') ? new Date(arg('now')!) : new Date();
  // Ням 23:55-д эсвэл Даваа өглөө хоцорч ажиллавал ч зөв 7 хоног (SPEC §7.3.1)
  const week = arg('week') || isoWeek(new Date(now.getTime() - 12 * 3_600_000));
  weekRange(week); // формат шалгах (буруу бол алдаа)
  if (flag('print-week')) {
    // workflow-д PR branch-ийн нэрийг урьдчилан мэдэхэд
    console.log(week);
    return 0;
  }
  const dryRun = flag('dry-run');
  const autoPublish = flag('auto-publish');
  const dataBaseUrl = (process.env.DATA_BASE_URL ?? process.env.EXPO_PUBLIC_DATA_BASE_URL ?? '').replace(/\/+$/, '');
  const storeDir = path.resolve(arg('store') ?? 'store');
  const outDir = path.resolve(arg('out') ?? 'public-data');
  const reportsDir = path.resolve('content', 'reports');
  const nowIso = now.toISOString();

  console.log(`[weekly] ${week} now=${nowIso}${dryRun ? ' (dry-run)' : ''}${autoPublish ? ' (auto-publish)' : ''}`);

  // Төлөв: түүх, тухайн 7 хоногийн мэдээний архив, trending (амьд market.json-оос — CoinGecko дуудлага хэмнэнэ)
  const cfg = { dataBaseUrl, storeDir, outDir, now };
  const hist = await loadOne('history/daily.json', DailyHistorySchema, cfg, { localDir: outDir });
  const arch = await loadOne(`news/${week}.json`, NewsWeekArchiveSchema, cfg, { localDir: outDir });
  const live = await loadOne('live/market.json', LiveMarketSchema, cfg, { useStore: false, localDir: outDir });
  console.log(`[state] history=${hist.origin} news=${arch.origin} (${arch.data?.items.length ?? 0}) market=${live.origin}`);

  const sources: SourceStatus[] = [];
  const ok = (id: string) => sources.push({ id, ok: true, fetchedAt: nowIso });
  const fail = (id: string, e: unknown) => sources.push({ id, ok: false, fetchedAt: nowIso, error: errorMessage(e) });

  // CoinGecko: global, markets (топ 100), BTC/ETH 30 хоног = 4 дуудлага (≤5)
  const apiKey = process.env.COINGECKO_DEMO_API_KEY;
  if (!apiKey) throw new Error('COINGECKO_DEMO_API_KEY тохируулаагүй');
  const budget = new CallBudget('coingecko', 5);
  const cg = (label: string, p: string) => {
    budget.use(label);
    return getJson(`${COINGECKO_BASE}${p}`, { headers: { 'x-cg-demo-api-key': apiKey } });
  };
  const global = parseGlobal(await cg('global', '/global'));
  const coins = parseMarkets(
    await cg('markets', '/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&price_change_percentage=24h,7d&sparkline=false'),
  );
  const chart = (id: string) => cg(`chart-${id}`, `/coins/${id}/market_chart?vs_currency=usd&days=30&interval=daily`).then(parseMarketChart);
  const charts = { BTC: await chart('bitcoin'), ETH: await chart('ethereum') };
  ok('coingecko');

  // DefiLlama, F&G — заавал; DEX, ханш, хакердалт — сонголттой
  const [tvl, stablecoins, fearGreed] = await Promise.all([fetchTvl(), fetchStablecoins(), fetchFearGreed(8)]);
  ok('defillama-tvl');
  ok('defillama-stablecoins');
  ok('feargreed');

  const range = weekRange(week);
  const [dexs, fx, hacks] = await Promise.allSettled([
    fetchDexs(),
    fetchFx(),
    fetchHacks(Date.parse(`${range.start}T00:00:00Z`) / 1000, Date.parse(range.cutoffUtc) / 1000),
  ]);
  if (dexs.status === 'fulfilled') ok('defillama-dexs');
  else fail('defillama-dexs', dexs.reason);
  if (fx.status === 'fulfilled') ok('fx');
  else fail('fx', fx.reason);
  if (hacks.status === 'fulfilled') ok('defillama-hacks');
  else fail('defillama-hacks', hacks.reason);

  const auto = buildWeekly({
    week,
    now,
    global,
    coins,
    charts,
    tvl,
    stablecoins,
    dexs: dexs.status === 'fulfilled' ? dexs.value : null,
    fearGreed,
    fx: fx.status === 'fulfilled' ? fx.value : (live.data?.fx ?? null),
    trending: (live.data?.trending ?? []).map(({ symbol, name }) => ({ symbol: symbol.toUpperCase(), name })),
    news: arch.data?.items ?? [],
    hacks: hacks.status === 'fulfilled' ? hacks.value : null,
    history: hist.data ? finalized(hist.data) : emptyHistory(),
    sources,
  });

  console.log(`[weekly] нийт ${auto.global.change7dPct ?? '—'}% (${auto.global.change7dMethod ?? '—'}), мэдээ ${auto.newsCandidates.length}, coingecko дуудлага ${budget.used}`);
  for (const s of auto.suggestedSentences) console.log(`  • ${s}`);

  const jsonFile = path.join(reportsDir, `${week}.json`);
  const mdFile = path.join(reportsDir, `${week}.md`);
  const mdExists = existsSync(mdFile);

  if (dryRun) {
    console.log(`[dry-run] бичихгүй: ${path.relative(process.cwd(), jsonFile)}${mdExists ? '' : `, ${path.relative(process.cwd(), mdFile)}`}`);
  } else {
    writeJson(jsonFile, auto, true);
    console.log(`[write] ${path.relative(process.cwd(), jsonFile)}`);
    if (mdExists) {
      console.log(`[keep] ${path.relative(process.cwd(), mdFile)} байна — редакторын текстийг дарж бичихгүй`);
    } else {
      writeFileSync(mdFile, reportMarkdown(auto, { autoPublish }));
      console.log(`[write] ${path.relative(process.cwd(), mdFile)} (${autoPublish ? 'published' : 'draft'})`);
    }
  }

  // GitHub Actions: PR branch-ийн нэрэнд
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `week=${week}\n`);
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error('[weekly] алдаа:', errorMessage(e));
    process.exit(1);
  });
