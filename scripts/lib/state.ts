// Төлөв (SPEC §7.1) = history/daily.json + news/<week>.json.
// Ачаалах дараалал: (1) GitHub Pages-ийн нийтлэгдсэн хувилбар → (2) store/ (data-history branch) → (3) хоосон.
// Хадгалах: Pages руу ажиллалт бүрд (public-data/), store/ руу зөвхөн өдрийн цэг өөрчлөгдсөн үед.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { z } from 'zod';

import { isoWeek } from '../../src/lib/dates';
import {
  DailyHistorySchema,
  LiveMarketSchema,
  NewsFeedSchema,
  NewsWeekArchiveSchema,
  type DailyHistory,
  type LiveMarket,
  type NewsFeed,
  type NewsWeekArchive,
} from '../../src/types/schemas';

import { emptyHistory, finalized } from './history';
import { errorMessage, getJson, type HttpOptions } from './http';

export type Origin = 'pages' | 'store' | 'local' | 'empty';

export type StateConfig = {
  dataBaseUrl: string;
  storeDir: string;
  /** Локал ажиллалтад өмнөх market.json-ийг эндээс уншина (Pages байхгүй үед) */
  outDir: string;
  now: Date;
  http?: HttpOptions;
  log?: (msg: string) => void;
};

export type LoadedState = {
  history: DailyHistory;
  /** Одоогийн ба өмнөх 7 хоногийн архив (шинэ мэдээ эдгээрт нэмэгдэнэ) */
  archives: Map<string, NewsWeekArchive>;
  /** store/-д байгаа бусад (хуучин) долоо хоногийн архив — Pages-д дахин нийтлэнэ (PROGRESS D5) */
  olderArchives: NewsWeekArchive[];
  prevMarket: LiveMarket | null;
  prevNews: NewsFeed | null;
  origins: Record<string, Origin>;
};

function readLocal<S extends z.ZodType>(file: string, schema: S): z.infer<S> | null {
  if (!existsSync(file)) return null;
  const parsed = schema.safeParse(JSON.parse(readFileSync(file, 'utf8')));
  return parsed.success ? parsed.data : null;
}

/** Нэг файлыг Pages → store/ → локал гаралтаас ачаална. */
export async function loadOne<S extends z.ZodType>(
  rel: string,
  schema: S,
  cfg: StateConfig,
  { useStore = true, localDir }: { useStore?: boolean; localDir?: string } = {},
): Promise<{ data: z.infer<S> | null; origin: Origin }> {
  const log = cfg.log ?? console.log;
  if (cfg.dataBaseUrl) {
    try {
      const parsed = schema.safeParse(await getJson(`${cfg.dataBaseUrl}/${rel}`, { retries: 1, ...cfg.http }));
      if (parsed.success) return { data: parsed.data, origin: 'pages' };
      log(`[state] Pages ${rel}: схем тэнцээгүй`);
    } catch (e) {
      log(`[state] Pages ${rel}: ${errorMessage(e)}`);
    }
  }
  if (useStore) {
    const fromStore = readLocal(path.join(cfg.storeDir, rel), schema);
    if (fromStore) return { data: fromStore, origin: 'store' };
  }
  if (localDir) {
    const fromLocal = readLocal(path.join(localDir, rel), schema);
    if (fromLocal) return { data: fromLocal, origin: 'local' };
  }
  return { data: null, origin: 'empty' };
}

export const stateWeeks = (now: Date) => [isoWeek(now), isoWeek(new Date(now.getTime() - 7 * 86_400_000))];

export async function loadState(cfg: StateConfig): Promise<LoadedState> {
  const origins: Record<string, Origin> = {};

  const h = await loadOne('history/daily.json', DailyHistorySchema, cfg, { localDir: cfg.outDir });
  origins['history/daily.json'] = h.origin;

  const archives = new Map<string, NewsWeekArchive>();
  for (const w of stateWeeks(cfg.now)) {
    const rel = `news/${w}.json`;
    const a = await loadOne(rel, NewsWeekArchiveSchema, cfg, { localDir: cfg.outDir });
    origins[rel] = a.origin;
    archives.set(w, a.data && a.data.week === w ? a.data : { schemaVersion: 1, week: w, items: [] });
  }

  const olderArchives: NewsWeekArchive[] = [];
  const newsDir = path.join(cfg.storeDir, 'news');
  if (existsSync(newsDir)) {
    for (const f of readdirSync(newsDir).filter((x) => /^\d{4}-W\d{2}\.json$/.test(x)).sort()) {
      const w = f.replace(/\.json$/, '');
      if (archives.has(w)) continue;
      const a = readLocal(path.join(newsDir, f), NewsWeekArchiveSchema);
      if (a) olderArchives.push(a);
    }
  }

  // market.json store-д хадгалагддаггүй: Pages → (локал) өмнөх гаралт
  const m = await loadOne('live/market.json', LiveMarketSchema, cfg, { useStore: false, localDir: cfg.outDir });
  origins['live/market.json'] = m.origin;
  const n = await loadOne('live/news.json', NewsFeedSchema, cfg, { useStore: false, localDir: cfg.outDir });
  origins['live/news.json'] = n.origin;

  return {
    history: h.data ? finalized(h.data) : emptyHistory(),
    archives,
    olderArchives,
    prevMarket: m.data,
    prevNews: n.data,
    origins,
  };
}

export function writeJson(file: string, data: unknown, pretty = false) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(data, null, pretty ? 2 : undefined)}\n`);
}
