// content/research.json-ийн схем. Судалгааны контентын цорын ганц эх (CLAUDE.md).
// Илүү талбарыг зөвшөөрнө (looseObject) — контент засварлагдахад UI эвдрэхгүй.
import { z } from 'zod';

const link = z.looseObject({ label: z.string(), url: z.string().url() });
// Нэмэлт лавлахын зарим нэр холбоосгүй (url: null)
const named = z.looseObject({ name: z.string(), url: z.string().url().nullable() });

export const ResearchSchema = z.looseObject({
  schemaVersion: z.literal(1),
  meta: z.looseObject({
    title: z.string(),
    compiledAt: z.string(),
    note: z.string(),
    disclaimer: z.string(),
  }),
  summary: z.array(z.string()),
  keyFindings: z.array(z.looseObject({ title: z.string(), text: z.string() })),
  internationalExamples: z.array(
    z.looseObject({
      id: z.string(),
      name: z.string(),
      publisher: z.string(),
      frequency: z.string(),
      format: z.string(),
      metrics: z.array(z.string()),
      structure: z.string(),
      design: z.string(),
      distribution: z.string(),
      pricing: z.string(),
      verified2026: z.boolean(),
      urls: z.array(link),
    }),
  ),
  regulators: z.array(
    z.looseObject({
      id: z.string(),
      name: z.string(),
      frequency: z.string(),
      keyData: z.string(),
      urls: z.array(link),
    }),
  ),
  additionalReferences: z.looseObject({
    note: z.string(),
    groups: z.array(z.looseObject({ category: z.string(), items: z.array(named) })),
  }),
  metricsMatrix: z.looseObject({
    legend: z.record(z.string(), z.string()),
    publishers: z.array(z.looseObject({ id: z.string(), label: z.string() })),
    rows: z.array(
      z.looseObject({
        metric: z.string(),
        values: z.array(z.string()),
        presentation: z.string(),
      }),
    ),
  }),
  coreMetrics: z.array(z.string()),
  differentiatingMetrics: z.array(z.string()),
  sectionOrder: z.array(z.string()),
  headlineFormula: z.looseObject({
    rule: z.string(),
    examples: z.array(z.looseObject({ source: z.string(), text: z.string() })),
    mongolianExample: z.string(),
  }),
  designPractices: z.looseObject({
    infographicLayout: z.array(z.string()),
    chartTypes: z.array(z.looseObject({ type: z.string(), use: z.string() })),
    color: z.array(z.string()),
    disclaimerExampleMn: z.string(),
    citation: z.string(),
    tools: z.array(z.looseObject({ name: z.string(), use: z.string(), url: z.string().url() })),
  }),
  dataSources: z.array(
    z.looseObject({
      name: z.string(),
      provides: z.string(),
      free: z.string(),
      paid: z.string(),
      terms: z.string(),
      url: z.string().url(),
      usedByPlatform: z.boolean(),
    }),
  ),
  weeklyTemplate: z.looseObject({
    formats: z.array(
      z.looseObject({ name: z.string(), schedule: z.string(), channel: z.string(), size: z.string() }),
    ),
    briefSections: z.array(z.string()),
    monthlyAddOns: z.array(z.string()),
  }),
  productionSchedule: z.array(
    z.looseObject({ timeUb: z.string(), task: z.string(), owner: z.string() }),
  ),
  mongolia: z.looseObject({
    legal: z.array(z.string()),
    vasps: z.looseObject({
      note: z.string(),
      sourceUrl: z.string().url(),
      verifyUrl: z.string().url(),
      items: z.array(
        z.looseObject({
          no: z.number(),
          company: z.string(),
          platform: z.string(),
          registeredAt: z.string(),
        }),
      ),
    }),
    stats: z.looseObject({
      source: z.string(),
      columns: z.array(z.string()),
      rows: z.array(z.looseObject({ metric: z.string(), values: z.array(z.string()) })),
      footnotes: z.array(z.string()),
    }),
    marketShare2023: z.looseObject({
      note: z.string(),
      items: z.array(z.looseObject({ platform: z.string(), sharePct: z.number() })),
      top3SharePct: z.number(),
    }),
    dataAvailability: z.array(z.string()),
    links: z.array(link),
  }),
  glossary: z.array(z.looseObject({ mn: z.string(), en: z.string() })),
  caveats: z.array(z.string()),
  sources: z.array(z.looseObject({ title: z.string(), url: z.string().url() })),
});
export type Research = z.infer<typeof ResearchSchema>;
