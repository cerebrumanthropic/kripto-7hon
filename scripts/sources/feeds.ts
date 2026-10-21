// Идэвхтэй RSS эх сурвалжууд. Шалгалтын үр дүн: docs/PROGRESS.md (Үе шат 2, 2026.10.21).
// GitHub Actions-оос дахин шалгах: Үе шат 3.
import type { FeedConfig } from './rss';

export const FEEDS: FeedConfig[] = [
  { id: 'coindesk', name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', sourceUrl: 'https://www.coindesk.com' },
  { id: 'cointelegraph', name: 'Cointelegraph', url: 'https://cointelegraph.com/rss', sourceUrl: 'https://cointelegraph.com' },
  { id: 'decrypt', name: 'Decrypt', url: 'https://decrypt.co/feed', sourceUrl: 'https://decrypt.co' },
  { id: 'theblock', name: 'The Block', url: 'https://www.theblock.co/rss.xml', sourceUrl: 'https://www.theblock.co' },
  { id: 'bitcoinmagazine', name: 'Bitcoin Magazine', url: 'https://bitcoinmagazine.com/.rss/full/', sourceUrl: 'https://bitcoinmagazine.com' },
  { id: 'cryptoslate', name: 'CryptoSlate', url: 'https://cryptoslate.com/feed/', sourceUrl: 'https://cryptoslate.com' },
  // SEC-ийн бүх хэвлэлийн мэдээ ерөнхий сэдэвтэй → зөвхөн крипто гарчиг; холбоо барих имэйлтэй UA заавал
  { id: 'sec', name: 'U.S. SEC', url: 'https://www.sec.gov/news/pressreleases.rss', sourceUrl: 'https://www.sec.gov', needsContact: true, cryptoOnly: true },
  // Монгол: ерөнхий мэдээ → крипто түлхүүр үгээр шүүнэ (ихэнх долоо хоногт 0 байж болно)
  { id: 'ikon', name: 'Ikon.mn', url: 'https://ikon.mn/rss', sourceUrl: 'https://ikon.mn', mongolian: true },
];
