// 7 хоногийн тайлангийн «Зах зээл тоогоор» хүснэгт (SPEC §8.5.2) — цэвэр тооцоо.
import type { WeeklyAuto } from '@/types/schemas';

import { MINUS, groupDigits, pct, pctPlain, price, usdCompact } from './format';

export type NumberRow = {
  key: string;
  label: string;
  now: string;
  prev: string;
  /** Чиглэл тодорхойлох тоо (эерэг = өсөлт) */
  change: number | null;
  changeText: string;
};

const signed = (v: number, decimals: number, unit = '') => {
  const r = Number(v.toFixed(decimals));
  if (r === 0) return `${(0).toFixed(decimals)}${unit}`;
  return `${r > 0 ? '+' : MINUS}${groupDigits(Math.abs(r), decimals)}${unit}`;
};

/** Өмнөх утгыг өөрчлөлтийн хувиас сэргээнэ: now / (1 + pct/100). */
export function prevFromPct(now: number, changePct: number | null): number | null {
  if (changePct === null || changePct <= -100) return null;
  return now / (1 + changePct / 100);
}

export function byNumbers(a: WeeklyAuto, labels: Record<string, string>): NumberRow[] {
  const rows: NumberRow[] = [];
  const pctRow = (key: string, now: number, prev: number | null, change: number | null, fmt: (v: number) => string) =>
    rows.push({
      key,
      label: labels[key],
      now: fmt(now),
      prev: prev === null ? '—' : fmt(prev),
      change,
      changeText: pct(change),
    });

  pctRow(
    'mcap',
    a.global.totalMarketCapUsd,
    a.global.totalMarketCapUsd7dAgo ?? prevFromPct(a.global.totalMarketCapUsd, a.global.change7dPct),
    a.global.change7dPct,
    usdCompact,
  );
  for (const m of a.majors) {
    pctRow(m.symbol.toLowerCase(), m.priceUsd, prevFromPct(m.priceUsd, m.change7dPct), m.change7dPct, price);
  }

  const dom = a.global.btcDominancePct;
  const domPrev = a.global.btcDominancePct7dAgo;
  rows.push({
    key: 'dominance',
    label: labels.dominance,
    now: pctPlain(dom),
    prev: domPrev === null ? '—' : pctPlain(domPrev),
    change: domPrev === null ? null : dom - domPrev,
    // нэгж хувь (percentage point)
    changeText: domPrev === null ? '—' : signed(dom - domPrev, 1, ' н.х'),
  });

  pctRow(
    'stable',
    a.stablecoins.totalUsd,
    prevFromPct(a.stablecoins.totalUsd, a.stablecoins.change7dPct),
    a.stablecoins.change7dPct,
    usdCompact,
  );
  pctRow('tvl', a.defi.tvlUsd, prevFromPct(a.defi.tvlUsd, a.defi.change7dPct), a.defi.change7dPct, usdCompact);

  const fg = a.fearGreed;
  rows.push({
    key: 'fg',
    label: labels.fg,
    now: `${fg.value} (${fg.labelMn})`,
    prev: fg.value7dAgo === null ? '—' : String(fg.value7dAgo),
    change: fg.value7dAgo === null ? null : fg.value - fg.value7dAgo,
    changeText: fg.value7dAgo === null ? '—' : signed(fg.value - fg.value7dAgo, 0),
  });

  return rows;
}
