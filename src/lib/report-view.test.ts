import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { WeeklyAutoSchema } from '@/types/schemas';

import { byNumbers, prevFromPct } from './report-view';

const auto = WeeklyAutoSchema.parse(
  JSON.parse(readFileSync(path.join(process.cwd(), 'scripts', '__fixtures__', 'reports', '2026-W42.json'), 'utf8')),
);
const labels = { mcap: 'M', btc: 'B', eth: 'E', dominance: 'D', stable: 'S', tvl: 'T', fg: 'F' };

describe('report-view', () => {
  it('prevFromPct', () => {
    expect(prevFromPct(110, 10)).toBeCloseTo(100);
    expect(prevFromPct(110, null)).toBeNull();
    expect(prevFromPct(1, -100)).toBeNull();
  });

  it('byNumbers 7 мөр (SPEC: 6–8), өмнөх 7 хоногтой харьцуулна', () => {
    const rows = byNumbers(auto, labels);
    expect(rows.map((r) => r.key)).toEqual(['mcap', 'btc', 'eth', 'dominance', 'stable', 'tvl', 'fg']);
    const btc = rows.find((r) => r.key === 'btc')!;
    expect(btc.now).toBe('$67,120');
    expect(btc.changeText).toBe('−4.2%');
    const dom = rows.find((r) => r.key === 'dominance')!;
    expect(dom.changeText).toBe('+0.7 н.х');
    const fg = rows.find((r) => r.key === 'fg')!;
    expect(fg.now).toBe('34 (Айдас)');
    expect(fg.changeText).toBe('−18');
    expect(fg.change).toBe(-18);
  });
});
