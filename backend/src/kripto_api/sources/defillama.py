# DefiLlama (түлхүүргүй, SPEC §5.2). Live: TVL, стейблкойны нийт (chart), стейблкойны жагсаалт, DEX = 4 дуудлага.
import asyncio
from typing import Any

from pydantic import BaseModel

from kripto_api.http import HttpOptions, get_json
from kripto_api.jsnum import day_of, from_unix
from kripto_api.schemas import Num

DAY = 86_400

DEFILLAMA = {
    "tvl": "https://api.llama.fi/v2/historicalChainTvl",
    "stable_chart": "https://stablecoins.llama.fi/stablecoincharts/all",
    "stablecoins": "https://stablecoins.llama.fi/stablecoins?includePrices=true",
    "dexs": "https://api.llama.fi/overview/dexs?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true",
    "hacks": "https://api.llama.fi/hacks",
}


class _TvlPoint(BaseModel):
    date: Num
    tvl: Num


class _StablePoint(BaseModel):
    date: Num | str
    totalCirculatingUSD: dict[str, Num]


class _Pegged(BaseModel):
    name: str
    symbol: str
    pegType: str | None = None
    circulating: dict[str, Num] | None = None
    circulatingPrevWeek: dict[str, Num] | None = None


class _Stablecoins(BaseModel):
    peggedAssets: list[_Pegged]


class _Dexs(BaseModel):
    total24h: Num | None = None
    total7d: Num | None = None
    change_7dover7d: Num | None = None


class _Hack(BaseModel):
    date: Num
    name: str
    amount: Num | None = None
    source: str | None = None


Points = list[tuple[float, float]]


def _pct_change(now: float, prev: float | None) -> float | None:
    return None if prev is None or prev == 0 else (now / prev - 1) * 100


def _value_days_ago(points: Points, days: int) -> float | None:
    """Сүүлийн цэгээс яг 7 хоногийн өмнөх (эсвэл түүнээс өмнөх хамгийн ойр) цэгийн утга."""
    target = points[-1][0] - days * DAY
    found: float | None = None
    for t, v in points:
        if t <= target:
            found = v
    return found


def _last_days(points: Points, days: int) -> list[dict[str, Any]]:
    """Сүүлийн `days` өдрийн цуваа (sparkline-д)."""
    return [{"date": day_of(from_unix(t)), "value": v} for t, v in points[-days:]]


def _list(raw: Any, what: str) -> list[Any]:
    if not isinstance(raw, list):
        raise ValueError(f"{what}: жагсаалт биш")
    return raw


def _series_summary(pts: Points, key: str, empty: str) -> dict[str, Any]:
    if not pts:
        raise ValueError(empty)
    now = pts[-1][1]
    return {key: now, "change7dPct": _pct_change(now, _value_days_ago(pts, 7)), "series30d": _last_days(pts, 30)}


def parse_tvl(raw: Any) -> dict[str, Any]:
    pts = [(p.date, p.tvl) for p in (_TvlPoint.model_validate(x) for x in _list(raw, "TVL"))]
    return _series_summary(pts, "tvlUsd", "TVL цуваа хоосон")


def parse_stable_chart(raw: Any) -> dict[str, Any]:
    """Нийт = totalCirculatingUSD-ийн бүх peg-ийн нийлбэр (SPEC §5.2)."""
    pts = [
        (float(p.date), sum(p.totalCirculatingUSD.values()))
        for p in (_StablePoint.model_validate(x) for x in _list(raw, "stablecoincharts"))
    ]
    return _series_summary(pts, "totalUsd", "Стейблкойны цуваа хоосон")


def parse_stablecoins(raw: Any) -> dict[str, Any]:
    assets = _Stablecoins.model_validate(raw).peggedAssets
    # (symbol, name, эргэлтийн USD, өмнөх 7 хоногийн USD)
    usd = [
        (a.symbol, a.name, (a.circulating or {}).get("peggedUSD", 0), (a.circulatingPrevWeek or {}).get("peggedUSD"))
        for a in assets
    ]
    usd = sorted((a for a in usd if a[2] > 0), key=lambda a: a[2], reverse=True)
    return {
        "symbols": list(dict.fromkeys(a.symbol.lower() for a in assets)),
        "top": [
            {"symbol": symbol, "name": name, "circulatingUsd": circ, "change7dPct": _pct_change(circ, prev)}
            for symbol, name, circ, prev in usd[:5]
        ],
    }


def parse_dexs(raw: Any) -> dict[str, Any]:
    d = _Dexs.model_validate(raw)
    return {"dexVolume24hUsd": d.total24h, "dexVolume7dUsd": d.total7d, "dexChange7dPct": d.change_7dover7d}


def parse_hacks(raw: Any, from_sec: float, to_sec: float) -> list[dict[str, Any]]:
    """Тухайн [from_sec, to_sec] хоорондох хакердалт (7 хоногийн тайланд, SPEC §5.2)."""
    hacks = [_Hack.model_validate(h) for h in _list(raw, "hacks")]
    hits = sorted((h for h in hacks if from_sec <= h.date <= to_sec), key=lambda h: h.date, reverse=True)
    return [
        {
            "name": h.name,
            "date": day_of(from_unix(h.date)),
            "amountUsd": h.amount,
            **({"url": h.source} if h.source and h.source.startswith("https://") else {}),
        }
        for h in hits
    ]


async def fetch_tvl(http: HttpOptions | None = None) -> dict[str, Any]:
    return parse_tvl(await get_json(DEFILLAMA["tvl"], http))


async def fetch_stablecoins(http: HttpOptions | None = None) -> dict[str, Any]:
    chart, lst = await asyncio.gather(get_json(DEFILLAMA["stable_chart"], http), get_json(DEFILLAMA["stablecoins"], http))
    return {**parse_stable_chart(chart), **parse_stablecoins(lst)}


async def fetch_dexs(http: HttpOptions | None = None) -> dict[str, Any]:
    return parse_dexs(await get_json(DEFILLAMA["dexs"], http))


async def fetch_hacks(from_sec: float, to_sec: float, http: HttpOptions | None = None) -> list[dict[str, Any]]:
    """Хакердалт (сонголттой): алдаа гарвал дуудагч нь null болгоно — тайлан үргэлжилнэ."""
    return parse_hacks(await get_json(DEFILLAMA["hacks"], http), from_sec, to_sec)
