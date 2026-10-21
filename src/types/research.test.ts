import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { ResearchSchema } from './research';

const raw = JSON.parse(
  readFileSync(path.join(process.cwd(), 'content', 'research.json'), 'utf8'),
) as unknown;

describe('content/research.json', () => {
  it('схемд тэнцэнэ', () => {
    const parsed = ResearchSchema.safeParse(raw);
    if (!parsed.success) console.error(parsed.error.issues.slice(0, 5));
    expect(parsed.success).toBe(true);
  });

  it('метрикийн матрицын мөр бүр нийтлэгчийн тоотой тэнцүү утгатай', () => {
    const r = ResearchSchema.parse(raw);
    for (const row of r.metricsMatrix.rows) {
      expect(row.values).toHaveLength(r.metricsMatrix.publishers.length);
    }
  });

  it('Монголын статистикийн мөр бүр баганын тоотой тэнцүү', () => {
    const r = ResearchSchema.parse(raw);
    for (const row of r.mongolia.stats.rows) {
      expect(row.values).toHaveLength(r.mongolia.stats.columns.length);
    }
  });

  it('бүх холбоос https', () => {
    const urls = JSON.stringify(raw).match(/"(?:url|sourceUrl|verifyUrl)":"([^"]+)"/g) ?? [];
    expect(urls.length).toBeGreaterThan(50);
    for (const u of urls) expect(u).toMatch(/"https:\/\//);
  });
});
