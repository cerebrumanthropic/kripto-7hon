// Нийтлэгдсэн тайлангийн шалгалт (SPEC §7.4) — цэвэр функц.
import type { Editorial, WeeklyAuto } from '../../src/types/schemas';

export type ValidationResult = { errors: string[]; warnings: string[] };

const isHttps = (u: string) => /^https:\/\//.test(u);

export function validateReport(e: Editorial, a: WeeklyAuto | null): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Редакторын хэсэг
  const h = e.headline.trim();
  if (h.length < 1 || h.length > 120) errors.push(`headline 1–120 тэмдэгт байх ёстой (одоо ${h.length})`);
  if (!e.summary.trim()) errors.push('summary хоосон');
  if (e.takeaways.length !== 3) errors.push(`takeaways яг 3 байх ёстой (одоо ${e.takeaways.length})`);
  e.takeaways.forEach((t, i) => {
    if (!t.trim()) errors.push(`takeaways[${i + 1}] хоосон`);
  });

  // ETF урсгал оруулсан бол эх сурвалжийн холбоос заавал
  const etfEntered = e.etf?.btc_net_flow_usd != null || e.etf?.eth_net_flow_usd != null;
  if (etfEntered && !e.etf?.source_url) errors.push('ETF урсгал оруулсан бол etf.source_url заавал');
  if (e.coinshares?.weekly_flow_usd != null && !e.coinshares.url) errors.push('coinshares.weekly_flow_usd оруулсан бол coinshares.url заавал');

  // Холбоосууд https://
  const links: Array<[string, string | undefined]> = [
    ['etf.source_url', e.etf?.source_url],
    ['coinshares.url', e.coinshares?.url],
    ...e.news_picks.map((u, i) => [`news_picks[${i + 1}]`, u] as [string, string]),
    ...e.mongolia.map((x, i) => [`mongolia[${i + 1}].url`, x.url] as [string, string]),
    ...e.regulation.map((x, i) => [`regulation[${i + 1}].url`, x.url] as [string, string]),
  ];
  for (const [name, url] of links) if (url && !isHttps(url)) errors.push(`${name} https://-ээр эхлэх ёстой`);

  // Автомат хэсэг
  if (!a) {
    errors.push('харгалзах <week>.json байхгүй эсвэл схемд тэнцээгүй');
    return { errors, warnings };
  }
  if (a.week !== e.week) errors.push(`долоо хоног зөрж байна (.md=${e.week}, .json=${a.week})`);
  for (const [name, v] of [
    ['BTC давамгайлал', a.global.btcDominancePct],
    ['ETH давамгайлал', a.global.ethDominancePct],
  ] as const) {
    if (v < 0 || v > 100) errors.push(`${name} 0–100 байх ёстой (${v})`);
  }
  if (a.fearGreed.value < 0 || a.fearGreed.value > 100) errors.push(`F&G 0–100 байх ёстой (${a.fearGreed.value})`);
  for (const m of [...a.majors, ...a.topGainers, ...a.topLosers, ...a.heatmapTop20]) {
    if (!(m.priceUsd > 0)) errors.push(`${m.symbol}: үнэ > 0 байх ёстой`);
  }
  for (const m of [...a.majors, ...a.topGainers, ...a.topLosers]) {
    if (Math.abs(m.change7dPct) > 60) warnings.push(`${m.symbol}: 7 хоногийн өөрчлөлт ${m.change7dPct}% (|%| > 60) — шалгаарай`);
  }
  if (a.global.change7dPct !== null && Math.abs(a.global.change7dPct) > 60) {
    warnings.push(`нийт зах зээлийн 7 хоногийн өөрчлөлт ${a.global.change7dPct}% — шалгаарай`);
  }
  return { errors, warnings: [...new Set(warnings)] };
}
