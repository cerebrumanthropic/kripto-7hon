# Хөгжүүлэлтийн хэрэгсэл: RSS нэр дэвшигч шалгах (SPEC §5.5), API fixture авах (SPEC §5).
import json
import os
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from kripto_api.http import HttpOptions, error_message, get_bytes, get_json
from kripto_api.sources.coingecko import COINGECKO_BASE, MARKETS_PATH
from kripto_api.sources.defillama import DEFILLAMA
from kripto_api.sources.feeds import FEEDS
from kripto_api.sources.rss import FeedConfig, parse_feed, to_news_items

# Монгол сайтуудын RSS хаягийг таамаглаж шалгана
MN_CANDIDATES = [
    FeedConfig("montsame", "МОНЦАМЭ", "https://montsame.mn/mn/rss", "https://montsame.mn", mongolian=True),
    FeedConfig("montsame2", "МОНЦАМЭ", "https://montsame.mn/rss", "https://montsame.mn", mongolian=True),
    FeedConfig("ikon2", "Ikon.mn", "https://ikon.mn/rss.xml", "https://ikon.mn", mongolian=True),
    FeedConfig("gogo", "GoGo.mn", "https://gogo.mn/rss", "https://gogo.mn", mongolian=True),
    FeedConfig("newsmn", "News.mn", "https://news.mn/feed/", "https://news.mn", mongolian=True),
    FeedConfig("unuudur", "Өнөөдөр", "https://unuudur.mn/feed", "https://unuudur.mn", mongolian=True),
    FeedConfig("eguur", "Eguur.mn", "https://eguur.mn/feed/", "https://eguur.mn", mongolian=True),
    FeedConfig("bloombergtv", "Bloomberg TV Mongolia", "https://bloombergtv.mn/feed/", "https://bloombergtv.mn", mongolian=True),
]


async def probe_feeds() -> None:
    """HTTP төлөв, формат, 7 хоногийн мэдээний тоо. Ажиллуулах: npm run feeds:probe"""
    now = datetime.now(UTC)
    opts = HttpOptions(retries=0)
    for f in [*FEEDS, *MN_CANDIDATES]:
        try:
            entries = parse_feed(await get_bytes(f.url, opts))
            plain = FeedConfig(f.id, f.name, f.url, f.source_url)
            items = to_news_items(entries, plain, now)
            crypto = to_news_items(entries, FeedConfig(f.id, f.name, f.url, f.source_url, crypto_only=True), now)
            mn_hits = str(len(to_news_items(entries, f, now))) if f.mongolian else "-"
            print(
                f"✓ {f.id:<16} entries={len(entries):<4} last7d={len(items):<4} crypto={len(crypto):<4} mnCrypto={mn_hits}  {f.url}"
            )
        except Exception as e:
            print(f"✗ {f.id:<16} {error_message(e)}  {f.url}")


Trim = Callable[[Any], Any]


def _keep(d: Any) -> Any:
    return d


def _last(n: int) -> Trim:
    return lambda d: d[-n:]


def _trending(d: Any) -> Any:
    keys = ("id", "coin_id", "name", "symbol", "market_cap_rank", "slug", "score")
    return {"coins": [{"item": {k: c["item"].get(k) for k in keys}} for c in d.get("coins", [])[:7]]}


def _stablecoins(d: Any) -> Any:
    assets = sorted(d.get("peggedAssets", []), key=lambda a: (a.get("circulating") or {}).get("peggedUSD", 0), reverse=True)
    return {"peggedAssets": [{k: v for k, v in a.items() if k not in ("chainCirculating", "chains")} for a in assets[:12]]}


def _dexs(d: Any) -> Any:
    drop = ("protocols", "totalDataChart", "totalDataChartBreakdown", "allChains")
    return {**{k: v for k, v in d.items() if k not in drop}, "protocols": d.get("protocols", [])[:2]}


def _hacks(d: Any) -> Any:
    return sorted(d, key=lambda h: h["date"], reverse=True)[:8]


async def capture_fixtures(out_dir: Path) -> None:
    """Endpoint бүрийг нэг удаа дуудаж бодит хариуг хадгална (урт цувааг таслана). Ажиллуулах: npm run fixtures:capture"""
    out_dir.mkdir(parents=True, exist_ok=True)
    key = os.environ.get("COINGECKO_DEMO_API_KEY")
    cg = HttpOptions(retries=1, headers={"x-cg-demo-api-key": key} if key else {})
    plain = HttpOptions(retries=1)
    jobs: list[tuple[str, str, Trim, HttpOptions]] = [
        ("coingecko-global.json", f"{COINGECKO_BASE}/global", _keep, cg),
        ("coingecko-markets.json", f"{COINGECKO_BASE}{MARKETS_PATH}", _keep, cg),
        ("coingecko-trending.json", f"{COINGECKO_BASE}/search/trending", _trending, cg),
        (
            "coingecko-market-chart-bitcoin.json",
            f"{COINGECKO_BASE}/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily",
            _keep,
            cg,
        ),
        ("defillama-historicalChainTvl.json", DEFILLAMA["tvl"], _last(40), plain),
        ("defillama-stablecoincharts-all.json", DEFILLAMA["stable_chart"], _last(40), plain),
        ("defillama-stablecoins.json", DEFILLAMA["stablecoins"], _stablecoins, plain),
        ("defillama-dexs-overview.json", DEFILLAMA["dexs"], _dexs, plain),
        ("defillama-hacks.json", DEFILLAMA["hacks"], _hacks, plain),
        ("feargreed.json", "https://api.alternative.me/fng/?limit=31", _keep, plain),
        ("fx-open-er-api.json", "https://open.er-api.com/v6/latest/USD", _keep, plain),
    ]
    for file, url, trim, opts in jobs:
        try:
            text = json.dumps(trim(await get_json(url, opts)), ensure_ascii=False, indent=2) + "\n"
            (out_dir / file).write_text(text, encoding="utf-8", newline="\n")
            print(f"✓ {file} ({round(len(text) / 1024)} KB)")
        except Exception as e:
            print(f"✗ {file}: {error_message(e)}")
