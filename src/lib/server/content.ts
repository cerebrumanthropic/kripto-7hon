// Build үед (Node) контент унших. ЗӨВХӨН route-ийн `loader` / `generateStaticParams` дотроос
// динамик import-оор дуудна — тэгснээр клиент bundle-д fs орохгүй (PROGRESS D3).
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { z } from 'zod';

import { ResearchSchema, type Research } from '@/types/research';
import {
  DailyHistorySchema,
  LiveMarketSchema,
  MergedReportSchema,
  NewsFeedSchema,
  ReportIndexSchema,
  type MergedReport,
  type ReportIndexEntry,
} from '@/types/schemas';

const root = () => process.cwd();

export async function readResearch(): Promise<Research> {
  const raw = await readFile(path.join(root(), 'content', 'research.json'), 'utf8');
  return ResearchSchema.parse(JSON.parse(raw));
}

/** content/reports/index.json (prepare-build үүсгэнэ). Байхгүй бол хоосон. */
export async function readReportIndex(): Promise<ReportIndexEntry[]> {
  try {
    const raw = await readFile(path.join(root(), 'content', 'reports', 'index.json'), 'utf8');
    return ReportIndexSchema.parse(JSON.parse(raw));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw e;
  }
}

const FALLBACK = { market: LiveMarketSchema, news: NewsFeedSchema, daily: DailyHistorySchema } as const;
type FallbackName = keyof typeof FALLBACK;

/**
 * Build үеийн амьд датаны snapshot (prepare-build → public/fallback/<name>.json, үгүй бол .sample.json).
 * Статик HTML-д placeholder болгон шингээж, амьд дата ирэхэд контент үсрэхээс (CLS) сэргийлнэ.
 */
export async function readFallback<N extends FallbackName>(name: N): Promise<z.infer<(typeof FALLBACK)[N]> | null> {
  for (const file of [`${name}.json`, `${name}.sample.json`]) {
    try {
      const raw = await readFile(path.join(root(), 'public', 'fallback', file), 'utf8');
      const parsed = FALLBACK[name].safeParse(JSON.parse(raw));
      if (parsed.success) return parsed.data as z.infer<(typeof FALLBACK)[N]>;
    } catch {}
  }
  return null;
}

export async function readReport(week: string): Promise<MergedReport | null> {
  if (!/^\d{4}-W\d{2}$/.test(week)) return null;
  try {
    const raw = await readFile(path.join(root(), 'public', 'reports', `${week}.json`), 'utf8');
    return MergedReportSchema.parse(JSON.parse(raw));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw e;
  }
}
