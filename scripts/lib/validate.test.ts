import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { EditorialSchema, WeeklyAutoSchema, type Editorial } from '../../src/types/schemas';

import { validateReport } from './validate';

const auto = WeeklyAutoSchema.parse(
  JSON.parse(readFileSync(path.join(process.cwd(), 'scripts', '__fixtures__', 'reports', '2026-W42.json'), 'utf8')),
);
const ed = (over: Partial<Editorial> = {}): Editorial =>
  EditorialSchema.parse({
    week: '2026-W42',
    status: 'published',
    headline: 'BTC 4.2 хувиар буурав',
    summary: 'Товч.',
    takeaways: ['a 1', 'b 2', 'c 3'],
    ...over,
  });

describe('validateReport', () => {
  it('зөв тайлан алдаагүй', () => {
    expect(validateReport(ed(), auto).errors).toEqual([]);
  });

  it('headline, summary, takeaways', () => {
    const r = validateReport(ed({ headline: '', summary: ' ', takeaways: ['x', ''] }), auto);
    expect(r.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('headline'),
        expect.stringContaining('summary'),
        expect.stringContaining('яг 3'),
        expect.stringContaining('takeaways[2]'),
      ]),
    );
  });

  it('ETF урсгал оруулсан бол source_url заавал; холбоос https', () => {
    const r = validateReport(
      ed({
        etf: { btc_net_flow_usd: -1e9, source_url: '' },
        mongolia: [{ text: 't', url: 'https://ok.mn' }],
        news_picks: ['http://insecure.example'],
      }),
      auto,
    );
    expect(r.errors.some((e) => e.includes('etf.source_url заавал'))).toBe(true);
    expect(r.errors.some((e) => e.includes('news_picks[1]'))).toBe(true);
  });

  it('.json байхгүй эсвэл долоо хоног зөрвөл алдаа', () => {
    expect(validateReport(ed(), null).errors.some((e) => e.includes('.json'))).toBe(true);
    expect(validateReport(ed({ week: '2026-W41' }), auto).errors.some((e) => e.includes('зөрж'))).toBe(true);
  });

  it('логик шалгалт: давамгайлал, F&G алдаа; |%|>60 анхааруулга', () => {
    const bad = { ...auto, global: { ...auto.global, btcDominancePct: 120 }, fearGreed: { ...auto.fearGreed, value: 101 } };
    const r = validateReport(ed(), bad);
    expect(r.errors.some((e) => e.includes('BTC давамгайлал'))).toBe(true);
    expect(r.errors.some((e) => e.includes('F&G'))).toBe(true);
    const spike = { ...auto, topGainers: [{ ...auto.topGainers[0], change7dPct: 75 }] };
    const r2 = validateReport(ed(), spike);
    expect(r2.errors).toEqual([]);
    expect(r2.warnings.some((w) => w.includes('|%| > 60'))).toBe(true);
  });
});
