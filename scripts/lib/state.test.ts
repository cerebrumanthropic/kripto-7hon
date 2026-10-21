import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { loadState, stateWeeks, writeJson } from './state';

const NOW = new Date('2026-10-21T05:07:00Z');
const dirs: string[] = [];
const tmp = () => {
  const d = mkdtempSync(path.join(tmpdir(), 'k7-state-'));
  dirs.push(d);
  return d;
};
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

const point = (date: string, extra: object = {}) => ({
  date,
  totalMarketCapUsd: 1,
  totalVolume24hUsd: 1,
  btcDominancePct: 1,
  btcUsd: 1,
  ethUsd: 1,
  stablecoinsUsd: 1,
  defiTvlUsd: 1,
  fearGreed: 1,
  usdMnt: 1,
  ...extra,
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const quiet = { log: () => {} };
const noRetry = { retries: 0, sleep: async () => {} };

describe('loadState', () => {
  it('stateWeeks: одоогийн ба өмнөх 7 хоног', () => {
    expect(stateWeeks(NOW)).toEqual(['2026-W43', '2026-W42']);
  });

  it('Pages байхгүй → store → хоосон; provisional хасна; хуучин архивыг цуглуулна', async () => {
    const store = tmp();
    writeJson(path.join(store, 'history/daily.json'), {
      schemaVersion: 1,
      points: [point('2026-10-19'), point('2026-10-20', { provisional: true })],
    });
    writeJson(path.join(store, 'news/2026-W42.json'), { schemaVersion: 1, week: '2026-W42', items: [] });
    writeJson(path.join(store, 'news/2026-W40.json'), { schemaVersion: 1, week: '2026-W40', items: [] });
    writeJson(path.join(store, 'news/broken.json'), { nope: true });

    const s = await loadState({ dataBaseUrl: '', storeDir: store, outDir: tmp(), now: NOW, ...quiet });
    expect(s.history.points.map((p) => p.date)).toEqual(['2026-10-19']);
    expect(s.origins['history/daily.json']).toBe('store');
    expect(s.origins['news/2026-W42.json']).toBe('store');
    expect(s.origins['news/2026-W43.json']).toBe('empty');
    expect([...s.archives.keys()]).toEqual(['2026-W43', '2026-W42']);
    expect(s.olderArchives.map((a) => a.week)).toEqual(['2026-W40']);
    expect(s.prevMarket).toBeNull();
  });

  it('Pages эхэнд; Pages унавал store руу', async () => {
    const store = tmp();
    writeJson(path.join(store, 'history/daily.json'), { schemaVersion: 1, points: [point('2026-10-01')] });
    const pagesUp = (async (url: string | URL | Request) =>
      String(url).endsWith('history/daily.json')
        ? json({ schemaVersion: 1, points: [point('2026-10-20')] })
        : json({}, 404)) as typeof fetch;
    const s1 = await loadState({ dataBaseUrl: 'https://p.example/r', storeDir: store, outDir: tmp(), now: NOW, http: { fetchImpl: pagesUp, ...noRetry }, ...quiet });
    expect(s1.origins['history/daily.json']).toBe('pages');
    expect(s1.history.points[0].date).toBe('2026-10-20');

    const pagesDown = (async () => json({}, 503)) as typeof fetch;
    const s2 = await loadState({ dataBaseUrl: 'https://p.example/r', storeDir: store, outDir: tmp(), now: NOW, http: { fetchImpl: pagesDown, ...noRetry }, ...quiet });
    expect(s2.origins['history/daily.json']).toBe('store');
    expect(s2.history.points[0].date).toBe('2026-10-01');
  });

  it('Pages-ийн схем буруу бол store руу', async () => {
    const store = tmp();
    writeJson(path.join(store, 'history/daily.json'), { schemaVersion: 1, points: [] });
    const bad = (async () => json({ schemaVersion: 2 })) as typeof fetch;
    const s = await loadState({ dataBaseUrl: 'https://p.example', storeDir: store, outDir: tmp(), now: NOW, http: { fetchImpl: bad, ...noRetry }, ...quiet });
    expect(s.origins['history/daily.json']).toBe('store');
  });
});
