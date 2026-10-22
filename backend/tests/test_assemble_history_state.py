import asyncio
import json
from pathlib import Path
from typing import Any

import httpx
import pytest

from kripto_api.assemble import all_market_sources_failed, build_market, daily_values, fail, ok
from kripto_api.history import apply_daily_close, empty_history, with_provisional
from kripto_api.http import HttpOptions
from kripto_api.jsnum import iso_z, parse_iso
from kripto_api.schemas import LiveMarket, parse, safe_parse
from kripto_api.sources.fx import parse_fx
from kripto_api.state import StateConfig, load_state, state_weeks, to_json, write_json

from .conftest import all_ok_inputs, fixture

T1 = parse_iso("2026-10-21T04:07:00Z")
T2 = parse_iso("2026-10-21T05:07:00Z")


class TestBuildMarket:
    def test_all_ok(self) -> None:
        m = build_market(all_ok_inputs(), None, T1)
        assert safe_parse(LiveMarket, m) is not None
        assert len(m["coins"]) == 50
        assert all(s["ok"] for s in m["sources"])
        btc = next(c for c in m["coins"] if c["symbol"] == "btc")
        assert btc["priceMnt"] == pytest.approx(btc["priceUsd"] * m["fx"]["usdMnt"], abs=10)
        assert next(c for c in m["coins"] if c["symbol"] == "usdt")["isStablecoin"]
        assert not btc["isStablecoin"]
        assert len(m["trending"]) <= 7

    def test_one_source_down_keeps_previous_value_stale(self) -> None:
        prev = build_market(all_ok_inputs(), None, T1)
        m = build_market({**all_ok_inputs(), "feargreed": fail("timeout")}, prev, T2)
        assert safe_parse(LiveMarket, m) is not None
        assert m["fearGreed"] == prev["fearGreed"]
        s = next(x for x in m["sources"] if x["id"] == "feargreed")
        assert s == {"id": "feargreed", "ok": False, "fetchedAt": iso_z(T1), "stale": True, "error": "timeout"}
        assert sum(x["ok"] for x in m["sources"]) == 5
        assert m["updatedAt"] == iso_z(T2)

    def test_no_previous_value_means_null_not_stale(self) -> None:
        m = build_market({**all_ok_inputs(), "coingecko": fail("x"), "stablecoins": fail("x")}, None, T1)
        assert safe_parse(LiveMarket, m) is not None
        assert m["global"] is None and m["coins"] == [] and m["stablecoins"] is None
        assert "stale" not in next(s for s in m["sources"] if s["id"] == "coingecko")

    def test_dex_down_tvl_fresh(self) -> None:
        prev = build_market(all_ok_inputs(), None, T1)
        m = build_market({**all_ok_inputs(), "dexs": fail("x")}, prev, T2)
        assert m["defi"]["dexVolume24hUsd"] == prev["defi"]["dexVolume24hUsd"]
        assert next(s for s in m["sources"] if s["id"] == "defillama-dexs")["stale"]

    def test_fx_refresh_recomputes_mnt_of_previous_coins(self) -> None:
        prev = build_market(all_ok_inputs(), None, T1)
        new_fx = {**parse_fx(fixture("fx-open-er-api.json")), "usdMnt": 4000}
        m = build_market({**all_ok_inputs(), "coingecko": fail("x"), "fx": ok(new_fx)}, prev, T2)
        assert m["coins"][0]["priceMnt"] == pytest.approx(m["coins"][0]["priceUsd"] * 4000, abs=10)

    def test_daily_values_only_fresh(self) -> None:
        prev = build_market(all_ok_inputs(), None, T1)
        inputs = {**all_ok_inputs(), "coingecko": fail("x")}
        v = daily_values(build_market(inputs, prev, T2), inputs)
        assert v["btcUsd"] is None and v["totalMarketCapUsd"] is None
        assert v["fearGreed"] is not None and v["usdMnt"] is not None

    def test_all_failed(self) -> None:
        everything_down = {k: fail("x") for k in all_ok_inputs()}
        assert all_market_sources_failed(everything_down)
        assert not all_market_sources_failed({**everything_down, "fx": all_ok_inputs()["fx"]})


def values(**over: float | None) -> dict[str, float | None]:
    base: dict[str, float | None] = {
        "totalMarketCapUsd": 2.4e12,
        "totalVolume24hUsd": 9e10,
        "btcDominancePct": 57,
        "btcUsd": 68000,
        "ethUsd": 2400,
        "stablecoinsUsd": 3.1e11,
        "defiTvlUsd": 1.1e11,
        "fearGreed": 40,
        "usdMnt": 3450,
    }
    return {**base, **over}


class TestHistory:
    def test_first_run_of_day_writes_yesterday(self) -> None:
        h, changed = apply_daily_close(empty_history(), values(), parse_iso("2026-10-21T00:07:00Z"))
        assert changed
        assert h["points"] == [{"date": "2026-10-20", **values()}]

    def test_later_runs_do_not_change(self) -> None:
        first, _ = apply_daily_close(empty_history(), values(), parse_iso("2026-10-21T00:07:00Z"))
        h, changed = apply_daily_close(first, values(btcUsd=1), parse_iso("2026-10-21T13:07:00Z"))
        assert not changed and h["points"][0]["btcUsd"] == 68000

    def test_fill_nulls_until_0600(self) -> None:
        first, _ = apply_daily_close(empty_history(), values(fearGreed=None), parse_iso("2026-10-21T00:07:00Z"))
        filled, changed = apply_daily_close(first, values(fearGreed=33), parse_iso("2026-10-21T01:07:00Z"))
        assert changed and filled["points"][0]["fearGreed"] == 33
        _, late_changed = apply_daily_close(first, values(fearGreed=33), parse_iso("2026-10-21T07:07:00Z"))
        assert not late_changed

    def test_drops_provisional_and_sorts(self) -> None:
        h = {
            "schemaVersion": 1,
            "points": [{"date": "2026-10-19", **values()}, {"date": "2026-10-20", **values(), "provisional": True}],
        }
        r, _ = apply_daily_close(h, values(btcUsd=70000), parse_iso("2026-10-21T00:07:00Z"))
        assert [(p["date"], p["btcUsd"], p.get("provisional")) for p in r["points"]] == [
            ("2026-10-19", 68000, None),
            ("2026-10-20", 70000, None),
        ]

    def test_with_provisional_not_duplicated(self) -> None:
        base = {"schemaVersion": 1, "points": [{"date": "2026-10-20", **values()}]}
        once = with_provisional(base, values(btcUsd=1), parse_iso("2026-10-21T05:00:00Z"))
        twice = with_provisional(once, values(btcUsd=2), parse_iso("2026-10-21T06:00:00Z"))
        assert len(twice["points"]) == 2
        assert twice["points"][1] | {"btcUsd": 2} == twice["points"][1]
        assert twice["points"][1]["provisional"] and twice["points"][1]["date"] == "2026-10-21"
        assert len(base["points"]) == 1


def point(date: str, **extra: Any) -> dict[str, Any]:
    return {"date": date, **dict.fromkeys(values(), 1), **extra}


def mock(handler: Any) -> HttpOptions:
    async def no_sleep(_: float) -> None:
        return None

    return HttpOptions(transport=httpx.MockTransport(handler), retries=0, sleep=no_sleep)


class TestState:
    def test_state_weeks(self) -> None:
        assert state_weeks(T2) == ["2026-W43", "2026-W42"]

    def test_store_then_empty(self, tmp_path: Path, quiet: Any) -> None:
        store, out = tmp_path / "store", tmp_path / "out"
        write_json(
            store / "history/daily.json",
            {"schemaVersion": 1, "points": [point("2026-10-19"), point("2026-10-20", provisional=True)]},
        )
        write_json(store / "news/2026-W42.json", {"schemaVersion": 1, "week": "2026-W42", "items": []})
        write_json(store / "news/2026-W40.json", {"schemaVersion": 1, "week": "2026-W40", "items": []})
        write_json(store / "news/broken.json", {"nope": True})
        s = asyncio.run(load_state(StateConfig("", store, out, T2, log=quiet)))
        assert [p["date"] for p in s.history["points"]] == ["2026-10-19"]
        assert s.origins["history/daily.json"] == "store"
        assert s.origins["news/2026-W42.json"] == "store"
        assert s.origins["news/2026-W43.json"] == "empty"
        assert list(s.archives) == ["2026-W43", "2026-W42"]
        assert [a["week"] for a in s.older_archives] == ["2026-W40"]
        assert s.prev_market is None

    def test_pages_first_then_store(self, tmp_path: Path, quiet: Any) -> None:
        store = tmp_path / "store"
        write_json(store / "history/daily.json", {"schemaVersion": 1, "points": [point("2026-10-01")]})

        def pages_up(req: httpx.Request) -> httpx.Response:
            if req.url.path.endswith("history/daily.json"):
                return httpx.Response(200, json={"schemaVersion": 1, "points": [point("2026-10-20")]})
            return httpx.Response(404)

        s1 = asyncio.run(load_state(StateConfig("https://p.example/r", store, tmp_path / "o", T2, mock(pages_up), quiet)))
        assert s1.origins["history/daily.json"] == "pages"
        assert s1.history["points"][0]["date"] == "2026-10-20"

        s2 = asyncio.run(
            load_state(StateConfig("https://p.example/r", store, tmp_path / "o", T2, mock(lambda _: httpx.Response(503)), quiet))
        )
        assert s2.origins["history/daily.json"] == "store"
        assert s2.history["points"][0]["date"] == "2026-10-01"

    def test_bad_pages_schema_falls_back(self, tmp_path: Path, quiet: Any) -> None:
        store = tmp_path / "store"
        write_json(store / "history/daily.json", {"schemaVersion": 1, "points": []})
        bad = mock(lambda _: httpx.Response(200, json={"schemaVersion": 2}))
        s = asyncio.run(load_state(StateConfig("https://p.example", store, tmp_path / "o", T2, bad, quiet)))
        assert s.origins["history/daily.json"] == "store"


def test_json_matches_js_stringify() -> None:
    assert to_json({"a": 68450.0, "b": 1.5, "c": None, "d": "Монгол"}) == '{"a":68450,"b":1.5,"c":null,"d":"Монгол"}'
    # optional талбар байхгүй бол JSON-д гарахгүй (null биш) — Zod-ийн .optional()-той ижил
    m = parse(LiveMarket, build_market(all_ok_inputs(), None, T1))
    assert "stale" not in json.dumps(m["sources"])
