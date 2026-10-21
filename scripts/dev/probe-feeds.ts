// SPEC §5.5: RSS нэр дэвшигчдийг шалгана (HTTP төлөв, формат, 7 хоногийн мэдээний тоо).
// Монгол сайтуудын RSS хаягийг таамаглаж шалгана. Ажиллуулах: npx tsx scripts/dev/probe-feeds.ts
import { errorMessage, getText } from '../lib/http';
import { parseFeed, toNewsItems, type FeedConfig } from '../sources/rss';

try {
  process.loadEnvFile('.env.local');
} catch {}

const CANDIDATES: FeedConfig[] = [
  { id: 'coindesk', name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', sourceUrl: 'https://www.coindesk.com' },
  { id: 'cointelegraph', name: 'Cointelegraph', url: 'https://cointelegraph.com/rss', sourceUrl: 'https://cointelegraph.com' },
  { id: 'decrypt', name: 'Decrypt', url: 'https://decrypt.co/feed', sourceUrl: 'https://decrypt.co' },
  { id: 'theblock', name: 'The Block', url: 'https://www.theblock.co/rss.xml', sourceUrl: 'https://www.theblock.co' },
  { id: 'bitcoinmagazine', name: 'Bitcoin Magazine', url: 'https://bitcoinmagazine.com/.rss/full/', sourceUrl: 'https://bitcoinmagazine.com' },
  { id: 'cryptoslate', name: 'CryptoSlate', url: 'https://cryptoslate.com/feed/', sourceUrl: 'https://cryptoslate.com' },
  { id: 'sec', name: 'U.S. SEC', url: 'https://www.sec.gov/news/pressreleases.rss', sourceUrl: 'https://www.sec.gov', needsContact: true },
  // Монгол — таамаг хаягууд
  { id: 'montsame', name: 'МОНЦАМЭ', url: 'https://montsame.mn/mn/rss', sourceUrl: 'https://montsame.mn', mongolian: true },
  { id: 'montsame2', name: 'МОНЦАМЭ', url: 'https://montsame.mn/rss', sourceUrl: 'https://montsame.mn', mongolian: true },
  { id: 'ikon', name: 'Ikon.mn', url: 'https://ikon.mn/rss', sourceUrl: 'https://ikon.mn', mongolian: true },
  { id: 'ikon2', name: 'Ikon.mn', url: 'https://ikon.mn/rss.xml', sourceUrl: 'https://ikon.mn', mongolian: true },
  { id: 'gogo', name: 'GoGo.mn', url: 'https://gogo.mn/rss', sourceUrl: 'https://gogo.mn', mongolian: true },
  { id: 'newsmn', name: 'News.mn', url: 'https://news.mn/feed/', sourceUrl: 'https://news.mn', mongolian: true },
  { id: 'unuudur', name: 'Өнөөдөр', url: 'https://unuudur.mn/feed', sourceUrl: 'https://unuudur.mn', mongolian: true },
  { id: 'eguur', name: 'Eguur.mn', url: 'https://eguur.mn/feed/', sourceUrl: 'https://eguur.mn', mongolian: true },
  { id: 'bloombergtv', name: 'Bloomberg TV Mongolia', url: 'https://bloombergtv.mn/feed/', sourceUrl: 'https://bloombergtv.mn', mongolian: true },
];

async function main() {
  const now = new Date();
  for (const f of CANDIDATES) {
    try {
      if (f.needsContact && !process.env.CONTACT_EMAIL) {
        // Имэйлгүй UA-гаар шалгахад SEC 403 буцаадаг эсэхийг харуулна
        await getText(f.url, { retries: 0, timeoutMs: 15000 });
      }
      const xml = await getText(f.url, { retries: 0, timeoutMs: 15000 });
      const entries = parseFeed(xml);
      const items = toNewsItems(entries, { ...f, mongolian: false }, now);
      const mnHits = f.mongolian ? toNewsItems(entries, f, now).length : '-';
      const cryptoHits = toNewsItems(entries, { ...f, mongolian: false, cryptoOnly: true }, now).length;
      console.log(`✓ ${f.id.padEnd(16)} entries=${String(entries.length).padEnd(4)} last7d=${String(items.length).padEnd(4)} crypto=${String(cryptoHits).padEnd(4)} mnCrypto=${mnHits}  ${f.url}`);
    } catch (e) {
      console.log(`✗ ${f.id.padEnd(16)} ${errorMessage(e)}  ${f.url}`);
    }
  }
}

main();
