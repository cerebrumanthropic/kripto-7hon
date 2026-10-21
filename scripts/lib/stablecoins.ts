// Стейблкойн илрүүлэлт (SPEC §7.2.6):
// DefiLlama-гийн симбол ∪ үндсэн жагсаалт ∪ (үнэ 0.97–1.03 бөгөөд нэр нь «usd» агуулсан).

export const BASE_STABLES = ['usdt', 'usdc', 'dai', 'usde', 'fdusd', 'pyusd', 'tusd', 'usds', 'usdd', 'rlusd'];

export function makeStableDetector(defillamaSymbols: string[] = []) {
  const set = new Set([...BASE_STABLES, ...defillamaSymbols.map((s) => s.toLowerCase())]);
  return (c: { symbol: string; name: string; priceUsd: number }): boolean =>
    set.has(c.symbol.toLowerCase()) ||
    (c.priceUsd >= 0.97 && c.priceUsd <= 1.03 && c.name.toLowerCase().includes('usd'));
}
