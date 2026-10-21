import { describe, expect, it } from 'vitest';

import {
  formatDate,
  formatDateTime,
  isStale,
  isoWeek,
  ordinalSuffix,
  relativeTime,
  weekLabel,
  weekRange,
  weekShortLabel,
} from './dates';

describe('УБ цаг', () => {
  it('UTC-ээс +8', () => {
    expect(formatDateTime('2026-10-21T06:07:00Z')).toBe('2026.10.21 14:07 (УБ)');
  });
  it('өдрийн хил давна', () => {
    expect(formatDate('2026-10-20T17:30:00Z')).toBe('2026.10.21');
  });
});

describe('ISO долоо хоног (UTC)', () => {
  it('2026-W43 = 10.19–10.25', () => {
    expect(weekRange('2026-W43')).toEqual({
      start: '2026-10-19',
      end: '2026-10-25',
      cutoffUtc: '2026-10-25T23:59:59Z',
    });
    expect(isoWeek('2026-10-19T00:00:00Z')).toBe('2026-W43');
    expect(isoWeek('2026-10-25T23:59:59Z')).toBe('2026-W43');
    expect(isoWeek('2026-10-26T00:00:00Z')).toBe('2026-W44');
  });
  it('оны заагийн долоо хоног', () => {
    expect(isoWeek('2026-01-01T12:00:00Z')).toBe('2026-W01');
    expect(isoWeek('2025-12-29T00:00:00Z')).toBe('2026-W01');
    expect(isoWeek('2027-01-01T00:00:00Z')).toBe('2026-W53');
    expect(weekRange('2026-W01').start).toBe('2025-12-29');
  });
  it('Ням 23:55-аас 12 цаг хасахад тухайн 7 хоног хэвээр (SPEC §7.3.1)', () => {
    const run = new Date('2026-10-25T23:55:00Z');
    expect(isoWeek(new Date(run.getTime() - 12 * 3600_000))).toBe('2026-W43');
    const late = new Date('2026-10-26T03:00:00Z');
    expect(isoWeek(new Date(late.getTime() - 12 * 3600_000))).toBe('2026-W43');
  });
  it('буруу оролт', () => {
    expect(() => weekRange('2026-43')).toThrow();
    expect(() => weekRange('2026-W54')).toThrow();
  });
});

describe('монгол залгавар', () => {
  it.each([
    [1, 'дүгээр'],
    [2, 'дугаар'],
    [4, 'дүгээр'],
    [9, 'дүгээр'],
    [10, 'дугаар'],
    [20, 'дугаар'],
    [40, 'дүгээр'],
    [41, 'дүгээр'],
    [43, 'дугаар'],
    [50, 'дугаар'],
    [53, 'дугаар'],
  ])('%i → %s', (n, s) => {
    expect(ordinalSuffix(n)).toBe(s);
  });
  it('шошго', () => {
    expect(weekLabel('2026-W43')).toBe('2026 оны 43 дугаар долоо хоног (10.19–10.25)');
    expect(weekShortLabel('2026-W41')).toBe('2026 · 41 дүгээр 7 хоног');
  });
});

describe('харьцангуй цаг ба хоцролт', () => {
  const now = new Date('2026-10-21T12:00:00Z');
  it('relativeTime', () => {
    expect(relativeTime('2026-10-21T11:59:40Z', now)).toBe('саяхан');
    expect(relativeTime('2026-10-21T11:15:00Z', now)).toBe('45 минутын өмнө');
    expect(relativeTime('2026-10-21T10:00:00Z', now)).toBe('2 цагийн өмнө');
    expect(relativeTime('2026-10-18T12:00:00Z', now)).toBe('3 өдрийн өмнө');
  });
  it('isStale 3 цаг', () => {
    expect(isStale('2026-10-21T09:30:00Z', now)).toBe(false);
    expect(isStale('2026-10-21T08:59:00Z', now)).toBe(true);
  });
});
