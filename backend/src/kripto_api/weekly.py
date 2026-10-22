# 7 хоногийн тайлангийн автомат хэсэг (SPEC §6 WeeklyAuto, §7.3) — цэвэр функцууд.
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

from kripto_api.dates import week_range
from kripto_api.jsnum import day_of, iso_z, js_round, parse_iso, round_to
from kripto_api.schemas import NEWS_TAGS, WeeklyAuto, parse
from kripto_api.sentences import suggest_sentences
from kripto_api.stablecoins import make_stable_detector


@dataclass
class WeeklyInputs:
    week: str
    now: datetime
    global_: dict[str, Any]
    coins: list[dict[str, Any]]  # топ 100
    charts: dict[str, list[dict[str, Any]]]  # {"BTC": [...], "ETH": [...]}
    tvl: dict[str, Any]
    stablecoins: dict[str, Any]
    dexs: dict[str, Any] | None
    fear_greed: dict[str, Any]  # history ≥ 8 өдөр (limit=8)
    fx: dict[str, Any] | None
    trending: list[dict[str, Any]]
    news: list[dict[str, Any]]  # тухайн долоо хоногийн архив
    hacks: list[dict[str, Any]] | None
    history: dict[str, Any]
    sources: list[dict[str, Any]]


def top100_change_7d(coins: list[dict[str, Any]]) -> float | None:
    """Топ 100-аар 7 хоногийн өмнөх нийт үнэлгээг тооцоолно: Σmcap / Σ(mcap / (1 + 7d%/100))."""
    now = prev = 0.0
    for c in coins[:100]:
        ch = c["change7dPct"]
        if ch is None or ch <= -100:
            continue
        now += c["marketCapUsd"]
        prev += c["marketCapUsd"] / (1 + ch / 100)
    return (now / prev - 1) * 100 if prev > 0 else None


def point_days_before(history: dict[str, Any], ref_day: str, days: int) -> dict[str, Any] | None:
    """Лавлах өдрөөс `days` хоногийн өмнөх (provisional биш) цэг."""
    target = day_of(parse_iso(f"{ref_day}T00:00:00Z") - timedelta(days=days))
    return next((p for p in history["points"] if p["date"] == target and not p.get("provisional")), None)


def _move(c: dict[str, Any]) -> dict[str, Any]:
    return {
        "symbol": c["symbol"].upper(),
        "name": c["name"],
        "priceUsd": c["priceUsd"],
        "change7dPct": round_to(c["change7dPct"] or 0),
        "marketCapUsd": c["marketCapUsd"],
    }


def pick_news_candidates(items: list[dict[str, Any]], limit: int = 15) -> list[dict[str, Any]]:
    """Ангилал бүрээс тэнцвэртэй (эхний шошгоор, round-robin), Монгол мэдээ эхэнд, шинэ нь түрүүнд."""
    ordered = sorted(items, key=lambda i: i["publishedAt"], reverse=True)
    picked = [i for i in ordered if i["isMongolia"]][:3]
    queues = [[i for i in ordered if i["tags"][0] == tag and i not in picked] for tag in NEWS_TAGS]
    while len(picked) < limit and any(queues):
        for q in queues:
            if q and len(picked) < limit:
                picked.append(q.pop(0))
            elif q:
                q.pop(0)
    return picked


def change_pct(series: list[dict[str, Any]]) -> float | None:
    if len(series) < 2 or series[0]["priceUsd"] == 0:
        return None
    return (series[-1]["priceUsd"] / series[0]["priceUsd"] - 1) * 100


def _r2(v: float | None) -> float | None:
    return None if v is None else round_to(v)


def build_weekly(i: WeeklyInputs) -> dict[str, Any]:
    rng = week_range(i.week)
    ref_day = day_of(min(i.now, parse_iso(rng["cutoffUtc"])))
    week_ago = point_days_before(i.history, ref_day, 7)

    # Нийт зах зээлийн 7 хоногийн өөрчлөлт: түүх → топ 100 тооцоо
    total = i.global_["totalMarketCapUsd"]
    total_7d_ago: float | None = None
    change_7d: float | None = None
    method: str | None = None
    if week_ago and week_ago.get("totalMarketCapUsd"):
        total_7d_ago = week_ago["totalMarketCapUsd"]
        change_7d = (total / total_7d_ago - 1) * 100
        method = "history"
    elif (est := top100_change_7d(i.coins)) is not None:
        change_7d = est
        total_7d_ago = total / (1 + est / 100)
        method = "top100-estimate"

    is_stable = make_stable_detector(i.stablecoins["symbols"])
    pool = [c for c in i.coins if not is_stable(c) and c["change7dPct"] is not None]
    by_change = sorted(pool, key=lambda c: c["change7dPct"] or 0, reverse=True)
    usd_mnt = i.fx["usdMnt"] if i.fx else None

    majors = []
    for sym in ("BTC", "ETH"):
        c = next((x for x in i.coins if x["symbol"].upper() == sym), None)
        if not c:
            continue
        chart = i.charts[sym][-31:]
        majors.append(
            {
                "symbol": sym,
                "priceUsd": c["priceUsd"],
                "priceMnt": None if usd_mnt is None else js_round(c["priceUsd"] * usd_mnt),
                "change7dPct": round_to(c["change7dPct"] or 0),
                "change30dPct": _r2(change_pct(chart)),
                "chart30d": [{"date": p["date"], "priceUsd": round_to(p["priceUsd"], 2)} for p in chart],
            }
        )

    fg_hist = i.fear_greed["history"]
    week_ago_dom = (week_ago or {}).get("btcDominancePct")
    st, tvl, dexs = i.stablecoins, i.tvl, i.dexs or {}

    base: dict[str, Any] = {
        "schemaVersion": 1,
        "week": i.week,
        "periodStart": rng["start"],
        "periodEnd": rng["end"],
        "cutoffUtc": rng["cutoffUtc"],
        "fetchedAt": iso_z(i.now),
        "global": {
            "totalMarketCapUsd": total,
            "totalMarketCapUsd7dAgo": None if total_7d_ago is None else js_round(total_7d_ago),
            "change7dPct": _r2(change_7d),
            "change7dMethod": method,
            "btcDominancePct": round_to(i.global_["btcDominancePct"]),
            "btcDominancePct7dAgo": _r2(week_ago_dom),
            "ethDominancePct": round_to(i.global_["ethDominancePct"]),
            "totalVolume24hUsd": i.global_["totalVolume24hUsd"],
        },
        "majors": majors,
        # Python-ы sort тогтвортой (stable) — JS-ийн Array.sort-тай ижил дараалал
        "topGainers": [_move(c) for c in by_change[:5]],
        "topLosers": [_move(c) for c in reversed(by_change[-5:])],
        "heatmapTop20": [_move(c) for c in pool[:20]],
        "stablecoins": {
            "totalUsd": st["totalUsd"],
            "change7dPct": _r2(st["change7dPct"]),
            "top": [
                {"symbol": t["symbol"], "circulatingUsd": t["circulatingUsd"], "change7dPct": _r2(t["change7dPct"])}
                for t in st["top"]
            ],
            "series30d": st["series30d"],
        },
        "defi": {
            "tvlUsd": tvl["tvlUsd"],
            "change7dPct": _r2(tvl["change7dPct"]),
            "dexVolume7dUsd": dexs.get("dexVolume7dUsd"),
            "dexChange7dPct": dexs.get("dexChange7dPct"),
            "series30d": tvl["series30d"],
        },
        "fearGreed": {
            "value": i.fear_greed["value"],
            "labelMn": i.fear_greed["labelMn"],
            "value7dAgo": fg_hist[-8]["value"] if len(fg_hist) >= 8 else None,
            "series7d": fg_hist[-7:],
        },
        "fx": i.fx,
        "trending": i.trending[:7],
        "newsCandidates": pick_news_candidates(i.news),
        "hacks": i.hacks,
        "sources": i.sources,
    }
    return parse(WeeklyAuto, {**base, "suggestedSentences": suggest_sentences(base)})
