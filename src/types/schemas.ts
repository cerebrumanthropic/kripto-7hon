// Zod схемүүд (SPEC §6). Апп ба скриптүүд хуваалцана.
import { z } from 'zod';

const iso = z.string().min(10);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const week = z.string().regex(/^\d{4}-W\d{2}$/);
const url = z.string().regex(/^https:\/\//);

export const SourceStatusSchema = z.object({
  id: z.string(),
  ok: z.boolean(),
  fetchedAt: iso,
  stale: z.boolean().optional(),
  error: z.string().optional(),
});
export type SourceStatus = z.infer<typeof SourceStatusSchema>;

export const LiveCoinSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  name: z.string(),
  rank: z.number(),
  priceUsd: z.number(),
  priceMnt: z.number().nullable(),
  change24hPct: z.number().nullable(),
  change7dPct: z.number().nullable(),
  marketCapUsd: z.number(),
  volume24hUsd: z.number(),
  isStablecoin: z.boolean(),
});
export type LiveCoin = z.infer<typeof LiveCoinSchema>;

export const LiveMarketSchema = z.object({
  schemaVersion: z.literal(1),
  updatedAt: iso,
  sources: z.array(SourceStatusSchema),
  global: z
    .object({
      totalMarketCapUsd: z.number(),
      totalVolume24hUsd: z.number(),
      marketCapChange24hPct: z.number(),
      btcDominancePct: z.number(),
      ethDominancePct: z.number(),
      activeCryptocurrencies: z.number(),
    })
    .nullable(),
  coins: z.array(LiveCoinSchema),
  trending: z.array(
    z.object({ id: z.string(), symbol: z.string(), name: z.string(), rank: z.number().nullable() }),
  ),
  fearGreed: z
    .object({
      value: z.number().min(0).max(100),
      labelEn: z.string(),
      labelMn: z.string(),
      timestamp: iso,
      history: z.array(z.object({ date: day, value: z.number() })),
    })
    .nullable(),
  stablecoins: z
    .object({
      totalUsd: z.number(),
      change7dPct: z.number().nullable(),
      top: z.array(
        z.object({
          symbol: z.string(),
          name: z.string(),
          circulatingUsd: z.number(),
          change7dPct: z.number().nullable(),
        }),
      ),
    })
    .nullable(),
  defi: z
    .object({
      tvlUsd: z.number(),
      change7dPct: z.number().nullable(),
      dexVolume24hUsd: z.number().nullable(),
      dexVolume7dUsd: z.number().nullable(),
    })
    .nullable(),
  fx: z
    .object({ usdMnt: z.number(), source: z.literal('exchangerate-api'), asOf: iso })
    .nullable(),
});
export type LiveMarket = z.infer<typeof LiveMarketSchema>;

export const NEWS_TAGS = [
  'regulation',
  'etf',
  'security',
  'macro',
  'stablecoin',
  'defi',
  'mining',
  'market',
] as const;
export const NewsTagSchema = z.enum(NEWS_TAGS);
export type NewsTag = z.infer<typeof NewsTagSchema>;

export const NewsItemSchema = z.object({
  id: z.string().length(12),
  title: z.string(),
  url,
  source: z.string(),
  sourceUrl: url,
  publishedAt: iso,
  tags: z.array(NewsTagSchema).min(1),
  isMongolia: z.boolean(),
});
export type NewsItem = z.infer<typeof NewsItemSchema>;

export const NewsFeedSchema = z.object({
  schemaVersion: z.literal(1),
  updatedAt: iso,
  sources: z.array(SourceStatusSchema),
  items: z.array(NewsItemSchema),
});
export type NewsFeed = z.infer<typeof NewsFeedSchema>;

export const DailyPointSchema = z.object({
  date: day,
  totalMarketCapUsd: z.number().nullable(),
  totalVolume24hUsd: z.number().nullable(),
  btcDominancePct: z.number().nullable(),
  btcUsd: z.number().nullable(),
  ethUsd: z.number().nullable(),
  stablecoinsUsd: z.number().nullable(),
  defiTvlUsd: z.number().nullable(),
  fearGreed: z.number().nullable(),
  usdMnt: z.number().nullable(),
  provisional: z.boolean().optional(),
});
export type DailyPoint = z.infer<typeof DailyPointSchema>;

export const DailyHistorySchema = z.object({
  schemaVersion: z.literal(1),
  points: z.array(DailyPointSchema),
});
export type DailyHistory = z.infer<typeof DailyHistorySchema>;

export const NewsWeekArchiveSchema = z.object({
  schemaVersion: z.literal(1),
  week,
  items: z.array(NewsItemSchema),
});
export type NewsWeekArchive = z.infer<typeof NewsWeekArchiveSchema>;

export const LiveStatusSchema = z.object({
  schemaVersion: z.literal(1),
  updatedAt: iso,
  sources: z.array(SourceStatusSchema),
  coingeckoCallsThisRun: z.number(),
});
export type LiveStatus = z.infer<typeof LiveStatusSchema>;

export const CoinMoveSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  priceUsd: z.number(),
  change7dPct: z.number(),
  marketCapUsd: z.number(),
});
export type CoinMove = z.infer<typeof CoinMoveSchema>;

export const WeeklyAutoSchema = z.object({
  schemaVersion: z.literal(1),
  week,
  periodStart: day,
  periodEnd: day,
  cutoffUtc: iso,
  fetchedAt: iso,
  global: z.object({
    totalMarketCapUsd: z.number(),
    totalMarketCapUsd7dAgo: z.number().nullable(),
    change7dPct: z.number().nullable(),
    change7dMethod: z.enum(['history', 'top100-estimate']).nullable(),
    btcDominancePct: z.number().min(0).max(100),
    btcDominancePct7dAgo: z.number().nullable(),
    ethDominancePct: z.number().min(0).max(100),
    totalVolume24hUsd: z.number(),
  }),
  majors: z.array(
    z.object({
      symbol: z.enum(['BTC', 'ETH']),
      priceUsd: z.number().positive(),
      priceMnt: z.number().nullable(),
      change7dPct: z.number(),
      change30dPct: z.number().nullable(),
      chart30d: z.array(z.object({ date: day, priceUsd: z.number() })),
    }),
  ),
  topGainers: z.array(CoinMoveSchema),
  topLosers: z.array(CoinMoveSchema),
  heatmapTop20: z.array(CoinMoveSchema),
  stablecoins: z.object({
    totalUsd: z.number(),
    change7dPct: z.number().nullable(),
    top: z.array(
      z.object({
        symbol: z.string(),
        circulatingUsd: z.number(),
        change7dPct: z.number().nullable(),
      }),
    ),
  }),
  defi: z.object({
    tvlUsd: z.number(),
    change7dPct: z.number().nullable(),
    dexVolume7dUsd: z.number().nullable(),
    dexChange7dPct: z.number().nullable(),
  }),
  fearGreed: z.object({
    value: z.number().min(0).max(100),
    labelMn: z.string(),
    value7dAgo: z.number().nullable(),
    series7d: z.array(z.object({ date: day, value: z.number() })),
  }),
  fx: z.object({ usdMnt: z.number(), source: z.string(), asOf: iso }).nullable(),
  trending: z.array(z.object({ symbol: z.string(), name: z.string() })),
  newsCandidates: z.array(NewsItemSchema),
  hacks: z
    .array(
      z.object({
        name: z.string(),
        date: day,
        amountUsd: z.number().nullable(),
        url: url.optional(),
      }),
    )
    .nullable(),
  suggestedSentences: z.array(z.string()),
  sources: z.array(SourceStatusSchema),
});
export type WeeklyAuto = z.infer<typeof WeeklyAutoSchema>;

const linkItem = z.object({ text: z.string(), url });

// content/reports/<week>.md frontmatter (SPEC §6.1)
export const EditorialSchema = z.object({
  week,
  status: z.enum(['draft', 'published']),
  headline: z.string().max(120),
  summary: z.string(),
  takeaways: z.array(z.string()),
  etf: z
    .object({
      btc_net_flow_usd: z.number().nullable(),
      eth_net_flow_usd: z.number().nullable(),
      source_name: z.string(),
      source_url: z.string(),
    })
    .partial()
    .optional(),
  coinshares: z
    .object({ weekly_flow_usd: z.number().nullable(), url: z.string() })
    .partial()
    .optional(),
  mongolbank_usd_mnt: z.number().nullable().optional(),
  news_picks: z.array(z.string()).default([]),
  mongolia: z.array(linkItem).default([]),
  regulation: z.array(linkItem).default([]),
  calendar: z.array(z.object({ date: day, event: z.string() })).default([]),
  author: z.string().default(''),
  corrections: z.array(z.object({ date: day, text: z.string() })).default([]),
});
export type Editorial = z.infer<typeof EditorialSchema>;

export const BlockSchema = z.object({ type: z.enum(['p', 'li', 'h3']), text: z.string() });
export type Block = z.infer<typeof BlockSchema>;

// public/reports/<week>.json — prepare-build-ийн нэгтгэсэн тайлан (SPEC §6.2)
export const MergedReportSchema = z.object({
  auto: WeeklyAutoSchema,
  editorial: EditorialSchema,
  body: z.array(BlockSchema),
  publishedAt: iso,
  sample: z.boolean().optional(),
});
export type MergedReport = z.infer<typeof MergedReportSchema>;

// content/reports/index.json (PROGRESS D1 — build-ийн бүтээгдэхүүн)
export const ReportIndexEntrySchema = z.object({
  week,
  periodStart: day,
  periodEnd: day,
  headline: z.string(),
  summary: z.string(),
  btcChange7dPct: z.number().nullable(),
  totalMarketCapUsd: z.number(),
  fearGreed: z.number().nullable(),
  publishedAt: iso,
  sample: z.boolean().optional(),
});
export const ReportIndexSchema = z.array(ReportIndexEntrySchema);
export type ReportIndexEntry = z.infer<typeof ReportIndexEntrySchema>;
