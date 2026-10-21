import { describe, expect, it } from 'vitest';

import type { LiveCoin } from '@/types/schemas';

import { sortCoins, topByRank } from './coins';

const coin = (rank: number, change7dPct: number | null): LiveCoin => ({
  id: `c${rank}`,
  symbol: `c${rank}`,
  name: `Coin ${rank}`,
  rank,
  priceUsd: 1,
  priceMnt: null,
  change24hPct: null,
  change7dPct,
  marketCapUsd: 1000 - rank,
  volume24hUsd: 1,
  isStablecoin: false,
});

describe('coins', () => {
  const coins = [coin(3, 5), coin(1, -2), coin(25, 40), coin(2, null)];

  it('topByRank нь эрэмбэлэхээс өмнө тасална', () => {
    expect(topByRank(coins, 3).map((c) => c.rank)).toEqual([1, 2, 3]);
    // топ 3 дотроо 7 хоногоор эрэмбэлэхэд #25 орохгүй
    expect(sortCoins(topByRank(coins, 3), 'change7dPct', false).map((c) => c.rank)).toEqual([3, 1, 2]);
  });

  it('null үргэлж төгсгөлд', () => {
    expect(sortCoins(coins, 'change7dPct', true).at(-1)?.rank).toBe(2);
    expect(sortCoins(coins, 'change7dPct', false).at(-1)?.rank).toBe(2);
  });
});
