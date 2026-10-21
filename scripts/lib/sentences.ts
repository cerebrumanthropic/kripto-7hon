// Дүрэмд суурилсан монгол өгүүлбэр (SPEC §7.3.5).
// «%», «$» тэмдэгтэд залгавар залгахгүйн тулд «хувиар», «ам.доллар/ам.долларт» гэж үгээр бичнэ.
// 0.05%-иас бага өөрчлөлт → «бараг өөрчлөгдөөгүй».
import { direction, groupDigits } from '../../src/lib/format';
import type { WeeklyAuto } from '../../src/types/schemas';

export type UsdCase = 'nom' | 'dat'; // «ам.доллар» | «ам.долларт»

const USD: Record<UsdCase, string> = { nom: 'ам.доллар', dat: 'ам.долларт' };

/** 2.45e12 → «2.45 их наяд ам.доллар»; 3.124e11 → «312.4 тэрбум …»; 68450 → «68,450 …» */
export function usdWords(v: number, c: UsdCase = 'nom'): string {
  const a = Math.abs(v);
  let n: string;
  if (a >= 1e12) n = `${(a / 1e12).toFixed(2)} их наяд`;
  else if (a >= 1e9) n = `${(a / 1e9).toFixed(1)} тэрбум`;
  else if (a >= 1e6) n = `${(a / 1e6).toFixed(1)} сая`;
  else if (a >= 1000) n = groupDigits(a, 0);
  else if (a >= 1) n = groupDigits(a, 2);
  else n = a.toPrecision(4);
  return `${n} ${USD[c]}`;
}

/** 4.234 → «4.2 хувиар» (тэмдэггүй) */
export const pctWords = (v: number) => `${groupDigits(Math.abs(v), 1)} хувиар`;
/** 57.84 → «57.8 хувь» */
export const pctNoun = (v: number) => `${groupDigits(v, 1)} хувь`;

type Verb = { grow: string; fall: string };
const CONVERB: Verb = { grow: 'өсөж', fall: 'буурч' }; // нийлмэл өгүүлбэрийн дунд
const PERFECT: Verb = { grow: 'нэмэгдлээ', fall: 'буурлаа' }; // өгүүлбэрийн төгсгөл
const PERFECT_GROW: Verb = { grow: 'өслөө', fall: 'буурлаа' };

/** «Биткойн 7 хоногт 4.2 хувиар өсөж, 68,450 ам.долларт хүрлээ.» */
export function priceSentence(name: string, genitive: string, price: number, change: number | null): string {
  if (change === null || direction(change) === 'flat') {
    return `${genitive} ханш 7 хоногт бараг өөрчлөгдөөгүй, ${usdWords(price)} байна.`;
  }
  const verb = change > 0 ? CONVERB.grow : CONVERB.fall;
  return `${name} 7 хоногт ${pctWords(change)} ${verb}, ${usdWords(price, 'dat')} хүрлээ.`;
}

/** «Криптогийн нийт зах зээлийн үнэлгээ 2.45 их наяд ам.доллар болж, 7 хоногт 3.1 хувиар нэмэгдлээ.» */
export function totalSentence(total: number, change: number | null, estimated: boolean): string {
  const base = `Криптогийн нийт зах зээлийн үнэлгээ ${usdWords(total)} болж`;
  const est = estimated ? ' (топ 100-аар тооцоолсон)' : '';
  if (change === null) return `Криптогийн нийт зах зээлийн үнэлгээ ${usdWords(total)} байна.`;
  if (direction(change) === 'flat') return `${base}, 7 хоногт бараг өөрчлөгдөөгүй${est}.`;
  return `${base}, 7 хоногт ${pctWords(change)} ${change > 0 ? PERFECT.grow : PERFECT.fall}${est}.`;
}

/** «Биткойны давамгайлал 57.8 хувь боллоо (өмнөх 7 хоногт 57.1 хувь).» */
export function dominanceSentence(now: number, prev: number | null): string {
  if (prev === null) return `Биткойны давамгайлал ${pctNoun(now)} байна.`;
  return `Биткойны давамгайлал ${pctNoun(now)} боллоо (өмнөх 7 хоногт ${pctNoun(prev)}).`;
}

/** «Стейблкойны нийт нийлүүлэлт 312.4 тэрбум ам.доллар, 7 хоногт 0.8 хувиар өслөө.» */
export function stableSentence(total: number, change: number | null): string {
  const base = `Стейблкойны нийт нийлүүлэлт ${usdWords(total)}`;
  if (change === null) return `${base} байна.`;
  if (direction(change) === 'flat') return `${base}, 7 хоногт бараг өөрчлөгдөөгүй.`;
  return `${base}, 7 хоногт ${pctWords(change)} ${change > 0 ? PERFECT_GROW.grow : PERFECT_GROW.fall}.`;
}

/** «DeFi-д түгжигдсэн нийт хөрөнгө (TVL) 118.2 тэрбум ам.доллар байна.» */
export function tvlSentence(tvl: number, change: number | null): string {
  const base = `DeFi-д түгжигдсэн нийт хөрөнгө (TVL) ${usdWords(tvl)} байна`;
  if (change === null || direction(change) === 'flat') return `${base}.`;
  return `${base}, 7 хоногт ${pctWords(change)} ${change > 0 ? PERFECT.grow : PERFECT.fall}.`;
}

/** «Айдас ба шунахайн индекс 34 (Айдас) байна, өмнөх 7 хоногт 52 байсан.» */
export function fearGreedSentence(value: number, labelMn: string, prev: number | null): string {
  const base = `Айдас ба шунахайн индекс ${value} (${labelMn}) байна`;
  return prev === null ? `${base}.` : `${base}, өмнөх 7 хоногт ${prev} байсан.`;
}

/** «Топ 100-аас хамгийн их өссөн нь XYZ (+38.5%).» — хаалтан доторх тэмдэгтэд залгавар залгахгүй */
export function topGainerSentence(symbol: string, change: number): string {
  return `Топ 100-аас хамгийн их өссөн нь ${symbol} (+${groupDigits(change, 1)}%).`;
}

/** Тайлангийн автомат хэсгээс санал болгох өгүүлбэрүүд. Эхнийх нь headline, дараагийн 3 нь takeaways (--auto-publish). */
export function suggestSentences(a: Omit<WeeklyAuto, 'suggestedSentences'>): string[] {
  const out: string[] = [];
  const btc = a.majors.find((m) => m.symbol === 'BTC');
  const eth = a.majors.find((m) => m.symbol === 'ETH');
  if (btc) out.push(priceSentence('Биткойн', 'Биткойны', btc.priceUsd, btc.change7dPct));
  out.push(totalSentence(a.global.totalMarketCapUsd, a.global.change7dPct, a.global.change7dMethod === 'top100-estimate'));
  out.push(dominanceSentence(a.global.btcDominancePct, a.global.btcDominancePct7dAgo));
  out.push(stableSentence(a.stablecoins.totalUsd, a.stablecoins.change7dPct));
  out.push(fearGreedSentence(a.fearGreed.value, a.fearGreed.labelMn, a.fearGreed.value7dAgo));
  out.push(tvlSentence(a.defi.tvlUsd, a.defi.change7dPct));
  if (eth) out.push(priceSentence('Этериум', 'Этериумын', eth.priceUsd, eth.change7dPct));
  const top = a.topGainers[0];
  if (top && top.change7dPct > 0) out.push(topGainerSentence(top.symbol, top.change7dPct));
  return out;
}
