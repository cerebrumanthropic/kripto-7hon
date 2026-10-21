// Зах зээлийн хүснэгтийн эрэмбэлэлт (SPEC §8.2) — цэвэр функц.
import type { LiveCoin } from '@/types/schemas';

export type SortKey = 'rank' | 'priceUsd' | 'change24hPct' | 'change7dPct' | 'marketCapUsd' | 'volume24hUsd';

/** null утгууд эрэмбийн төгсгөлд (өсөх/буурах аль алинд). */
export function sortCoins(coins: LiveCoin[], key: SortKey, asc: boolean): LiveCoin[] {
  return [...coins].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    return asc ? av - bv : bv - av;
  });
}

/** Зах зээлийн үнэлгээний эрэмбээр эхний n. */
export function topByRank(coins: LiveCoin[], n = 20): LiveCoin[] {
  return sortCoins(coins, 'rank', true).slice(0, n);
}
