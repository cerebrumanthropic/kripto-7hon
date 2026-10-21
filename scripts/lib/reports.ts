// Тайлан нэгтгэх цэвэр логик (prepare-build, validate хуваалцана).
import matter from 'gray-matter';

import { weekRange } from '../../src/lib/dates';
import { markdownToBlocks } from '../../src/lib/markdown-blocks';
import {
  EditorialSchema,
  type MergedReport,
  type ReportIndexEntry,
  type WeeklyAuto,
} from '../../src/types/schemas';

/** Нийтлэх цаг: тасалбарын дараах Даваа 12:00 УБ = 04:00 UTC (SPEC §8.7). */
export function publishedAtFor(week: string): string {
  const { end } = weekRange(week);
  const monday = new Date(Date.parse(`${end}T04:00:00Z`) + 86400000);
  return monday.toISOString().replace('.000Z', 'Z');
}

/** gray-matter нь YAML огноог Date болгодог тул «YYYY-MM-DD» мөр рүү буцаана. */
function normalizeDates(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (Array.isArray(value)) return value.map(normalizeDates);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalizeDates(v)]));
  }
  return value;
}

export function parseEditorial(source: string) {
  const { data, content } = matter(source);
  const fm = normalizeDates(data) as Record<string, unknown>;
  return {
    editorial: EditorialSchema.parse(fm),
    body: markdownToBlocks(content),
    sample: fm.sample === true,
  };
}

export function mergeReport(auto: WeeklyAuto, mdSource: string): MergedReport {
  const { editorial, body, sample } = parseEditorial(mdSource);
  if (editorial.week !== auto.week) {
    throw new Error(`Долоо хоног зөрж байна: .md=${editorial.week}, .json=${auto.week}`);
  }
  return { auto, editorial, body, publishedAt: publishedAtFor(auto.week), ...(sample ? { sample } : {}) };
}

export function indexEntry(r: MergedReport): ReportIndexEntry {
  return {
    week: r.auto.week,
    periodStart: r.auto.periodStart,
    periodEnd: r.auto.periodEnd,
    headline: r.editorial.headline,
    summary: r.editorial.summary,
    btcChange7dPct: r.auto.majors.find((m) => m.symbol === 'BTC')?.change7dPct ?? null,
    totalMarketCapUsd: r.auto.global.totalMarketCapUsd,
    fearGreed: r.auto.fearGreed.value,
    publishedAt: r.publishedAt,
    ...(r.sample ? { sample: true } : {}),
  };
}

/** Шинэ нь эхэндээ. */
export function sortIndex(entries: ReportIndexEntry[]): ReportIndexEntry[] {
  return [...entries].sort((a, b) => b.week.localeCompare(a.week));
}
