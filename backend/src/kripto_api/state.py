# Төлөв (SPEC §7.1) = history/daily.json + news/<week>.json.
# Ачаалах дараалал: (1) GitHub Pages-ийн нийтлэгдсэн хувилбар → (2) store/ (data-history branch) → (3) хоосон.
# Хадгалах: Pages руу ажиллалт бүрд (public-data/), store/ руу зөвхөн өдрийн цэг өөрчлөгдсөн үед.
import json
import math
import re
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel

from kripto_api.dates import iso_week
from kripto_api.history import empty_history, finalized
from kripto_api.http import HttpOptions, error_message, get_json
from kripto_api.schemas import DailyHistory, LiveMarket, NewsFeed, NewsWeekArchive, safe_parse

Origin = Literal["pages", "store", "local", "empty"]


@dataclass
class StateConfig:
    data_base_url: str
    store_dir: Path
    out_dir: Path  # Локал ажиллалтад өмнөх market.json-ийг эндээс уншина (Pages байхгүй үед)
    now: datetime
    http: HttpOptions = field(default_factory=HttpOptions)
    log: Callable[[str], None] = print


@dataclass
class LoadedState:
    history: dict[str, Any]
    archives: dict[str, dict[str, Any]]  # Одоогийн ба өмнөх 7 хоногийн архив (шинэ мэдээ эдгээрт нэмэгдэнэ)
    older_archives: list[dict[str, Any]]  # store/-д байгаа хуучин долоо хоногийн архив — Pages-д дахин нийтлэнэ (PROGRESS D5)
    prev_market: dict[str, Any] | None
    prev_news: dict[str, Any] | None
    origins: dict[str, Origin]


def read_local(file: Path, model: type[BaseModel]) -> dict[str, Any] | None:
    if not file.exists():
        return None
    try:
        return safe_parse(model, json.loads(file.read_text(encoding="utf-8")))
    except json.JSONDecodeError:
        return None


async def load_one(
    rel: str,
    model: type[BaseModel],
    cfg: StateConfig,
    *,
    use_store: bool = True,
    local_dir: Path | None = None,
) -> tuple[dict[str, Any] | None, Origin]:
    """Нэг файлыг Pages → store/ → локал гаралтаас ачаална."""
    if cfg.data_base_url:
        try:
            parsed = safe_parse(model, await get_json(f"{cfg.data_base_url}/{rel}", cfg.http.with_(retries=1)))
            if parsed is not None:
                return parsed, "pages"
            cfg.log(f"[state] Pages {rel}: схем тэнцээгүй")
        except Exception as e:
            cfg.log(f"[state] Pages {rel}: {error_message(e)}")
    if use_store and (from_store := read_local(cfg.store_dir / rel, model)):
        return from_store, "store"
    if local_dir and (from_local := read_local(local_dir / rel, model)):
        return from_local, "local"
    return None, "empty"


def state_weeks(now: datetime) -> list[str]:
    return [iso_week(now), iso_week(now - timedelta(days=7))]


async def load_state(cfg: StateConfig) -> LoadedState:
    origins: dict[str, Origin] = {}

    history, origins["history/daily.json"] = await load_one("history/daily.json", DailyHistory, cfg, local_dir=cfg.out_dir)

    archives: dict[str, dict[str, Any]] = {}
    for w in state_weeks(cfg.now):
        rel = f"news/{w}.json"
        a, origins[rel] = await load_one(rel, NewsWeekArchive, cfg, local_dir=cfg.out_dir)
        archives[w] = a if a and a["week"] == w else {"schemaVersion": 1, "week": w, "items": []}

    older: list[dict[str, Any]] = []
    news_dir = cfg.store_dir / "news"
    if news_dir.is_dir():
        for f in sorted(p for p in news_dir.iterdir() if re.fullmatch(r"\d{4}-W\d{2}\.json", p.name)):
            if f.stem in archives:
                continue
            if a := read_local(f, NewsWeekArchive):
                older.append(a)

    # market.json store-д хадгалагддаггүй: Pages → (локал) өмнөх гаралт
    market, origins["live/market.json"] = await load_one(
        "live/market.json", LiveMarket, cfg, use_store=False, local_dir=cfg.out_dir
    )
    news, origins["live/news.json"] = await load_one("live/news.json", NewsFeed, cfg, use_store=False, local_dir=cfg.out_dir)

    return LoadedState(
        history=finalized(history) if history else empty_history(),
        archives=archives,
        older_archives=older,
        prev_market=market,
        prev_news=news,
        origins=origins,
    )


def _js_numbers(v: Any) -> Any:
    """JSON.stringify-тай ижил: бүхэл float-ыг «68450.0» биш «68450» гэж бичнэ."""
    if isinstance(v, float) and v.is_integer() and math.isfinite(v) and abs(v) < 2**53:
        return int(v)
    if isinstance(v, dict):
        return {k: _js_numbers(x) for k, x in v.items()}
    if isinstance(v, list):
        return [_js_numbers(x) for x in v]
    return v


def to_json(data: Any, pretty: bool = False) -> str:
    return json.dumps(
        _js_numbers(data),
        ensure_ascii=False,
        allow_nan=False,
        indent=2 if pretty else None,
        separators=None if pretty else (",", ":"),
    )


def write_json(file: Path, data: Any, pretty: bool = False) -> None:
    file.parent.mkdir(parents=True, exist_ok=True)
    # Хагас бичигдсэн файлыг сервер уншихгүйн тулд эхлээд түр файлд бичээд солино
    tmp = file.with_suffix(file.suffix + ".tmp")
    tmp.write_text(to_json(data, pretty) + "\n", encoding="utf-8", newline="\n")
    tmp.replace(file)
