// Мэдээний ангилал (SPEC §5.5). Скрипт ба апп хуваалцана.
// Түлхүүр үг нь гарчгийн үгийн эхэнд таарна (\b), том жижиг үсэг үл хамаарна.
// Богино үгс (act, ban, fed …) бүтэн үгээр л таарна — «impact», «banner», «federal» буруу орохоос сэргийлнэ.
import type { NewsTag } from '@/types/schemas';

type Rule = { tag: Exclude<NewsTag, 'market'>; stems: string[]; words: string[] };

const RULES: Rule[] = [
  {
    tag: 'regulation',
    stems: ['regulat', 'licen', 'lawsuit', 'sanction', 'legislat'],
    words: ['sec', 'cftc', 'law', 'laws', 'bill', 'act', 'mica', 'fatf', 'ban', 'bans', 'banned', 'court', 'tax', 'taxes'],
  },
  {
    tag: 'etf',
    stems: ['inflow', 'outflow', 'blackrock', 'grayscale'],
    words: ['etf', 'etfs', 'etp', 'etps', 'fund flow', 'fund flows', 'ibit'],
  },
  {
    tag: 'security',
    stems: ['hack', 'exploit', 'drain', 'stolen', 'phishing', 'breach', 'attack', 'scam'],
    words: [],
  },
  {
    tag: 'macro',
    stems: ['inflation', 'treasur', 'recession', 'tariff'],
    words: ['fed', 'fomc', 'cpi', 'rate cut', 'rate cuts', 'rate hike', 'rate hikes', 'dollar'],
  },
  {
    tag: 'stablecoin',
    stems: ['stablecoin', 'tether'],
    words: ['usdt', 'usdc', 'circle'],
  },
  {
    tag: 'defi',
    stems: ['defi', 'uniswap', 'aave', 'lending'],
    words: ['dex', 'dexs', 'dexes', 'tvl'],
  },
  {
    tag: 'mining',
    stems: ['mining', 'miner', 'hashrate', 'halving'],
    words: [],
  },
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const COMPILED = RULES.map((r) => ({
  tag: r.tag,
  re: new RegExp(
    [...r.stems.map((s) => `\\b${escape(s)}`), ...r.words.map((w) => `\\b${escape(w)}\\b`)].join('|'),
    'i',
  ),
}));

const MONGOLIA_RE = /\b(mongolia|mongolian|ulaanbaatar)\b|монгол|улаанбаатар/i;

/** Гарчгаас ангиллын жагсаалт; аль нь ч таарахгүй бол ['market']. */
export function classify(title: string): NewsTag[] {
  const tags = COMPILED.filter((r) => r.re.test(title)).map((r) => r.tag);
  return tags.length > 0 ? tags : ['market'];
}

/** Монголтой холбоотой эсэх: гарчиг эсвэл монгол эх сурвалж. */
export function isMongolia(title: string, sourceIsMongolian = false): boolean {
  return sourceIsMongolian || MONGOLIA_RE.test(title);
}
