// Мэдээний гарчгийн өнгө аяс: эерэг / сөрөг / төвийг сахисан (PROGRESS D74).
// Түлхүүр үгийн оноо: эерэг үг +1, сөрөг үг −1. Нийлбэр > 0 → эерэг, < 0 → сөрөг, 0 → төвийг сахисан.
// Энгийн дүрэм тул алдаатай ангилах тохиолдол гарна — UI-д «автомат ангилал» гэж тэмдэглэнэ.

export type Sentiment = 'positive' | 'negative' | 'neutral';

type Lexicon = {
  /** Үгийн эхэнд таарна (\b + язгуур): «rall» → rally, rallies */
  stems: string[];
  /** Зөвхөн бүтэн үгээр: «ban» нь «banner»-т таарахгүй */
  words: string[];
};

const POSITIVE: Lexicon = {
  stems: ['surg', 'soar', 'rall', 'gain', 'jump', 'climb', 'rebound', 'recover', 'bullish', 'breakout', 'all-time high', 'record high',
    'approv', 'launch', 'partner', 'adopt', 'embrac', 'inflow', 'boost', 'expan', 'grow', 'integrat', 'upgrade', 'milestone',
    'replenish', 'restor', 'resum', 'held up', 'profit', 'outperform'],
  words: ['win', 'wins', 'won', 'beat', 'beats', 'raise', 'raises', 'raised', 'secures', 'secured', 'reopen', 'reopens', 'opens', 'bull'],
};

const NEGATIVE: Lexicon = {
  stems: ['plung', 'crash', 'slump', 'tumbl', 'declin', 'hack', 'exploit', 'stolen', 'steal', 'theft', 'heist', 'drain', 'launder',
    'scam', 'fraud', 'phishing', 'breach', 'malicious', 'lawsuit', 'arrest', 'sentenc', 'prison', 'robber', 'kidnap', 'crackdown',
    'penalt', 'outflow', 'bearish', 'liquidat', 'warn', 'threat', 'collaps', 'bankrupt', 'insolven', 'suspend', 'freez', 'seiz',
    'scrutin', 'investigat', 'vulnerab', 'outage', 'layoff', 'reject', 'wipe', 'wiping', 'clash', 'incident', 'bailout'],
  words: ['drop', 'drops', 'dropped', 'fall', 'falls', 'fell', 'slide', 'slides', 'slid', 'sink', 'sinks', 'sank', 'loss', 'losses',
    'lose', 'loses', 'lost', 'sue', 'sues', 'sued', 'charged', 'ban', 'bans', 'banned', 'fine', 'fined', 'delay', 'delays', 'delayed',
    'halt', 'halts', 'halted', 'probe', 'bug', 'bugs', 'flee', 'exit', 'exits', 'problem', 'problems', 'risk', 'risks', 'fear', 'fears',
    'limits', 'cheat', 'bear', 'bears'],
};

// Монгол (Ikon.mn г.м.): JS-ийн \b кириллд ажилладаггүй тул дэд мөрөөр таарна
const POSITIVE_MN = ['өс', 'нэм', 'дээшил', 'сэргэ', 'батал', 'зөвшөөр', 'нээ'];
const NEGATIVE_MN = ['буур', 'унал', 'хулгай', 'луйв', 'залилан', 'хакер', 'торгу', 'хориг', 'баривчил', 'алдагдал'];

const esc = (x: string) => x.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
const pattern = ({ stems, words }: Lexicon) =>
  new RegExp(`\\b(?:(?:${stems.map(esc).join('|')})|(?:${words.map(esc).join('|')})\\b)`, 'gi');
const POS_RE = pattern(POSITIVE);
const NEG_RE = pattern(NEGATIVE);

export function sentimentScore(title: string): number {
  const lower = title.toLowerCase();
  const hits = (re: RegExp) => title.match(re)?.length ?? 0;
  const mn = (stems: string[]) => stems.filter((s) => lower.includes(s)).length;
  return hits(POS_RE) + mn(POSITIVE_MN) - hits(NEG_RE) - mn(NEGATIVE_MN);
}

export function sentiment(title: string): Sentiment {
  const s = sentimentScore(title);
  return s > 0 ? 'positive' : s < 0 ? 'negative' : 'neutral';
}

/** Мэдээг гурван бүлэгт хуваана (дараалал хадгалагдана). */
export function splitBySentiment<T extends { title: string }>(items: T[]): Record<Sentiment, T[]> {
  const out: Record<Sentiment, T[]> = { positive: [], negative: [], neutral: [] };
  for (const item of items) out[sentiment(item.title)].push(item);
  return out;
}
