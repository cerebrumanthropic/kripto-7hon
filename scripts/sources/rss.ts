// RSS/Atom мэдээ (SPEC §5.5). Зөвхөн гарчиг, эх сурвалж, огноо, холбоос хадгална —
// description, зураг, бүрэн текстийг хэзээ ч хадгалахгүй (зохиогчийн эрх).
import { createHash } from 'node:crypto';

import { XMLParser } from 'fast-xml-parser';

import { classify, isMongolia } from '../../src/lib/classify';
import { isoWeek } from '../../src/lib/dates';
import type { NewsItem, NewsWeekArchive } from '../../src/types/schemas';
import { getText, type HttpOptions } from '../lib/http';

export type FeedConfig = {
  id: string;
  name: string;
  url: string;
  sourceUrl: string;
  /** Монгол эх сурвалж → isMongolia, түлхүүр үгээр шүүнэ */
  mongolian?: boolean;
  /** SEC: холбоо барих имэйлтэй User-Agent шаардана */
  needsContact?: boolean;
  /** Ерөнхий сэдэвтэй feed (SEC) → зөвхөн крипто түлхүүр үгтэй гарчиг */
  cryptoOnly?: boolean;
};

export type RawEntry = { title: string; link: string; date: string };

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  processEntities: true,
  htmlEntities: true,
  parseTagValue: false,
  trimValues: true,
  isArray: (name) => ['item', 'entry', 'link'].includes(name),
  // Бид тайлбар/бүрэн текстийг ашигладаггүй — задлахгүй (хурд, nested-tag хязгаар, зохиогчийн эрх)
  stopNodes: ['*.description', '*.content:encoded', '*.content', '*.summary', '*.media:group'],
});

function text(v: unknown): string {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) return text(v[0]);
  if (typeof v === 'object') return text((v as Record<string, unknown>)['#text']);
  return '';
}

function atomLink(links: unknown): string {
  const arr = (Array.isArray(links) ? links : [links]) as Array<Record<string, string> | string>;
  const alt = arr.find((l) => typeof l === 'object' && (!l['@_rel'] || l['@_rel'] === 'alternate'));
  if (alt && typeof alt === 'object') return alt['@_href'] ?? '';
  return text(arr[0]);
}

const decode = (s: string) =>
  s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

/** RSS 2.0, RSS 1.0 (RDF) ба Atom-ийг дэмжинэ. Зөвхөн гарчиг/холбоос/огноо. */
export function parseFeed(xml: string): RawEntry[] {
  if (/^\s*(<!doctype html|<html)/i.test(xml)) throw new Error('RSS биш (HTML хуудас буцаав)');
  const doc = parser.parse(xml) as Record<string, any>;
  const rssItems = doc.rss?.channel?.item ?? doc['rdf:RDF']?.item ?? [];
  const atomEntries = doc.feed?.entry ?? [];
  const out: RawEntry[] = [];
  for (const it of rssItems as Array<Record<string, unknown>>) {
    out.push({
      title: decode(text(it.title)),
      link: text(it.link) || text(it.guid),
      date: text(it.pubDate) || text(it['dc:date']) || text(it.published),
    });
  }
  for (const e of atomEntries as Array<Record<string, unknown>>) {
    out.push({
      title: decode(text(e.title)),
      link: atomLink(e.link),
      date: text(e.published) || text(e.updated),
    });
  }
  return out.filter((e) => e.title && e.link);
}

const TRACKING = /^(utm_|mc_|fbclid$|gclid$|ref$|ref_src$|cmpid$|guccounter$)/i;

/** utm_* г.м. хасах, hash хасах, host жижиг үсэг, http→https, төгсгөлийн «/» хасах. */
export function canonicalUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  u.protocol = 'https:';
  u.hostname = u.hostname.toLowerCase();
  u.hash = '';
  for (const k of [...u.searchParams.keys()]) if (TRACKING.test(k)) u.searchParams.delete(k);
  let s = u.toString();
  if (u.pathname.length > 1 && s.endsWith('/') && !u.search) s = s.slice(0, -1);
  return s;
}

export const newsId = (canonical: string) => createHash('sha1').update(canonical).digest('hex').slice(0, 12);

export function titleTokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(Boolean),
  );
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Canonical URL ижил, эсвэл гарчгийн үгийн Jaccard ≥ 0.8 бол давхардал. Эхэнд байгаа нь үлдэнэ. */
export function dedupe(items: NewsItem[], threshold = 0.8): NewsItem[] {
  const kept: Array<{ item: NewsItem; tokens: Set<string> }> = [];
  const urls = new Set<string>();
  for (const item of items) {
    if (urls.has(item.url)) continue;
    const tokens = titleTokens(item.title);
    if (kept.some((k) => jaccard(k.tokens, tokens) >= threshold)) continue;
    urls.add(item.url);
    kept.push({ item, tokens });
  }
  return kept.map((k) => k.item);
}

const MN_KEYWORDS = ['крипто', 'виртуал хөрөнгө', 'биткойн', 'биткоин', 'блокчэйн', 'блокчейн', 'сзх', 'вхүү', 'bitcoin', 'crypto'];

export function isMongolianCryptoTitle(title: string): boolean {
  const t = title.toLowerCase();
  return MN_KEYWORDS.some((k) => t.includes(k));
}

const CRYPTO_RE = /\b(crypto\w*|digital asset\w*|bitcoin|ether(eum)?|blockchain|stablecoin\w*|token\w*|virtual asset\w*|defi|nft\w*|web3)\b/i;

export function isCryptoTitle(title: string): boolean {
  return CRYPTO_RE.test(title);
}

const DAY_MS = 86_400_000;

/** Feed-ийн мөрүүдийг NewsItem болгоно: 7 хоногийн цонх, ирээдүйн огноог хасна. */
export function toNewsItems(entries: RawEntry[], feed: FeedConfig, now: Date, windowDays = 7): NewsItem[] {
  const out: NewsItem[] = [];
  for (const e of entries) {
    const url = canonicalUrl(e.link);
    const t = Date.parse(e.date);
    if (!url || Number.isNaN(t)) continue;
    if (t > now.getTime() + 3_600_000 || t < now.getTime() - windowDays * DAY_MS) continue;
    if (feed.mongolian && !isMongolianCryptoTitle(e.title)) continue;
    if (feed.cryptoOnly && !isCryptoTitle(e.title)) continue;
    out.push({
      id: newsId(url),
      title: e.title.slice(0, 300),
      url,
      source: feed.name,
      sourceUrl: feed.sourceUrl,
      publishedAt: new Date(t).toISOString(),
      tags: classify(e.title),
      isMongolia: isMongolia(e.title, feed.mongolian),
    });
  }
  return out;
}

export async function fetchFeed(feed: FeedConfig, now: Date, http: HttpOptions = {}): Promise<NewsItem[]> {
  if (feed.needsContact && !process.env.CONTACT_EMAIL) throw new Error('CONTACT_EMAIL тохируулаагүй (SEC шаардана)');
  const xml = await getText(feed.url, http);
  const entries = parseFeed(xml);
  if (entries.length === 0) throw new Error('feed хоосон эсвэл танигдаагүй формат');
  return toNewsItems(entries, feed, now);
}

const byNewest = (a: NewsItem, b: NewsItem) => b.publishedAt.localeCompare(a.publishedAt);

/** Шинэ мэдээг долоо хоногийн архивт (publishedAt-ийн ISO долоо хоног, UTC) хуваарилж нэгтгэнэ. */
export function mergeIntoArchives(
  archives: Map<string, NewsWeekArchive>,
  items: NewsItem[],
  cap = 500,
): Map<string, NewsWeekArchive> {
  const next = new Map(archives);
  const buckets = new Map<string, NewsItem[]>();
  for (const it of items) {
    const w = isoWeek(it.publishedAt);
    if (!next.has(w)) continue; // зөвхөн ачаалсан (одоогийн/өмнөх) долоо хоногууд
    buckets.set(w, [...(buckets.get(w) ?? []), it]);
  }
  for (const [w, fresh] of buckets) {
    const existing = next.get(w)!.items;
    // Хуучин нь эхэнд → анх бүртгэгдсэн хувилбар үлдэнэ
    const merged = dedupe([...existing, ...fresh.sort(byNewest)]).sort(byNewest).slice(0, cap);
    next.set(w, { schemaVersion: 1, week: w, items: merged });
  }
  return next;
}

/** Амьд news.json: сүүлийн 7 хоногийн хамгийн шинэ `limit` мэдээ (SPEC §5.5). */
export function latestNews(archives: Iterable<NewsWeekArchive>, now: Date, limit = 60): NewsItem[] {
  const from = now.getTime() - 7 * DAY_MS;
  const all = [...archives].flatMap((a) => a.items).filter((i) => Date.parse(i.publishedAt) >= from);
  return dedupe(all.sort(byNewest)).slice(0, limit);
}
