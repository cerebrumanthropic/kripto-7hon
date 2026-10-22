# Амьд дата (SPEC §7.2): эх сурвалж бүрийг тусад нь татаж public-data/-д бичнэ.
# `kripto live` (GitHub Actions, цаг тутам) ба FastAPI-ийн scheduler / POST /admin/refresh хуваалцана.
# Гарах код: 0 (зарим эх сурвалж унасан ч), 1 = зах зээлийн БҮХ эх сурвалж унасан.
import asyncio
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

from kripto_api.assemble import (
    MARKET_SOURCE_IDS,
    MarketInputs,
    Outcome,
    all_market_sources_failed,
    build_market,
    daily_values,
    fail,
    ok,
    source_status,
)
from kripto_api.budget import CallBudget
from kripto_api.history import apply_daily_close, with_provisional
from kripto_api.http import HttpOptions, error_message
from kripto_api.jsnum import iso_z
from kripto_api.schemas import DailyHistory, LiveMarket, LiveStatus, NewsFeed, NewsWeekArchive, parse
from kripto_api.sources.coingecko import fetch_coingecko_live
from kripto_api.sources.defillama import fetch_dexs, fetch_stablecoins, fetch_tvl
from kripto_api.sources.feargreed import fetch_fear_greed
from kripto_api.sources.feeds import FEEDS
from kripto_api.sources.fx import fetch_fx
from kripto_api.sources.rss import FeedConfig, fetch_feed, latest_news, merge_into_archives
from kripto_api.state import StateConfig, load_state, write_json


@dataclass
class LiveConfig:
    now: datetime
    out_dir: Path
    store_dir: Path
    data_base_url: str = ""
    api_key: str | None = None
    forced: set[str] = field(default_factory=set)  # --fail: тухайн эх сурвалжийг хүчээр унагах (тест)
    http: HttpOptions = field(default_factory=HttpOptions)
    log: Callable[[str], None] = print


@dataclass
class LiveResult:
    code: int
    status: dict[str, Any]


async def _settle(id_: str, forced: set[str], fn: Callable[[], Awaitable[Any]]) -> Outcome:
    if id_ in forced:
        return fail("хүчээр унагасан (--fail)")
    try:
        return ok(await fn())
    except Exception as e:
        return fail(error_message(e))


async def run_live(cfg: LiveConfig) -> LiveResult:
    log, now, http = cfg.log, cfg.now, cfg.http
    now_iso = iso_z(now)
    log(f"[live] {now_iso} out={cfg.out_dir} store={cfg.store_dir} pages={cfg.data_base_url or '—'}")
    if cfg.forced:
        log(f"[live] хүчээр унагах: {', '.join(sorted(cfg.forced))}")

    # 1) Төлөв
    state = await load_state(StateConfig(cfg.data_base_url, cfg.store_dir, cfg.out_dir, now, http, log))
    log("[state] " + " ".join(f"{k}={v}" for k, v in state.origins.items()))

    # 2) Эх сурвалжууд — тус тусдаа
    budget = CallBudget("coingecko", 5, log)
    fetchers: dict[str, Callable[[], Awaitable[Any]]] = {
        "coingecko": lambda: fetch_coingecko_live(cfg.api_key, budget, http),
        "tvl": lambda: fetch_tvl(http),
        "stablecoins": lambda: fetch_stablecoins(http),
        "dexs": lambda: fetch_dexs(http),
        "feargreed": lambda: fetch_fear_greed(31, http),
        "fx": lambda: fetch_fx(http),
    }
    outcomes = await asyncio.gather(*(_settle(MARKET_SOURCE_IDS[k], cfg.forced, fn) for k, fn in fetchers.items()))
    inputs: MarketInputs = dict(zip(fetchers, outcomes, strict=True))

    def feed_fetcher(feed: FeedConfig) -> Callable[[], Awaitable[Any]]:
        return lambda: fetch_feed(feed, now, http)

    feed_outcomes = await asyncio.gather(*(_settle(f.id, cfg.forced, feed_fetcher(f)) for f in FEEDS))

    # 3) Нэгтгэх
    market = parse(LiveMarket, build_market(inputs, state.prev_market, now))

    fresh_news = [item for o in feed_outcomes if o.ok for item in o.value]
    archives = merge_into_archives(state.archives, fresh_news)
    prev_news = state.prev_news

    # Feed унасан ч архивт өмнөх мэдээ нь үлдэнэ → өмнөх амжилттай татсан цагтай, stale
    def had_news(id_: str) -> bool:
        return any(s["id"] == id_ and (s["ok"] or s.get("stale")) for s in (prev_news or {}).get("sources", []))

    news_sources = [source_status(f.id, o, now_iso, prev_news, had_news(f.id)) for f, o in zip(FEEDS, feed_outcomes, strict=True)]
    news = parse(
        NewsFeed,
        {"schemaVersion": 1, "updatedAt": now_iso, "sources": news_sources, "items": latest_news(archives.values(), now)},
    )

    values = daily_values(market, inputs)
    history, store_changed = apply_daily_close(state.history, values, now)
    pages_history = parse(DailyHistory, with_provisional(history, values, now))

    status = parse(
        LiveStatus,
        {
            "schemaVersion": 1,
            "updatedAt": now_iso,
            "sources": [*market["sources"], *news_sources],
            "coingeckoCallsThisRun": budget.used,
        },
    )

    # 4) Бичих — Pages / API (public-data/)
    out = cfg.out_dir
    write_json(out / "live" / "market.json", market)
    write_json(out / "live" / "news.json", news)
    write_json(out / "live" / "status.json", status)
    write_json(out / "history" / "daily.json", pages_history)
    for a in [*state.older_archives, *archives.values()]:
        write_json(out / "news" / f"{a['week']}.json", parse(NewsWeekArchive, a))

    # 5) store/ — өдрийн цэг өөрчлөгдсөн үед л (workflow нь өдөрт ~1 commit хийнэ).
    # Бүх зах зээлийн эх сурвалж унасан бол хоосон цэг бичихгүй.
    all_failed = all_market_sources_failed(inputs)
    if store_changed and not all_failed:
        write_json(cfg.store_dir / "history" / "daily.json", parse(DailyHistory, history), pretty=True)
        for a in archives.values():
            write_json(cfg.store_dir / "news" / f"{a['week']}.json", a, pretty=True)
        log(f"[store] шинэчлэв: өдрийн цэг {history['points'][-1]['date']}, архив {', '.join(archives)}")
    else:
        log("[store] өөрчлөлтгүй")

    # 6) Тайлан
    for s in status["sources"]:
        mark = "✓" if s["ok"] else "↺" if s.get("stale") else "✗"
        detail = "" if s["ok"] else f"{s.get('error', '')}{' (өмнөх утга)' if s.get('stale') else ''}"
        log(f"  {mark} {s['id']:<22} {detail}")
    log(
        f"[live] coins={len(market['coins'])} news={len(news['items'])} (шинэ {len(fresh_news)}) "
        f"history={len(pages_history['points'])} coingecko дуудлага={budget.used}"
    )

    if all_failed:
        log("[live] Зах зээлийн бүх эх сурвалж бүтэлгүйтэв")
        return LiveResult(1, status)
    return LiveResult(0, status)


def parse_forced(arg: str | None) -> set[str]:
    return {x for x in (arg or "").split(",") if x}
