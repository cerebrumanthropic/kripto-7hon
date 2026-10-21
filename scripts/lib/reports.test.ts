import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { WeeklyAutoSchema } from '../../src/types/schemas';

import { indexEntry, mergeReport, parseEditorial, publishedAtFor, sortIndex } from './reports';

const dir = path.join(process.cwd(), 'scripts', '__fixtures__', 'reports');

describe('reports', () => {
  it('publishedAtFor: Даваа 12:00 УБ', () => {
    expect(publishedAtFor('2026-W43')).toBe('2026-10-26T04:00:00Z');
  });

  it('жишээ W42 тайлан нэгтгэгдэнэ', () => {
    const auto = WeeklyAutoSchema.parse(
      JSON.parse(readFileSync(path.join(dir, '2026-W42.json'), 'utf8')),
    );
    const merged = mergeReport(auto, readFileSync(path.join(dir, '2026-W42.md'), 'utf8'));
    expect(merged.editorial.status).toBe('published');
    expect(merged.editorial.takeaways).toHaveLength(3);
    expect(merged.editorial.calendar[0].date).toBe('2026-10-21');
    expect(merged.sample).toBe(true);
    expect(merged.body.some((b) => b.text.includes('Нууц'))).toBe(false);
    const entry = indexEntry(merged);
    expect(entry.btcChange7dPct).toBe(-4.2);
    expect(entry.sample).toBe(true);
  });

  it('долоо хоног зөрвөл алдаа', () => {
    const auto = WeeklyAutoSchema.parse(
      JSON.parse(readFileSync(path.join(dir, '2026-W42.json'), 'utf8')),
    );
    const md = readFileSync(path.join(dir, '2026-W42.md'), 'utf8').replace(
      'week: 2026-W42',
      'week: 2026-W41',
    );
    expect(() => mergeReport(auto, md)).toThrow(/зөрж/);
  });

  it('draft frontmatter', () => {
    const { editorial } = parseEditorial('---\nweek: 2026-W43\nstatus: draft\nheadline: ""\nsummary: ""\ntakeaways: []\n---\n');
    expect(editorial.status).toBe('draft');
    expect(editorial.news_picks).toEqual([]);
  });

  it('sortIndex шинэ нь эхэндээ', () => {
    const e = (week: string) => ({ week }) as never;
    expect(sortIndex([e('2026-W41'), e('2026-W43'), e('2025-W52')]).map((x: { week: string }) => x.week)).toEqual([
      '2026-W43',
      '2026-W41',
      '2025-W52',
    ]);
  });
});
