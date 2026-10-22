# Өдрийн түүх (SPEC §7.1). Цэг = UTC өдрийн хаалтад ойр утга.
# Шинэ UTC өдрийн анхны амжилттай ажиллалт одоогийн утгыг ӨМНӨХ өдрийн цэг болгон бичнэ.
# 06:00 UTC хүртэл тэр цэгийн null талбарыг (эх сурвалж түр унасан бол) нөхөж болно.
from datetime import datetime, timedelta
from typing import Any

from kripto_api.jsnum import day_of

FILL_UNTIL_HOUR_UTC = 6
MAX_POINTS = 3650

DAILY_FIELDS = (
    "totalMarketCapUsd",
    "totalVolume24hUsd",
    "btcDominancePct",
    "btcUsd",
    "ethUsd",
    "stablecoinsUsd",
    "defiTvlUsd",
    "fearGreed",
    "usdMnt",
)

History = dict[str, Any]
DailyValues = dict[str, float | None]


def empty_history() -> History:
    return {"schemaVersion": 1, "points": []}


def finalized(h: History) -> History:
    """provisional цэгүүдийг хасна (Pages-ээс ачаалсан үед)."""
    return {"schemaVersion": 1, "points": [p for p in h["points"] if not p.get("provisional")]}


def _sort_points(points: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(points, key=lambda p: p["date"])[-MAX_POINTS:]


def apply_daily_close(history: History, values: DailyValues, now: datetime) -> tuple[History, bool]:
    """→ (шинэ түүх, store-д бичих эсэх)"""
    base = finalized(history)["points"]
    yesterday = day_of(now - timedelta(days=1))
    i = next((k for k, p in enumerate(base) if p["date"] == yesterday), -1)

    if i == -1:
        return {"schemaVersion": 1, "points": _sort_points([*base, {"date": yesterday, **values}])}, True

    if now.hour >= FILL_UNTIL_HOUR_UTC:
        return {"schemaVersion": 1, "points": base}, False

    filled = dict(base[i])
    changed = False
    for k, v in values.items():
        if filled.get(k) is None and v is not None:
            filled[k] = v
            changed = True
    if not changed:
        return {"schemaVersion": 1, "points": base}, False
    points = list(base)
    points[i] = filled
    return {"schemaVersion": 1, "points": points}, True


def with_provisional(history: History, values: DailyValues, now: datetime) -> History:
    """Pages-ийн хувилбарт өнөөдрийн явцын утгыг provisional цэгээр нэмнэ (store-д хадгалахгүй)."""
    today = day_of(now)
    points = [p for p in history["points"] if p["date"] != today]
    return {"schemaVersion": 1, "points": [*points, {"date": today, **values, "provisional": True}]}
