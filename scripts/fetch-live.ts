// `npm run data:live` — амьд дата татаж public-data/-д бичнэ (SPEC §7.2).
// Сонголт (хөгжүүлэлт/тест):
//   --fail coingecko,feargreed   тухайн эх сурвалжийг хүчээр унагах (SourceStatus.id эсвэл feed id)
//   --now 2026-10-21T00:07:00Z   цагийг тогтоох
//   --out public-data --store store
// Гарах код: 0 (зарим эх сурвалж унасан ч), 1 = зах зээлийн БҮХ эх сурвалж унасан эсвэл схем алдаатай.
import path from 'node:path';

import {
  DailyHistorySchema,
  LiveMarketSchema,
  LiveStatusSchema,
  NewsFeedSchema,
  NewsWeekArchiveSchema,
  type SourceStatus,
} from '../src/types/schemas';

import {
  MARKET_SOURCE_IDS,
  allMarketSourcesFailed,
  buildMarket,
  dailyValues,
  sourceStatus,
  type MarketInputs,
  type Outcome,
} from './lib/assemble';
import { CallBudget } from './lib/budget';
import { applyDailyClose, withProvisional } from './lib/history';
import { errorMessage } from './lib/http';
import { loadState, writeJson } from './lib/state';
import { fetchCoinGeckoLive } from './sources/coingecko';
import { fetchDexs, fetchStablecoins, fetchTvl } from './sources/defillama';
import { fetchFearGreed } from './sources/feargreed';
import { FEEDS } from './sources/feeds';
import { fetchFx } from './sources/fx';
import { latestNews, mergeIntoArchives, fetchFeed } from './sources/rss';

try {
  process.loadEnvFile('.env.local'); // локалд; Actions-д env/secrets-ээс
} catch {}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const trimSlash = (s: string) => s.replace(/\/+$/, '');

async function main(): Promise<number> {
  const now = arg('now') ? new Date(arg('now')!) : new Date();
  if (Number.isNaN(now.getTime())) throw new Error('--now буруу');
  const nowIso = now.toISOString();
  const outDir = path.resolve(arg('out') ?? 'public-data');
  const storeDir = path.resolve(arg('store') ?? 'store');
  const forced = new Set((arg('fail') ?? '').split(',').filter(Boolean));
  const dataBaseUrl = trimSlash(process.env.DATA_BASE_URL ?? process.env.EXPO_PUBLIC_DATA_BASE_URL ?? '');

  console.log(`[live] ${nowIso} out=${path.relative(process.cwd(), outDir)} store=${path.relative(process.cwd(), storeDir)} pages=${dataBaseUrl || '—'}`);
  if (forced.size) console.log(`[live] хүчээр унагах: ${[...forced].join(', ')}`);

  // 1) Төлөв
  const state = await loadState({ dataBaseUrl, storeDir, outDir, now });
  console.log(`[state] ${Object.entries(state.origins).map(([k, v]) => `${k}=${v}`).join(' ')}`);

  // 2) Эх сурвалжууд — тус тусдаа
  const budget = new CallBudget('coingecko', 5);
  const run = <T>(id: string, fn: () => Promise<T>): Promise<T> =>
    forced.has(id) ? Promise.reject(new Error('хүчээр унагасан (--fail)')) : fn();
  const settle = async <T>(p: Promise<T>): Promise<Outcome<T>> => {
    try {
      return { ok: true, value: await p };
    } catch (e) {
      return { ok: false, error: errorMessage(e) };
    }
  };

  const ids = MARKET_SOURCE_IDS;
  const [coingecko, tvl, stablecoins, dexs, feargreed, fx] = await Promise.all([
    settle(run(ids.coingecko, () => fetchCoinGeckoLive(process.env.COINGECKO_DEMO_API_KEY, budget))),
    settle(run(ids.tvl, () => fetchTvl())),
    settle(run(ids.stablecoins, () => fetchStablecoins())),
    settle(run(ids.dexs, () => fetchDexs())),
    settle(run(ids.feargreed, () => fetchFearGreed(31))),
    settle(run(ids.fx, () => fetchFx())),
  ]);
  const inputs: MarketInputs = { coingecko, tvl, stablecoins, dexs, feargreed, fx };

  const feedOutcomes = await Promise.all(FEEDS.map((f) => settle(run(f.id, () => fetchFeed(f, now)))));

  // 3) Нэгтгэх
  const market = LiveMarketSchema.parse(buildMarket(inputs, state.prevMarket, now));

  const freshNews = feedOutcomes.flatMap((o) => (o.ok ? o.value : []));
  const archives = mergeIntoArchives(state.archives, freshNews);
  // Feed унасан ч архивт өмнөх мэдээ нь үлдэнэ → өмнөх амжилттай татсан цагтай, stale
  const hadNews = (id: string) => Boolean(state.prevNews?.sources.some((s) => s.id === id && (s.ok || s.stale)));
  const newsSources: SourceStatus[] = FEEDS.map((f, i) => sourceStatus(f.id, feedOutcomes[i], nowIso, state.prevNews, hadNews(f.id)));
  const news = NewsFeedSchema.parse({
    schemaVersion: 1,
    updatedAt: nowIso,
    sources: newsSources,
    items: latestNews(archives.values(), now),
  });

  const values = dailyValues(market, inputs);
  const { history, changed: storeChanged } = applyDailyClose(state.history, values, now);
  const pagesHistory = DailyHistorySchema.parse(withProvisional(history, values, now));

  const status = LiveStatusSchema.parse({
    schemaVersion: 1,
    updatedAt: nowIso,
    sources: [...market.sources, ...newsSources],
    coingeckoCallsThisRun: budget.used,
  });

  // 4) Бичих — Pages (public-data/)
  writeJson(path.join(outDir, 'live', 'market.json'), market);
  writeJson(path.join(outDir, 'live', 'news.json'), news);
  writeJson(path.join(outDir, 'live', 'status.json'), status);
  writeJson(path.join(outDir, 'history', 'daily.json'), pagesHistory);
  for (const a of [...state.olderArchives, ...archives.values()]) {
    writeJson(path.join(outDir, 'news', `${a.week}.json`), NewsWeekArchiveSchema.parse(a));
  }

  // 5) store/ — өдрийн цэг өөрчлөгдсөн үед л (workflow нь өдөрт ~1 commit хийнэ).
  // Бүх зах зээлийн эх сурвалж унасан бол хоосон цэг бичихгүй.
  const allFailed = allMarketSourcesFailed(inputs);
  if (storeChanged && !allFailed) {
    writeJson(path.join(storeDir, 'history', 'daily.json'), DailyHistorySchema.parse(history), true);
    for (const a of archives.values()) writeJson(path.join(storeDir, 'news', `${a.week}.json`), a, true);
    console.log(`[store] шинэчлэв: өдрийн цэг ${history.points.at(-1)?.date}, архив ${[...archives.keys()].join(', ')}`);
  } else {
    console.log('[store] өөрчлөлтгүй');
  }

  // 6) Тайлан
  for (const s of status.sources) {
    console.log(`  ${s.ok ? '✓' : s.stale ? '↺' : '✗'} ${s.id.padEnd(22)} ${s.ok ? '' : `${s.error}${s.stale ? ' (өмнөх утга)' : ''}`}`);
  }
  console.log(
    `[live] coins=${market.coins.length} news=${news.items.length} (шинэ ${freshNews.length}) history=${pagesHistory.points.length} coingecko дуудлага=${budget.used}`,
  );

  if (allFailed) {
    console.error('[live] Зах зээлийн бүх эх сурвалж бүтэлгүйтэв');
    return 1;
  }
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error('[live] алдаа:', e instanceof Error ? e.message : e);
    process.exit(1);
  });
