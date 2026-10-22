# Нийтлэгдсэн тайлангийн шалгалт (SPEC §7.4). `kripto validate` — алдаа → exit 1 (deploy зогсоно).
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from pydantic import ValidationError

from kripto_api.reports import parse_editorial
from kripto_api.schemas import Editorial, WeeklyAuto, safe_parse


@dataclass
class ValidationResult:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def _is_https(u: str) -> bool:
    return u.startswith("https://")


def validate_report(e: Editorial, a: dict[str, Any] | None) -> ValidationResult:
    r = ValidationResult()

    # Редакторын хэсэг
    h = e.headline.strip()
    if not 1 <= len(h) <= 120:
        r.errors.append(f"headline 1–120 тэмдэгт байх ёстой (одоо {len(h)})")
    if not e.summary.strip():
        r.errors.append("summary хоосон")
    if len(e.takeaways) != 3:
        r.errors.append(f"takeaways яг 3 байх ёстой (одоо {len(e.takeaways)})")
    for i, t in enumerate(e.takeaways, 1):
        if not t.strip():
            r.errors.append(f"takeaways[{i}] хоосон")

    # ETF урсгал оруулсан бол эх сурвалжийн холбоос заавал
    etf_entered = bool(e.etf and (e.etf.btc_net_flow_usd is not None or e.etf.eth_net_flow_usd is not None))
    if etf_entered and not (e.etf and e.etf.source_url):
        r.errors.append("ETF урсгал оруулсан бол etf.source_url заавал")
    if e.coinshares and e.coinshares.weekly_flow_usd is not None and not e.coinshares.url:
        r.errors.append("coinshares.weekly_flow_usd оруулсан бол coinshares.url заавал")

    # Холбоосууд https://
    links: list[tuple[str, str | None]] = [
        ("etf.source_url", e.etf.source_url if e.etf else None),
        ("coinshares.url", e.coinshares.url if e.coinshares else None),
        *((f"news_picks[{i}]", u) for i, u in enumerate(e.news_picks, 1)),
        *((f"mongolia[{i}].url", x.url) for i, x in enumerate(e.mongolia, 1)),
        *((f"regulation[{i}].url", x.url) for i, x in enumerate(e.regulation, 1)),
    ]
    for name, url in links:
        if url and not _is_https(url):
            r.errors.append(f"{name} https://-ээр эхлэх ёстой")

    # Автомат хэсэг
    if a is None:
        r.errors.append("харгалзах <week>.json байхгүй эсвэл схемд тэнцээгүй")
        return r
    if a["week"] != e.week:
        r.errors.append(f"долоо хоног зөрж байна (.md={e.week}, .json={a['week']})")
    for name, v in (("BTC давамгайлал", a["global"]["btcDominancePct"]), ("ETH давамгайлал", a["global"]["ethDominancePct"])):
        if not 0 <= v <= 100:
            r.errors.append(f"{name} 0–100 байх ёстой ({v})")
    if not 0 <= a["fearGreed"]["value"] <= 100:
        r.errors.append(f"F&G 0–100 байх ёстой ({a['fearGreed']['value']})")
    for m in [*a["majors"], *a["topGainers"], *a["topLosers"], *a["heatmapTop20"]]:
        if not m["priceUsd"] > 0:
            r.errors.append(f"{m['symbol']}: үнэ > 0 байх ёстой")
    for m in [*a["majors"], *a["topGainers"], *a["topLosers"]]:
        if abs(m["change7dPct"]) > 60:
            r.warnings.append(f"{m['symbol']}: 7 хоногийн өөрчлөлт {m['change7dPct']}% (|%| > 60) — шалгаарай")
    ch = a["global"]["change7dPct"]
    if ch is not None and abs(ch) > 60:
        r.warnings.append(f"нийт зах зээлийн 7 хоногийн өөрчлөлт {ch}% — шалгаарай")
    r.warnings = list(dict.fromkeys(r.warnings))
    return r


def validate_all(reports_dir: Path) -> int:
    """content/reports/-ийн status: published тайлан бүрийг шалгана. → exit код."""
    error_count = checked = 0
    files = (
        sorted(p for p in reports_dir.glob("*.md") if re.fullmatch(r"\d{4}-W\d{2}\.md", p.name)) if reports_dir.is_dir() else []
    )
    for md in files:
        week = md.stem
        try:
            editorial = parse_editorial(md.read_text(encoding="utf-8"))
        except (ValidationError, ValueError) as e:
            print(f"✗ {week}: frontmatter схемд тэнцээгүй — {str(e).splitlines()[0]}", file=sys.stderr)
            error_count += 1
            continue
        if editorial.status != "published":
            print(f"– {week}: draft (алгасав)")
            continue
        checked += 1
        json_file = reports_dir / f"{week}.json"
        auto = safe_parse(WeeklyAuto, json.loads(json_file.read_text(encoding="utf-8"))) if json_file.exists() else None
        res = validate_report(editorial, auto)
        for w in res.warnings:
            print(f"⚠ {week}: {w}", file=sys.stderr)
        for err in res.errors:
            print(f"✗ {week}: {err}", file=sys.stderr)
        if not res.errors:
            print(f"✓ {week}")
        error_count += len(res.errors)
    print(f"[validate] нийтлэгдсэн {checked}, алдаа {error_count}")
    return 1 if error_count else 0
