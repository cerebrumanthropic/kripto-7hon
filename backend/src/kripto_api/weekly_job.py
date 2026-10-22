# `kripto weekly [--week 2026-W43] [--auto-publish] [--dry-run] [--now ISO] [--print-week]` (SPEC §7.3)
# Гаралт: content/reports/<week>.json (дарж бичнэ), content/reports/<week>.md (ЗӨВХӨН байхгүй үед).
# index.json-ийг бичихгүй — prepare-build (TS) үүсгэнэ (PROGRESS D1).
import asyncio
import os
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from kripto_api.budget import CallBudget
from kripto_api.dates import iso_week, week_range
from kripto_api.history import empty_history, finalized
from kripto_api.http import HttpOptions, error_message, get_json
from kripto_api.jsnum import iso_z, parse_iso
from kripto_api.report_md import report_markdown
from kripto_api.schemas import DailyHistory, LiveMarket, NewsWeekArchive
from kripto_api.sources.coingecko import (
    COINGECKO_BASE,
    MARKETS_PATH,
    demo_options,
    parse_global,
    parse_market_chart,
    parse_markets,
)
from kripto_api.sources.defillama import fetch_dexs, fetch_hacks, fetch_stablecoins, fetch_tvl
from kripto_api.sources.feargreed import fetch_fear_greed
from kripto_api.sources.fx import fetch_fx
from kripto_api.state import StateConfig, load_one, write_json
from kripto_api.weekly import WeeklyInputs, build_weekly


def default_week(now: datetime) -> str:
    """Ням 23:55-д эсвэл Даваа өглөө хоцорч ажиллавал ч зөв 7 хоног (SPEC §7.3.1)."""
    return iso_week(now - timedelta(hours=12))


@dataclass
class WeeklyConfig:
    week: str
    now: datetime
    store_dir: Path
    out_dir: Path
    reports_dir: Path
    data_base_url: str = ""
    api_key: str | None = None
    dry_run: bool = False
    auto_publish: bool = False
    http: HttpOptions | None = None


async def run_weekly(cfg: WeeklyConfig) -> int:
    week, now = cfg.week, cfg.now
    rng = week_range(week)  # формат шалгах (буруу бол алдаа)
    now_iso = iso_z(now)
    http = cfg.http or HttpOptions()
    flags = (" (dry-run)" if cfg.dry_run else "") + (" (auto-publish)" if cfg.auto_publish else "")
    print(f"[weekly] {week} now={now_iso}{flags}")

    # Төлөв: түүх, тухайн 7 хоногийн мэдээний архив, trending (амьд market.json-оос — CoinGecko дуудлага хэмнэнэ)
    sc = StateConfig(cfg.data_base_url, cfg.store_dir, cfg.out_dir, now, http)
    hist, hist_origin = await load_one("history/daily.json", DailyHistory, sc, local_dir=cfg.out_dir)
    arch, arch_origin = await load_one(f"news/{week}.json", NewsWeekArchive, sc, local_dir=cfg.out_dir)
    live, live_origin = await load_one("live/market.json", LiveMarket, sc, use_store=False, local_dir=cfg.out_dir)
    print(f"[state] history={hist_origin} news={arch_origin} ({len(arch['items']) if arch else 0}) market={live_origin}")

    sources: list[dict[str, Any]] = []

    def ok(id_: str) -> None:
        sources.append({"id": id_, "ok": True, "fetchedAt": now_iso})

    def fail(id_: str, e: BaseException) -> None:
        sources.append({"id": id_, "ok": False, "fetchedAt": now_iso, "error": error_message(e)})

    # CoinGecko: global, markets (топ 100), BTC/ETH 30 хоног = 4 дуудлага (≤5)
    opts = demo_options(cfg.api_key, http)
    budget = CallBudget("coingecko", 5)

    async def cg(label: str, path: str) -> Any:
        budget.use(label)
        return await get_json(f"{COINGECKO_BASE}{path}", opts)

    global_ = parse_global(await cg("global", "/global"))
    coins = parse_markets(await cg("markets", MARKETS_PATH))
    charts = {}
    for sym, coin_id in (("BTC", "bitcoin"), ("ETH", "ethereum")):
        charts[sym] = parse_market_chart(
            await cg(f"chart-{coin_id}", f"/coins/{coin_id}/market_chart?vs_currency=usd&days=30&interval=daily")
        )
    ok("coingecko")

    # DefiLlama, F&G — заавал; DEX, ханш, хакердалт — сонголттой
    tvl, stablecoins, fear_greed = await asyncio.gather(fetch_tvl(http), fetch_stablecoins(http), fetch_fear_greed(8, http))
    ok("defillama-tvl")
    ok("defillama-stablecoins")
    ok("feargreed")

    start_sec = parse_iso(f"{rng['start']}T00:00:00Z").timestamp()
    cutoff_sec = parse_iso(rng["cutoffUtc"]).timestamp()
    dexs, fx, hacks = await asyncio.gather(
        fetch_dexs(http), fetch_fx(http), fetch_hacks(start_sec, cutoff_sec, http), return_exceptions=True
    )
    optional: dict[str, Any] = {}
    for id_, key, res in (("defillama-dexs", "dexs", dexs), ("fx", "fx", fx), ("defillama-hacks", "hacks", hacks)):
        if isinstance(res, BaseException):
            fail(id_, res)
            optional[key] = None
        else:
            ok(id_)
            optional[key] = res

    auto = build_weekly(
        WeeklyInputs(
            week=week,
            now=now,
            global_=global_,
            coins=coins,
            charts=charts,
            tvl=tvl,
            stablecoins=stablecoins,
            dexs=optional["dexs"],
            fear_greed=fear_greed,
            fx=optional["fx"] or (live or {}).get("fx"),
            trending=[{"symbol": t["symbol"].upper(), "name": t["name"]} for t in (live or {}).get("trending", [])],
            news=arch["items"] if arch else [],
            hacks=optional["hacks"],
            history=finalized(hist) if hist else empty_history(),
            sources=sources,
        )
    )

    g = auto["global"]
    print(
        f"[weekly] нийт {g['change7dPct'] if g['change7dPct'] is not None else '—'}% ({g['change7dMethod'] or '—'}), "
        f"мэдээ {len(auto['newsCandidates'])}, coingecko дуудлага {budget.used}"
    )
    for s in auto["suggestedSentences"]:
        print(f"  • {s}")

    json_file = cfg.reports_dir / f"{week}.json"
    md_file = cfg.reports_dir / f"{week}.md"
    md_exists = md_file.exists()

    if cfg.dry_run:
        print(f"[dry-run] бичихгүй: {json_file}{'' if md_exists else f', {md_file}'}")
    else:
        write_json(json_file, auto, pretty=True)
        print(f"[write] {json_file}")
        if md_exists:
            print(f"[keep] {md_file} байна — редакторын текстийг дарж бичихгүй")
        else:
            md_file.write_text(report_markdown(auto, cfg.auto_publish), encoding="utf-8", newline="\n")
            print(f"[write] {md_file} ({'published' if cfg.auto_publish else 'draft'})")

    # GitHub Actions: PR branch-ийн нэрэнд
    if gh_output := os.environ.get("GITHUB_OUTPUT"):
        with open(gh_output, "a", encoding="utf-8") as f:
            f.write(f"week={week}\n")
    return 0
