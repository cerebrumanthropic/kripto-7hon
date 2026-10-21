import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { DATASETS, candidateUrls, loadWithFallback } from './data-client';

const Schema = z.object({ v: z.number() });

describe('candidateUrls', () => {
  it('Pages → fallback → sample', () => {
    expect(candidateUrls(DATASETS.market, 'https://u.github.io/r')).toEqual([
      { url: 'https://u.github.io/r/live/market.json', origin: 'live' },
      { url: '/fallback/market.json', origin: 'fallback' },
      { url: '/fallback/market.sample.json', origin: 'sample' },
    ]);
  });
  it('DATA_BASE_URL хоосон бол Pages-ийг алгасна', () => {
    expect(candidateUrls(DATASETS.history, '').map((c) => c.origin)).toEqual([
      'fallback',
      'sample',
    ]);
  });
});

describe('loadWithFallback', () => {
  const cands = candidateUrls(DATASETS.news, 'https://x');

  it('Pages амжилттай бол live', async () => {
    const r = await loadWithFallback(cands, Schema, async () => ({ v: 1 }));
    expect(r).toEqual({ data: { v: 1 }, origin: 'live' });
  });

  it('Pages унасан бол fallback', async () => {
    const r = await loadWithFallback(cands, Schema, async (url) => {
      if (url.startsWith('https://')) throw new Error('HTTP 404');
      return { v: 2 };
    });
    expect(r.origin).toBe('fallback');
  });

  it('схем буруу бол дараагийнх руу', async () => {
    const r = await loadWithFallback(cands, Schema, async (url) =>
      url.endsWith('.sample.json') ? { v: 3 } : { v: 'bad' },
    );
    expect(r).toEqual({ data: { v: 3 }, origin: 'sample' });
  });

  it('бүгд бүтэлгүйтвэл алдаа', async () => {
    await expect(
      loadWithFallback(cands, Schema, async () => {
        throw new Error('down');
      }),
    ).rejects.toThrow(/ачаалж чадсангүй/);
  });
});
