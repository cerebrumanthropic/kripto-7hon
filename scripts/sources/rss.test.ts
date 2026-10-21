// Нийлэг (synthetic) feed-ээр шалгана — бодит мэдээний текстийг repo-д хадгалахгүй.
import { describe, expect, it } from 'vitest';

import type { NewsItem, NewsWeekArchive } from '../../src/types/schemas';

import {
  canonicalUrl,
  dedupe,
  isCryptoTitle,
  jaccard,
  latestNews,
  mergeIntoArchives,
  newsId,
  parseFeed,
  titleTokens,
  toNewsItems,
  type FeedConfig,
} from './rss';

const NOW = new Date('2026-10-21T05:07:00Z');

const RSS2 = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel><title>Test</title>
<item>
  <title><![CDATA[SEC &amp; CFTC sign MoU on crypto oversight]]></title>
  <link>https://news.example/a?utm_source=rss&amp;id=7#top</link>
  <pubDate>Tue, 20 Oct 2026 10:00:00 +0000</pubDate>
  <description><![CDATA[<p>Long <b>body</b> that must never be stored</p>]]></description>
  <content:encoded><![CDATA[<div><div><div>full article</div></div></div>]]></content:encoded>
</item>
<item>
  <title>Bitcoin &#8217;s rally stalls at $70K</title>
  <link>http://news.example/b/</link>
  <pubDate>Mon, 19 Oct 2026 08:30:00 GMT</pubDate>
</item>
<item>
  <title>Old story</title>
  <link>https://news.example/old</link>
  <pubDate>Mon, 05 Oct 2026 08:30:00 GMT</pubDate>
</item>
<item>
  <title>Bad date</title>
  <link>https://news.example/bad</link>
  <pubDate>not a date</pubDate>
</item>
</channel></rss>`;

const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom test</title>
  <entry>
    <title type="html">Ethereum ETF inflows return</title>
    <link rel="alternate" href="https://atom.example/eth-etf"/>
    <link rel="self" href="https://atom.example/self"/>
    <published>2026-10-20T12:00:00Z</published>
    <summary>should be ignored</summary>
  </entry>
</feed>`;

const RDF = `<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <item><title>Miners boost hashrate</title><link>https://rdf.example/1</link><dc:date>2026-10-20T01:00:00Z</dc:date></item>
</rdf:RDF>`;

const feed: FeedConfig = { id: 't', name: 'Test News', url: 'https://news.example/rss', sourceUrl: 'https://news.example' };

describe('parseFeed', () => {
  it('RSS 2.0: CDATA, entity, тайлбар/бүрэн текстийг авахгүй', () => {
    const e = parseFeed(RSS2);
    expect(e).toHaveLength(4);
    expect(e[0].title).toBe('SEC & CFTC sign MoU on crypto oversight');
    expect(e[1].title).toBe('Bitcoin ’s rally stalls at $70K');
    expect(JSON.stringify(e)).not.toMatch(/body|full article/);
  });
  it('Atom: alternate холбоос', () => {
    expect(parseFeed(ATOM)).toEqual([{ title: 'Ethereum ETF inflows return', link: 'https://atom.example/eth-etf', date: '2026-10-20T12:00:00Z' }]);
  });
  it('RSS 1.0 (RDF) dc:date', () => {
    expect(parseFeed(RDF)[0]).toMatchObject({ title: 'Miners boost hashrate', date: '2026-10-20T01:00:00Z' });
  });
  it('HTML хуудсыг татгалзана', () => {
    expect(() => parseFeed('<!DOCTYPE html><html><body>hi</body></html>')).toThrow(/RSS биш/);
  });
});

describe('canonicalUrl', () => {
  it('utm, hash, http, төгсгөлийн «/»', () => {
    expect(canonicalUrl('https://News.Example/a?utm_source=rss&id=7#top')).toBe('https://news.example/a?id=7');
    expect(canonicalUrl('http://news.example/b/')).toBe('https://news.example/b');
    expect(canonicalUrl('https://news.example/')).toBe('https://news.example/');
    expect(canonicalUrl('javascript:alert(1)')).toBeNull();
    expect(canonicalUrl('not a url')).toBeNull();
  });
});

describe('toNewsItems', () => {
  const items = toNewsItems(parseFeed(RSS2), feed, NOW);
  it('7 хоногийн цонх, буруу огноо хасагдана', () => {
    expect(items.map((i) => i.url)).toEqual(['https://news.example/a?id=7', 'https://news.example/b']);
  });
  it('id = canonical URL-ийн sha1-ийн 12 тэмдэгт, ангилалтай', () => {
    expect(items[0].id).toBe(newsId('https://news.example/a?id=7'));
    expect(items[0].id).toHaveLength(12);
    expect(items[0].tags).toEqual(['regulation']);
    expect(items[0].source).toBe('Test News');
    expect(items[0].publishedAt).toBe('2026-10-20T10:00:00.000Z');
  });
  it('ирээдүйн огноотой мэдээг хасна', () => {
    const future = `<rss><channel><item><title>x</title><link>https://n.example/f</link><pubDate>Fri, 30 Oct 2026 00:00:00 GMT</pubDate></item></channel></rss>`;
    expect(toNewsItems(parseFeed(future), feed, NOW)).toEqual([]);
  });
  it('монгол feed: зөвхөн крипто түлхүүр үгтэй, isMongolia', () => {
    const mn = `<rss><channel>
      <item><title>Биткойны ханш огцом өслөө</title><link>https://mn.example/1</link><pubDate>Tue, 20 Oct 2026 01:00:00 +0800</pubDate></item>
      <item><title>Улаанбаатарт цас орно</title><link>https://mn.example/2</link><pubDate>Tue, 20 Oct 2026 02:00:00 +0800</pubDate></item>
    </channel></rss>`;
    const r = toNewsItems(parseFeed(mn), { ...feed, mongolian: true }, NOW);
    expect(r).toHaveLength(1);
    expect(r[0].isMongolia).toBe(true);
  });
  it('SEC: зөвхөн крипто гарчиг', () => {
    expect(isCryptoTitle('SEC Charges Promoters of Crypto Asset Scheme')).toBe(true);
    expect(isCryptoTitle('SEC Charges Investment Adviser with Fraud')).toBe(false);
    expect(isCryptoTitle('Tokenization roundtable announced')).toBe(true);
  });
});

const item = (id: string, title: string, publishedAt: string, url = `https://x.example/${id}`): NewsItem => ({
  id: id.padEnd(12, '0').slice(0, 12),
  title,
  url,
  source: 'X',
  sourceUrl: 'https://x.example',
  publishedAt,
  tags: ['market'],
  isMongolia: false,
});

describe('dedupe', () => {
  it('Jaccard ≥ 0.8 эсвэл ижил URL', () => {
    expect(jaccard(titleTokens('Bitcoin hits $70,000 today'), titleTokens('Bitcoin hits $70,000 today!'))).toBe(1);
    const r = dedupe([
      item('a', 'Bitcoin ETF sees record inflows this week', '2026-10-20T10:00:00Z'),
      item('b', 'Bitcoin ETF sees record inflows this week!', '2026-10-20T09:00:00Z'),
      item('c', 'Totally different headline', '2026-10-20T08:00:00Z', 'https://x.example/a'),
      item('d', 'Ether options expiry looms', '2026-10-20T07:00:00Z'),
    ]);
    expect(r.map((i) => i.id[0])).toEqual(['a', 'd']);
  });
  it('төстэй боловч өөр гарчиг үлдэнэ', () => {
    const r = dedupe([
      item('a', 'Bitcoin rises 5% as ETF inflows jump', '2026-10-20T10:00:00Z'),
      item('b', 'Bitcoin falls 5% as ETF outflows jump', '2026-10-20T09:00:00Z'),
    ]);
    expect(r).toHaveLength(2);
  });
});

describe('архив', () => {
  const empty = (week: string): NewsWeekArchive => ({ schemaVersion: 1, week, items: [] });

  it('publishedAt-ийн долоо хоногоор хуваарилж, ачаалаагүй долоо хоногийг алгасна', () => {
    const archives = new Map([
      ['2026-W43', empty('2026-W43')],
      ['2026-W42', empty('2026-W42')],
    ]);
    const next = mergeIntoArchives(archives, [
      item('a', 'A news', '2026-10-20T10:00:00Z'), // W43
      item('b', 'B news', '2026-10-18T10:00:00Z'), // W42 (Ням)
      item('c', 'C news', '2026-10-05T10:00:00Z'), // W41 — ачаалаагүй
    ]);
    expect(next.get('2026-W43')!.items.map((i) => i.title)).toEqual(['A news']);
    expect(next.get('2026-W42')!.items.map((i) => i.title)).toEqual(['B news']);
    expect(next.has('2026-W41')).toBe(false);
  });

  it('давхардсан мэдээ нэмэгдэхгүй, анхны хувилбар үлдэнэ, хязгаартай', () => {
    const start = new Map([['2026-W43', { schemaVersion: 1 as const, week: '2026-W43', items: [item('a', 'First title version', '2026-10-20T10:00:00Z')] }]]);
    const next = mergeIntoArchives(start, [
      item('z', 'Edited title', '2026-10-20T10:00:00Z', 'https://x.example/a'),
      item('n', 'New one', '2026-10-21T01:00:00Z'),
      item('m', 'Another', '2026-10-21T02:00:00Z'),
    ], 2);
    expect(next.get('2026-W43')!.items.map((i) => i.title)).toEqual(['Another', 'New one']);
    const unCapped = mergeIntoArchives(start, [item('z', 'Edited title', '2026-10-20T10:00:00Z', 'https://x.example/a')]);
    expect(unCapped.get('2026-W43')!.items.map((i) => i.title)).toEqual(['First title version']);
  });

  it('latestNews: сүүлийн 7 хоног, шинэ нь эхэндээ, limit', () => {
    const a: NewsWeekArchive = {
      schemaVersion: 1,
      week: '2026-W43',
      items: [item('a', 'Fresh', '2026-10-21T01:00:00Z'), item('b', 'Week old', '2026-10-13T01:00:00Z')],
    };
    const b: NewsWeekArchive = { schemaVersion: 1, week: '2026-W42', items: [item('c', 'Mid', '2026-10-17T01:00:00Z')] };
    expect(latestNews([a, b], NOW).map((i) => i.title)).toEqual(['Fresh', 'Mid']);
    expect(latestNews([a, b], NOW, 1)).toHaveLength(1);
  });
});
