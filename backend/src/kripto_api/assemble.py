# Эх сурвалжуудын үр дүнг market.json болгон нэгтгэнэ (SPEC §6, §7.2).
# Бүтэлгүйтсэн эх сурвалж → өмнөх утга + stale:true (CLAUDE.md дүрэм 8).
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from kripto_api.history import DailyValues
from kripto_api.jsnum import iso_z, round_to
from kripto_api.stablecoins import make_stable_detector


@dataclass(frozen=True)
class Outcome:
    ok: bool
    value: Any = None
    error: str = ""


def ok(value: Any) -> Outcome:
    return Outcome(True, value)


def fail(error: str) -> Outcome:
    return Outcome(False, error=error)


# inputs-ийн түлхүүр → SourceStatus.id (дараалал нь market.json-ийн sources-ийн дараалал)
MARKET_SOURCE_IDS = {
    "coingecko": "coingecko",
    "tvl": "defillama-tvl",
    "stablecoins": "defillama-stablecoins",
    "dexs": "defillama-dexs",
    "feargreed": "feargreed",
    "fx": "fx",
}

MarketInputs = dict[str, Outcome]  # түлхүүр нь MARKET_SOURCE_IDS-ийнх

TOP_COINS = 50
TRENDING_MAX = 7


def source_status(id_: str, outcome: Outcome, now: str, prev: dict[str, Any] | None, has_prev_value: bool) -> dict[str, Any]:
    if outcome.ok:
        return {"id": id_, "ok": True, "fetchedAt": now}
    prev_status = next((s for s in (prev or {}).get("sources", []) if s["id"] == id_), None)
    fetched_at = now
    if has_prev_value:
        # Харуулж буй өгөгдлийг хэзээ татсан нь
        fetched_at = (prev_status or {}).get("fetchedAt") or (prev or {}).get("updatedAt") or now
    return {
        "id": id_,
        "ok": False,
        "fetchedAt": fetched_at,
        **({"stale": True} if has_prev_value else {}),
        "error": outcome.error,
    }


def build_market(inputs: MarketInputs, prev: dict[str, Any] | None, now: datetime) -> dict[str, Any]:
    now_iso = iso_z(now)
    cg, tvl, st, dexs, fg, fx = (inputs[k] for k in ("coingecko", "tvl", "stablecoins", "dexs", "feargreed", "fx"))
    p = prev or {}

    fx_value = fx.value if fx.ok else p.get("fx")
    usd_mnt = fx_value["usdMnt"] if fx_value else None

    def mnt(usd: float) -> float | None:
        if usd_mnt is None:
            return None
        v = usd * usd_mnt
        return round_to(v, 4 if v < 100 else 0)

    stable_symbols = st.value["symbols"] if st.ok else [c["symbol"] for c in p.get("coins", []) if c["isStablecoin"]]
    is_stable = make_stable_detector(stable_symbols)

    if cg.ok:
        coins = [
            {
                "id": c["id"],
                "symbol": c["symbol"],
                "name": c["name"],
                "rank": c["rank"],
                "priceUsd": c["priceUsd"],
                "priceMnt": mnt(c["priceUsd"]),
                "change24hPct": c["change24hPct"],
                "change7dPct": c["change7dPct"],
                "marketCapUsd": c["marketCapUsd"],
                "volume24hUsd": c["volume24hUsd"],
                "isStablecoin": is_stable(c),
            }
            for c in cg.value["coins"][:TOP_COINS]
        ]
    else:
        coins = [{**c, "priceMnt": mnt(c["priceUsd"]) if fx.ok else c["priceMnt"]} for c in p.get("coins", [])]

    prev_defi = p.get("defi")
    defi = None
    tvl_usd = tvl.value["tvlUsd"] if tvl.ok else (prev_defi or {}).get("tvlUsd")
    if tvl_usd is not None:
        pd = prev_defi or {}
        defi = {
            "tvlUsd": tvl_usd,
            "change7dPct": tvl.value["change7dPct"] if tvl.ok else pd.get("change7dPct"),
            "dexVolume24hUsd": dexs.value["dexVolume24hUsd"] if dexs.ok else pd.get("dexVolume24hUsd"),
            "dexVolume7dUsd": dexs.value["dexVolume7dUsd"] if dexs.ok else pd.get("dexVolume7dUsd"),
        }

    has = {
        "coingecko": bool(p.get("global")),
        "tvl": prev_defi is not None,
        "stablecoins": bool(p.get("stablecoins")),
        "dexs": (prev_defi or {}).get("dexVolume24hUsd") is not None,
        "feargreed": bool(p.get("fearGreed")),
        "fx": bool(p.get("fx")),
    }
    sources = [source_status(sid, inputs[k], now_iso, prev, has[k]) for k, sid in MARKET_SOURCE_IDS.items()]

    stablecoins = (
        {"totalUsd": st.value["totalUsd"], "change7dPct": st.value["change7dPct"], "top": st.value["top"]}
        if st.ok
        else p.get("stablecoins")
    )
    return {
        "schemaVersion": 1,
        "updatedAt": now_iso,
        "sources": sources,
        "global": cg.value["global"] if cg.ok else p.get("global"),
        "coins": coins,
        "trending": cg.value["trending"][:TRENDING_MAX] if cg.ok else p.get("trending", []),
        "fearGreed": fg.value if fg.ok else p.get("fearGreed"),
        "stablecoins": stablecoins,
        "defi": defi,
        "fx": fx_value,
    }


def daily_values(m: dict[str, Any], inputs: MarketInputs) -> DailyValues:
    """Өдрийн цэгийн утгууд — зөвхөн энэ ажиллалтад шинээр татсан эх сурвалжаас (хоцорсон утга түүх рүү орохгүй)."""
    cg = inputs["coingecko"].ok
    g = m.get("global") or {}
    btc: dict[str, Any] = next((c for c in m["coins"] if c["symbol"] == "btc"), {})
    eth: dict[str, Any] = next((c for c in m["coins"] if c["symbol"] == "eth"), {})

    def when(fresh: bool, v: Any) -> Any:
        return v if fresh else None

    return {
        "totalMarketCapUsd": when(cg, g.get("totalMarketCapUsd")),
        "totalVolume24hUsd": when(cg, g.get("totalVolume24hUsd")),
        "btcDominancePct": when(cg, g.get("btcDominancePct")),
        "btcUsd": when(cg, btc.get("priceUsd")),
        "ethUsd": when(cg, eth.get("priceUsd")),
        "stablecoinsUsd": when(inputs["stablecoins"].ok, (m.get("stablecoins") or {}).get("totalUsd")),
        "defiTvlUsd": when(inputs["tvl"].ok, (m.get("defi") or {}).get("tvlUsd")),
        "fearGreed": when(inputs["feargreed"].ok, (m.get("fearGreed") or {}).get("value")),
        "usdMnt": when(inputs["fx"].ok, (m.get("fx") or {}).get("usdMnt")),
    }


def all_market_sources_failed(inputs: MarketInputs) -> bool:
    return all(not o.ok for o in inputs.values())
