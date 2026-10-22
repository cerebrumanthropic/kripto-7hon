# Идэвхтэй RSS эх сурвалжууд. Шалгалтын үр дүн: docs/PROGRESS.md (Үе шат 2, 2026.10.21).
# Дахин шалгах: `npm run feeds:probe`
from kripto_api.sources.rss import FeedConfig

FEEDS = [
    FeedConfig("coindesk", "CoinDesk", "https://www.coindesk.com/arc/outboundfeeds/rss/", "https://www.coindesk.com"),
    FeedConfig("cointelegraph", "Cointelegraph", "https://cointelegraph.com/rss", "https://cointelegraph.com"),
    FeedConfig("decrypt", "Decrypt", "https://decrypt.co/feed", "https://decrypt.co"),
    FeedConfig("theblock", "The Block", "https://www.theblock.co/rss.xml", "https://www.theblock.co"),
    FeedConfig("bitcoinmagazine", "Bitcoin Magazine", "https://bitcoinmagazine.com/feed", "https://bitcoinmagazine.com"),
    FeedConfig("cryptoslate", "CryptoSlate", "https://cryptoslate.com/feed/", "https://cryptoslate.com"),
    # SEC-ийн бүх хэвлэлийн мэдээ ерөнхий сэдэвтэй → зөвхөн крипто гарчиг; холбоо барих имэйлтэй UA заавал
    FeedConfig(
        "sec",
        "U.S. SEC",
        "https://www.sec.gov/news/pressreleases.rss",
        "https://www.sec.gov",
        needs_contact=True,
        crypto_only=True,
    ),
    # Монгол: ерөнхий мэдээ → крипто түлхүүр үгээр шүүнэ (ихэнх долоо хоногт 0 байж болно)
    FeedConfig("ikon", "Ikon.mn", "https://ikon.mn/rss", "https://ikon.mn", mongolian=True),
]
