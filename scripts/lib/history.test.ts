import { describe, expect, it } from 'vitest';

import type { DailyHistory } from '../../src/types/schemas';

import { applyDailyClose, emptyHistory, withProvisional, type DailyValues } from './history';

const v = (over: Partial<DailyValues> = {}): DailyValues => ({
  totalMarketCapUsd: 2.4e12,
  totalVolume24hUsd: 9e10,
  btcDominancePct: 57,
  btcUsd: 68000,
  ethUsd: 2400,
  stablecoinsUsd: 3.1e11,
  defiTvlUsd: 1.1e11,
  fearGreed: 40,
  usdMnt: 3450,
  ...over,
});

describe('applyDailyClose', () => {
  it('шинэ өдрийн анхны ажиллалт өмнөх өдрийн цэгийг бичнэ', () => {
    const r = applyDailyClose(emptyHistory(), v(), new Date('2026-10-21T00:07:00Z'));
    expect(r.changed).toBe(true);
    expect(r.history.points).toEqual([{ date: '2026-10-20', ...v() }]);
  });

  it('тухайн өдрийн дараагийн ажиллалтууд өөрчлөхгүй', () => {
    const first = applyDailyClose(emptyHistory(), v(), new Date('2026-10-21T00:07:00Z')).history;
    const r = applyDailyClose(first, v({ btcUsd: 1 }), new Date('2026-10-21T13:07:00Z'));
    expect(r.changed).toBe(false);
    expect(r.history.points[0].btcUsd).toBe(68000);
  });

  it('06:00 UTC хүртэл null талбарыг нөхнө, дараа нь үгүй', () => {
    const first = applyDailyClose(emptyHistory(), v({ fearGreed: null }), new Date('2026-10-21T00:07:00Z')).history;
    const filled = applyDailyClose(first, v({ fearGreed: 33 }), new Date('2026-10-21T01:07:00Z'));
    expect(filled.changed).toBe(true);
    expect(filled.history.points[0].fearGreed).toBe(33);
    const late = applyDailyClose(first, v({ fearGreed: 33 }), new Date('2026-10-21T07:07:00Z'));
    expect(late.changed).toBe(false);
  });

  it('provisional цэгийг хасаж, эрэмбэлнэ', () => {
    const h: DailyHistory = {
      schemaVersion: 1,
      points: [
        { date: '2026-10-19', ...v() },
        { date: '2026-10-20', ...v(), provisional: true },
      ],
    };
    const r = applyDailyClose(h, v({ btcUsd: 70000 }), new Date('2026-10-21T00:07:00Z'));
    expect(r.history.points.map((p) => [p.date, p.btcUsd, p.provisional])).toEqual([
      ['2026-10-19', 68000, undefined],
      ['2026-10-20', 70000, undefined],
    ]);
  });
});

describe('withProvisional', () => {
  it('өнөөдрийн цэгийг provisional-аар нэмнэ (давхардуулахгүй)', () => {
    const base: DailyHistory = { schemaVersion: 1, points: [{ date: '2026-10-20', ...v() }] };
    const once = withProvisional(base, v({ btcUsd: 1 }), new Date('2026-10-21T05:00:00Z'));
    const twice = withProvisional(once, v({ btcUsd: 2 }), new Date('2026-10-21T06:00:00Z'));
    expect(twice.points).toHaveLength(2);
    expect(twice.points[1]).toMatchObject({ date: '2026-10-21', btcUsd: 2, provisional: true });
    expect(base.points).toHaveLength(1);
  });
});
