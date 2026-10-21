import { describe, expect, it } from 'vitest';

import type { NewsItem } from '@/types/schemas';

import { EMPTY_FILTER, filterNews, toggleTag } from './news-filter';

const item = (over: Partial<NewsItem>): NewsItem => ({
  id: 'abcdefabcdef',
  title: 'Bitcoin rallies',
  url: 'https://a.example/1',
  source: 'CoinDesk',
  sourceUrl: 'https://a.example',
  publishedAt: '2026-10-21T00:00:00Z',
  tags: ['market'],
  isMongolia: false,
  ...over,
});

const items = [
  item({ id: '1', title: 'SEC sues exchange', tags: ['regulation'], source: 'Decrypt' }),
  item({ id: '2', title: 'ETF inflows jump', tags: ['etf'] }),
  item({ id: '3', title: 'Mongolia licenses VASP', tags: ['regulation'], isMongolia: true }),
];

describe('filterNews', () => {
  it('шүүлтүүргүй бол бүгд', () => {
    expect(filterNews(items, EMPTY_FILTER)).toHaveLength(3);
  });
  it('ангилал, эх сурвалж, Монгол, хайлт', () => {
    expect(filterNews(items, { ...EMPTY_FILTER, tags: ['regulation'] }).map((i) => i.id)).toEqual(['1', '3']);
    expect(filterNews(items, { ...EMPTY_FILTER, source: 'Decrypt' }).map((i) => i.id)).toEqual(['1']);
    expect(filterNews(items, { ...EMPTY_FILTER, mongoliaOnly: true }).map((i) => i.id)).toEqual(['3']);
    expect(filterNews(items, { ...EMPTY_FILTER, query: '  etf ' }).map((i) => i.id)).toEqual(['2']);
  });
  it('toggleTag', () => {
    expect(toggleTag(['etf'], 'etf')).toEqual([]);
    expect(toggleTag([], 'etf')).toEqual(['etf']);
  });
});
