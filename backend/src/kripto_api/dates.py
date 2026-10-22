# ISO долоо хоног (SPEC §9, PROGRESS D10) — src/lib/dates.ts-ийн backend-д хэрэгтэй хэсэг.
# Долоо хоногийг UTC-ээр тооцно (тасалбар Ням 23:59:59 UTC).
import re
from datetime import UTC, date, datetime, timedelta
from typing import TypedDict

from kripto_api.jsnum import parse_iso


class WeekRange(TypedDict):
    start: str
    end: str
    cutoffUtc: str


def iso_week(value: str | datetime) -> str:
    """«2026-W43»"""
    dt = parse_iso(value) if isinstance(value, str) else value.astimezone(UTC)
    year, week, _ = dt.date().isocalendar()
    return f"{year}-W{week:02d}"


def parse_week(week_id: str) -> tuple[int, int]:
    m = re.fullmatch(r"(\d{4})-W(\d{2})", week_id)
    if not m or not 1 <= int(m[2]) <= 53:
        raise ValueError(f"Буруу долоо хоногийн дугаар: {week_id}")
    return int(m[1]), int(m[2])


def week_range(week_id: str) -> WeekRange:
    """2026-W43 → {start: 2026-10-19, end: 2026-10-25, cutoffUtc: 2026-10-25T23:59:59Z}"""
    year, week = parse_week(week_id)
    # 1-р сарын 4 үргэлж 1 дүгээр 7 хоногт байдаг
    jan4 = date(year, 1, 4)
    start = jan4 - timedelta(days=jan4.isoweekday() - 1) + timedelta(weeks=week - 1)
    end = start + timedelta(days=6)
    return {"start": start.isoformat(), "end": end.isoformat(), "cutoffUtc": f"{end.isoformat()}T23:59:59Z"}
