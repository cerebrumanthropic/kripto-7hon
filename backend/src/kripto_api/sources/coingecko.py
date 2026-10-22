# CoinGecko Demo API (SPEC §5.1). Live: /global, /coins/markets, /search/trending = 3 дуудлага.
from typing import Any

from pydantic import BaseModel

from kripto_api.budget import CallBudget
from kripto_api.http import HttpOptions, get_json
from kripto_api.jsnum import day_of, from_unix
from kripto_api.schemas import Num

COINGECKO_BASE = "https://api.coingecko.com/api/v3"
MARKETS_PATH = (
    "/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&price_change_percentage=24h,7d&sparkline=false"
)


class _Usd(BaseModel):
    usd: Num


class _Pct(BaseModel):
    btc: Num
    eth: Num


class _GlobalData(BaseModel):
    total_market_cap: _Usd
    total_volume: _Usd
    market_cap_percentage: _Pct
    market_cap_change_percentage_24h_usd: Num
    active_cryptocurrencies: Num


class _Global(BaseModel):
    data: _GlobalData


class _Market(BaseModel):
    id: str
    symbol: str
    name: str
    current_price: Num | None
    market_cap: Num | None
    market_cap_rank: Num | None
    total_volume: Num | None
    price_change_percentage_24h_in_currency: Num | None = None
    price_change_percentage_7d_in_currency: Num | None = None


class _TrendingItem(BaseModel):
    id: str
    symbol: str
    name: str
    market_cap_rank: Num | None = None


class _TrendingCoin(BaseModel):
    item: _TrendingItem


class _Trending(BaseModel):
    coins: list[_TrendingCoin]


class _MarketChart(BaseModel):
    prices: list[tuple[Num, Num]]


def parse_global(raw: Any) -> dict[str, Any]:
    d = _Global.model_validate(raw).data
    return {
        "totalMarketCapUsd": d.total_market_cap.usd,
        "totalVolume24hUsd": d.total_volume.usd,
        "marketCapChange24hPct": d.market_cap_change_percentage_24h_usd,
        "btcDominancePct": d.market_cap_percentage.btc,
        "ethDominancePct": d.market_cap_percentage.eth,
        "activeCryptocurrencies": d.active_cryptocurrencies,
    }


def parse_markets(raw: Any) -> list[dict[str, Any]]:
    """Үнэ/үнэлгээ/эрэмбэгүй мөрийг хасна; эрэмбээр эрэмбэлнэ."""
    if not isinstance(raw, list):
        raise ValueError("coins/markets: жагсаалт биш")
    rows = [_Market.model_validate(r) for r in raw]
    coins = [
        {
            "id": c.id,
            "symbol": c.symbol,
            "name": c.name,
            "rank": c.market_cap_rank,
            "priceUsd": c.current_price,
            "marketCapUsd": c.market_cap,
            "volume24hUsd": c.total_volume if c.total_volume is not None else 0,
            "change24hPct": c.price_change_percentage_24h_in_currency,
            "change7dPct": c.price_change_percentage_7d_in_currency,
        }
        for c in rows
        if c.current_price is not None and c.market_cap is not None and c.market_cap_rank is not None
    ]
    return sorted(coins, key=lambda c: c["rank"])


def parse_trending(raw: Any) -> list[dict[str, Any]]:
    return [
        {"id": c.item.id, "symbol": c.item.symbol, "name": c.item.name, "rank": c.item.market_cap_rank}
        for c in _Trending.model_validate(raw).coins
    ]


def parse_market_chart(raw: Any) -> list[dict[str, Any]]:
    """[ms, price][] → өдрийн цуваа (UTC огноогоор, өдөрт сүүлийн утга)."""
    by_day: dict[str, Num] = {}
    for t, p in _MarketChart.model_validate(raw).prices:
        by_day[day_of(from_unix(t / 1000))] = p
    return [{"date": d, "priceUsd": p} for d, p in by_day.items()]


def demo_options(api_key: str | None, http: HttpOptions | None = None) -> HttpOptions:
    if not api_key:
        raise RuntimeError("COINGECKO_DEMO_API_KEY тохируулаагүй")
    base = http or HttpOptions()
    return base.with_(headers={**base.headers, "x-cg-demo-api-key": api_key})


async def fetch_coingecko_live(api_key: str | None, budget: CallBudget, http: HttpOptions | None = None) -> dict[str, Any]:
    opts = demo_options(api_key, http)

    async def call(label: str, path: str) -> Any:
        budget.use(label)
        return await get_json(f"{COINGECKO_BASE}{path}", opts)

    # Дараалан дуудна: минутын хязгаарт өртөхгүй, төсөв тодорхой
    global_ = parse_global(await call("global", "/global"))
    coins = parse_markets(await call("markets", MARKETS_PATH))
    trending = parse_trending(await call("trending", "/search/trending"))
    return {"global": global_, "coins": coins, "trending": trending}
