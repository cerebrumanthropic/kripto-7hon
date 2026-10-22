# live ажиллалт (бүх эх сурвалжийг mock-лосон) → public-data/ → FastAPI.
import asyncio
import json
from pathlib import Path
from typing import Any

import httpx
import pytest
from fastapi.testclient import TestClient

from kripto_api import api
from kripto_api.config import ServerSettings
from kripto_api.http import HttpOptions
from kripto_api.jsnum import parse_iso
from kripto_api.live import LiveConfig, LiveResult, run_live
from kripto_api.schemas import DailyHistory, LiveMarket, LiveStatus, NewsFeed, NewsWeekArchive, safe_parse

from .conftest import fixture
from .test_rss import RSS2

NOW = parse_iso("2026-10-21T05:07:00Z")

ROUTES = {
    "/api/v3/global": "coingecko-global.json",
    "/api/v3/coins/markets": "coingecko-markets.json",
    "/api/v3/search/trending": "coingecko-trending.json",
    "/v2/historicalChainTvl": "defillama-historicalChainTvl.json",
    "/stablecoincharts/all": "defillama-stablecoincharts-all.json",
    "/stablecoins": "defillama-stablecoins.json",
    "/overview/dexs": "defillama-dexs-overview.json",
    "/fng/": "feargreed.json",
    "/v6/latest/USD": "fx-open-er-api.json",
}


def upstream(down: set[str] = frozenset()) -> HttpOptions:  # type: ignore[assignment]
    def handler(req: httpx.Request) -> httpx.Response:
        if req.url.host in down:
            return httpx.Response(503)
        if name := ROUTES.get(req.url.path):
            return httpx.Response(200, json=fixture(name))
        return httpx.Response(200, content=RSS2.encode(), headers={"content-type": "application/rss+xml"})

    async def no_sleep(_: float) -> None:
        return None

    return HttpOptions(transport=httpx.MockTransport(handler), sleep=no_sleep)


def read(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def live(tmp_path: Path, **over: Any) -> LiveResult:
    cfg = LiveConfig(
        now=NOW, out_dir=tmp_path / "out", store_dir=tmp_path / "store", api_key="demo", http=upstream(), log=lambda _: None
    )
    for k, v in over.items():
        setattr(cfg, k, v)
    return asyncio.run(run_live(cfg))


def test_live_writes_schema_valid_files(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("CONTACT_EMAIL", raising=False)
    result = live(tmp_path)
    out = tmp_path / "out"
    assert result.code == 0
    market = read(out / "live/market.json")
    assert safe_parse(LiveMarket, market) is not None and len(market["coins"]) == 50
    assert safe_parse(NewsFeed, read(out / "live/news.json")) is not None
    assert safe_parse(LiveStatus, read(out / "live/status.json"))["coingeckoCallsThisRun"] == 3
    history = read(out / "history/daily.json")
    assert safe_parse(DailyHistory, history) is not None
    assert [p["date"] for p in history["points"]] == ["2026-10-20", "2026-10-21"] and history["points"][-1]["provisional"]
    assert safe_parse(NewsWeekArchive, read(out / "news/2026-W43.json")) is not None
    # SEC нь CONTACT_EMAIL-гүй бол унана, бусад нь ажиллана
    sec = next(s for s in result.status["sources"] if s["id"] == "sec")
    assert not sec["ok"] and "CONTACT_EMAIL" in sec["error"]
    # store/-д өдрийн цэг (provisional-гүй) бичигдэнэ
    assert [p["date"] for p in read(tmp_path / "store/history/daily.json")["points"]] == ["2026-10-20"]


def test_live_reuses_previous_output_when_source_down(tmp_path: Path) -> None:
    live(tmp_path)
    later = parse_iso("2026-10-21T06:07:00Z")
    result = live(tmp_path, now=later, forced={"feargreed"})
    fg = next(s for s in result.status["sources"] if s["id"] == "feargreed")
    assert fg == {
        "id": "feargreed",
        "ok": False,
        "fetchedAt": "2026-10-21T05:07:00.000Z",
        "stale": True,
        "error": "хүчээр унагасан (--fail)",
    }
    assert read(tmp_path / "out/live/market.json")["fearGreed"] is not None


def test_live_all_market_sources_down(tmp_path: Path) -> None:
    hosts = {"api.coingecko.com", "api.llama.fi", "stablecoins.llama.fi", "api.alternative.me", "open.er-api.com"}
    result = live(tmp_path, http=upstream(hosts))
    assert result.code == 1
    assert not (tmp_path / "store/history/daily.json").exists()  # хоосон цэг бичихгүй


@pytest.fixture
def server(tmp_path: Path) -> ServerSettings:
    live(tmp_path)
    return ServerSettings(
        data_dir=tmp_path / "out", store_dir=tmp_path / "store", scheduler=False, admin_token="secret", cors_origins=["*"]
    )


def test_api_serves_pages_compatible_paths(server: ServerSettings) -> None:
    with TestClient(api.create_app(server)) as c:
        r = c.get("/live/market.json", headers={"origin": "https://vaspfrcweekly.expo.app"})
        assert r.status_code == 200
        assert r.headers["access-control-allow-origin"] == "*"
        assert "max-age=300" in r.headers["cache-control"]
        assert safe_parse(LiveMarket, r.json()) is not None
        assert c.get("/live/news.json").status_code == 200
        assert c.get("/live/status.json").status_code == 200
        assert c.get("/history/daily.json").status_code == 200
        assert c.get("/news/2026-W43.json").status_code == 200
        assert c.get("/news/2020-W01.json").status_code == 404
        assert c.get("/news/..%2F..%2Fsecret.json").status_code == 404
        assert c.get("/live/other.json").status_code == 422
        health = c.get("/healthz").json()
        assert health["ok"] and health["updatedAt"] == "2026-10-21T05:07:00.000Z"


def test_admin_refresh_requires_token(server: ServerSettings, monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_run(cfg: LiveConfig) -> LiveResult:
        return LiveResult(0, {"updatedAt": "x"})

    monkeypatch.setattr(api, "run_live", fake_run)
    with TestClient(api.create_app(server)) as c:
        assert c.post("/admin/refresh").status_code == 401
        assert c.post("/admin/refresh", headers={"authorization": "Bearer wrong"}).status_code == 401
        r = c.post("/admin/refresh", headers={"authorization": "Bearer secret"})
        assert r.status_code == 200 and r.json() == {"exitCode": 0, "status": {"updatedAt": "x"}}
        assert c.get("/healthz").json()["lastExitCode"] == 0

    no_token = ServerSettings(server.data_dir, server.store_dir, False, None, ["*"])
    with TestClient(api.create_app(no_token)) as c:
        assert c.post("/admin/refresh", headers={"authorization": "Bearer secret"}).status_code == 404


def test_next_run_is_minute_7() -> None:
    assert api.seconds_until_next_run(parse_iso("2026-10-21T05:00:00Z")) == 7 * 60
    assert api.seconds_until_next_run(parse_iso("2026-10-21T05:07:00Z")) == 3600
    assert api.seconds_until_next_run(parse_iso("2026-10-21T05:30:00Z")) == 37 * 60
