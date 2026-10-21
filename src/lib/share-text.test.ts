import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { mergeReport } from '../../scripts/lib/reports';
import { WeeklyAutoSchema } from '@/types/schemas';

import { buildShareText } from './share-text';

const dir = path.join(process.cwd(), 'scripts', '__fixtures__', 'reports');
const report = mergeReport(
  WeeklyAutoSchema.parse(JSON.parse(readFileSync(path.join(dir, '2026-W42.json'), 'utf8'))),
  readFileSync(path.join(dir, '2026-W42.md'), 'utf8'),
);

describe('buildShareText', () => {
  const text = buildShareText(report, 'https://site.example');

  it('гарчиг, 3 гол санаа, тоонууд, холбоос', () => {
    expect(text).toContain('2026 оны 42 дугаар долоо хоног (10.12–10.18)');
    expect(text).toContain(report.editorial.headline);
    for (const x of report.editorial.takeaways) expect(text).toContain(`• ${x}`);
    expect(text).toContain('• Биткойны үнэ: $67,120 (▼ −4.2%)');
    expect(text).toContain('https://site.example/tailan/2026-W42');
  });

  it('Монгол, хуанли, эх сурвалж, анхааруулга', () => {
    expect(text).toContain('USD/MNT');
    expect(text).toContain('• 10.21 — АНУ-ын FOMC хурлын тэмдэглэл');
    expect(text).toContain('CoinGecko');
    expect(text).toContain('Хөрөнгө оруулалтын зөвлөгөө биш');
  });

  it('HTML/Markdown тэмдэглэгээгүй цэвэр текст', () => {
    expect(text).not.toMatch(/<[a-z]|\*\*|\]\(/i);
  });
});
