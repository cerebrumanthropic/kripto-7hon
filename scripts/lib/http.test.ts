import { describe, expect, it, vi } from 'vitest';

import { HttpError, errorMessage, getJson, userAgent } from './http';

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const status = (s: number) => new Response('x', { status: s });

function fakeFetch(responses: Array<Response | Error>) {
  const calls: string[] = [];
  const impl = vi.fn(async (url: string | URL | Request) => {
    calls.push(String(url));
    const next = responses.shift();
    if (!next) throw new Error('no more responses');
    if (next instanceof Error) throw next;
    return next;
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const noSleep = { sleep: async () => {}, backoffMs: 1 };

describe('http', () => {
  it('амжилттай', async () => {
    const { impl } = fakeFetch([ok({ a: 1 })]);
    expect(await getJson('https://x.test/a', { fetchImpl: impl, ...noSleep })).toEqual({ a: 1 });
  });

  it('5xx ба сүлжээний алдаанд 2 удаа давтана', async () => {
    const { impl, calls } = fakeFetch([status(502), new TypeError('fetch failed'), ok({ a: 2 })]);
    expect(await getJson('https://x.test/a', { fetchImpl: impl, ...noSleep })).toEqual({ a: 2 });
    expect(calls).toHaveLength(3);
  });

  it('3 оролдлогын дараа бууж өгнө', async () => {
    const { impl, calls } = fakeFetch([status(500), status(500), status(503)]);
    await expect(getJson('https://x.test/a', { fetchImpl: impl, ...noSleep })).rejects.toThrow('HTTP 503');
    expect(calls).toHaveLength(3);
  });

  it('4xx-д давтахгүй', async () => {
    const { impl, calls } = fakeFetch([status(403)]);
    await expect(getJson('https://x.test/a', { fetchImpl: impl, ...noSleep })).rejects.toBeInstanceOf(HttpError);
    expect(calls).toHaveLength(1);
  });

  it('429 бол 60 сек хүлээгээд нэг удаа', async () => {
    const waits: number[] = [];
    const { impl, calls } = fakeFetch([status(429), ok({ a: 3 })]);
    const r = await getJson('https://x.test/a', {
      fetchImpl: impl,
      backoffMs: 1,
      sleep: async (ms) => {
        waits.push(ms);
      },
    });
    expect(r).toEqual({ a: 3 });
    expect(waits).toEqual([60_000]);
    expect(calls).toHaveLength(2);
  });

  it('хоёр дахь 429 нь ердийн 4xx шиг тасална', async () => {
    const { impl, calls } = fakeFetch([status(429), status(429)]);
    await expect(getJson('https://x.test/a', { fetchImpl: impl, ...noSleep })).rejects.toThrow('HTTP 429');
    expect(calls).toHaveLength(2);
  });

  it('userAgent ба errorMessage', () => {
    expect(userAgent({ SITE_URL: 'https://s.app', CONTACT_EMAIL: 'a@b.c' })).toBe('kripto-7hon-bot/1.0 (+https://s.app; a@b.c)');
    expect(userAgent({})).toBe('kripto-7hon-bot/1.0 (+https://vaspfrcweekly.expo.app)');
    expect(errorMessage(new HttpError('https://api.x.test/p?key=secret', 404))).toBe('HTTP 404 api.x.test/p');
  });
});
