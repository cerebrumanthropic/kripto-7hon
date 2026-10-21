// Амьд дата: GitHub Pages → build үеийн fallback → repo-ийн sample (SPEC §1, §7.5.2).
import { useQuery } from '@tanstack/react-query';
import type { z } from 'zod';

import {
  DailyHistorySchema,
  LiveMarketSchema,
  NewsFeedSchema,
  type DailyHistory,
  type LiveMarket,
  type NewsFeed,
} from '@/types/schemas';

import { DATA_BASE_URL, FETCH_TIMEOUT_MS, LIVE_REFETCH_MS } from './config';

export type DataOrigin = 'live' | 'fallback' | 'sample';
export type Loaded<T> = { data: T; origin: DataOrigin };

type Dataset = { pagesPath: string; fallbackName: string };

export const DATASETS = {
  market: { pagesPath: 'live/market.json', fallbackName: 'market' },
  news: { pagesPath: 'live/news.json', fallbackName: 'news' },
  history: { pagesPath: 'history/daily.json', fallbackName: 'daily' },
} as const satisfies Record<string, Dataset>;

/** Оролдох дараалал. DATA_BASE_URL хоосон бол Pages-ийг алгасна. */
export function candidateUrls(
  ds: Dataset,
  baseUrl: string = DATA_BASE_URL,
): Array<{ url: string; origin: DataOrigin }> {
  const list: Array<{ url: string; origin: DataOrigin }> = [];
  if (baseUrl) list.push({ url: `${baseUrl}/${ds.pagesPath}`, origin: 'live' });
  list.push({ url: `/fallback/${ds.fallbackName}.json`, origin: 'fallback' });
  list.push({ url: `/fallback/${ds.fallbackName}.sample.json`, origin: 'sample' });
  return list;
}

export type Fetcher = (url: string) => Promise<unknown>;

async function defaultFetcher(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Эхний амжилттай, схемд тэнцсэн эх сурвалжийг буцаана. Бүгд бүтэлгүйтвэл алдаа. */
export async function loadWithFallback<S extends z.ZodType>(
  candidates: Array<{ url: string; origin: DataOrigin }>,
  schema: S,
  fetcher: Fetcher = defaultFetcher,
): Promise<Loaded<z.infer<S>>> {
  const errors: string[] = [];
  for (const { url, origin } of candidates) {
    try {
      const parsed = schema.safeParse(await fetcher(url));
      if (parsed.success) return { data: parsed.data, origin };
      errors.push(`${url}: schema`);
    } catch (e) {
      errors.push(`${url}: ${(e as Error).message}`);
    }
  }
  throw new Error(`Өгөгдөл ачаалж чадсангүй (${errors.join('; ')})`);
}

const queryOptions = {
  refetchInterval: LIVE_REFETCH_MS,
  staleTime: LIVE_REFETCH_MS / 2,
  retry: 1,
} as const;

/**
 * `snapshot` — loader-оор статик HTML-д шингээсэн build үеийн дата. Амьд дата ирэх хүртэл placeholder
 * болж харагдана (контент үсрэхгүй, CLS). `isPlaceholderData` үед хоцролтын туз харуулахгүй.
 */
const placeholder = <T,>(snapshot: T | null | undefined) =>
  snapshot ? { data: snapshot, origin: 'fallback' as DataOrigin } : undefined;

export function useMarket(snapshot?: LiveMarket | null) {
  return useQuery({
    queryKey: ['market'],
    queryFn: () => loadWithFallback(candidateUrls(DATASETS.market), LiveMarketSchema),
    placeholderData: placeholder(snapshot),
    ...queryOptions,
  });
}

export function useNews(snapshot?: NewsFeed | null) {
  return useQuery({
    queryKey: ['news'],
    queryFn: () => loadWithFallback(candidateUrls(DATASETS.news), NewsFeedSchema),
    placeholderData: placeholder(snapshot),
    ...queryOptions,
  });
}

export function useHistory(snapshot?: DailyHistory | null) {
  return useQuery({
    queryKey: ['history'],
    queryFn: () => loadWithFallback(candidateUrls(DATASETS.history), DailyHistorySchema),
    placeholderData: placeholder(snapshot),
    ...queryOptions,
  });
}
