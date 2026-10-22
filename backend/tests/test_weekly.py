import json
import re
from dataclasses import replace
from typing import Any

import pytest

from kripto_api.jsnum import parse_iso, to_fixed
from kripto_api.report_md import report_markdown
from kripto_api.reports import parse_editorial
from kripto_api.schemas import Editorial, WeeklyAuto, parse
from kripto_api.sentences import (
    dominance_sentence,
    fear_greed_sentence,
    pct_words,
    price_sentence,
    stable_sentence,
    top_gainer_sentence,
    total_sentence,
    tvl_sentence,
    usd_words,
)
from kripto_api.sources.coingecko import parse_global, parse_market_chart, parse_markets
from kripto_api.sources.defillama import parse_stable_chart, parse_stablecoins, parse_tvl
from kripto_api.sources.feargreed import parse_fear_greed
from kripto_api.sources.fx import parse_fx
from kripto_api.validate import validate_report
from kripto_api.weekly import WeeklyInputs, build_weekly, pick_news_candidates, point_days_before, top100_change_7d

from .conftest import REPO, fixture


def news(id_: str, tag: str, at: str, mn: bool = False) -> dict[str, Any]:
    return {
        "id": id_.ljust(12, "0"),
        "title": f"Title {id_}",
        "url": f"https://n.example/{id_}",
        "source": "N",
        "sourceUrl": "https://n.example",
        "publishedAt": at,
        "tags": [tag],
        "isMongolia": mn,
    }


BTC_CHART = parse_market_chart(fixture("coingecko-market-chart-bitcoin.json"))


def inputs(**over: Any) -> WeeklyInputs:
    base = WeeklyInputs(
        week="2026-W43",
        now=parse_iso("2026-10-21T08:00:00Z"),
        global_=parse_global(fixture("coingecko-global.json")),
        coins=parse_markets(fixture("coingecko-markets.json")),
        charts={"BTC": BTC_CHART, "ETH": [{**p, "priceUsd": p["priceUsd"] / 30} for p in BTC_CHART]},
        tvl=parse_tvl(fixture("defillama-historicalChainTvl.json")),
        stablecoins={
            **parse_stable_chart(fixture("defillama-stablecoincharts-all.json")),
            **parse_stablecoins(fixture("defillama-stablecoins.json")),
        },
        dexs={"dexVolume7dUsd": 5e10, "dexChange7dPct": -1},
        fear_greed=parse_fear_greed(fixture("feargreed.json"), 8),
        fx=parse_fx(fixture("fx-open-er-api.json")),
        trending=[{"symbol": "sui", "name": "Sui"}],
        news=[news("a", "etf", "2026-10-20T01:00:00Z"), news("b", "market", "2026-10-20T02:00:00Z")],
        hacks=None,
        history={"schemaVersion": 1, "points": []},
        sources=[],
    )
    return replace(base, **over)


class TestWeekly:
    def test_top100_change(self) -> None:
        def c(mcap: float, ch: float | None) -> dict[str, Any]:
            return {"marketCapUsd": mcap, "change7dPct": ch}

        # 110 (өмнө 100) + 90 (өмнө 100) → 200/200 = 0%
        assert top100_change_7d([c(110, 10), c(90, -10)]) == pytest.approx(0)
        assert top100_change_7d([c(110, 10), c(5, None)]) == pytest.approx(10)
        assert top100_change_7d([]) is None

    def test_no_history_uses_estimate(self) -> None:
        w = build_weekly(inputs())
        assert w["global"]["change7dMethod"] == "top100-estimate"
        assert w["global"]["totalMarketCapUsd7dAgo"] is not None
        assert w["periodStart"] == "2026-10-19"
        assert w["cutoffUtc"] == "2026-10-25T23:59:59Z"

    def test_history_point_7_days_back(self) -> None:
        p = {"date": "2026-10-14", "totalMarketCapUsd": 2.5e12, "btcDominancePct": 58.123}
        p |= dict.fromkeys(["totalVolume24hUsd", "btcUsd", "ethUsd", "stablecoinsUsd", "defiTvlUsd", "fearGreed", "usdMnt"])
        w = build_weekly(inputs(history={"schemaVersion": 1, "points": [p]}))
        assert w["global"]["change7dMethod"] == "history"
        assert w["global"]["totalMarketCapUsd7dAgo"] == 2.5e12
        assert w["global"]["btcDominancePct7dAgo"] == 58.12
        assert point_days_before({"schemaVersion": 1, "points": [{**p, "provisional": True}]}, "2026-10-21", 7) is None

    def test_movers_exclude_stables(self) -> None:
        w = build_weekly(inputs())
        assert len(w["topGainers"]) == 5 and len(w["topLosers"]) == 5 and len(w["heatmapTop20"]) == 20
        movers = [*w["topGainers"], *w["topLosers"], *w["heatmapTop20"]]
        assert not any(m["symbol"] in ("USDT", "USDC") for m in movers)
        assert w["topGainers"][0]["change7dPct"] >= w["topGainers"][4]["change7dPct"]
        assert w["topLosers"][0]["change7dPct"] <= w["topLosers"][4]["change7dPct"]
        assert [m["symbol"] for m in w["majors"]] == ["BTC", "ETH"]
        assert len(w["majors"][0]["chart30d"]) >= 30
        assert w["majors"][0]["priceMnt"] > w["majors"][0]["priceUsd"]

    def test_fear_greed_series(self) -> None:
        w = build_weekly(inputs())
        assert len(w["fearGreed"]["series7d"]) == 7
        assert w["fearGreed"]["value7dAgo"] is not None
        assert w["fearGreed"]["series7d"][-1]["value"] == w["fearGreed"]["value"]

    def test_sentences(self) -> None:
        w = build_weekly(inputs())
        assert len(w["suggestedSentences"]) >= 7
        assert re.match(r"^Биткойн", w["suggestedSentences"][0])
        assert "топ 100-аар тооцоолсон" in w["suggestedSentences"][1]

    def test_pick_news_candidates(self) -> None:
        items = [
            *(news(f"m{k}", "market", f"2026-10-2{k % 2}T0{k}:00:00Z") for k in range(10)),
            news("e1", "etf", "2026-10-19T01:00:00Z"),
            news("r1", "regulation", "2026-10-19T02:00:00Z"),
            news("mn", "regulation", "2026-10-19T03:00:00Z", mn=True),
        ]
        r = pick_news_candidates(items)
        assert r[0]["id"].startswith("mn")
        assert len(r) <= 15
        assert sorted(i["tags"][0] for i in r[1:4]) == ["etf", "market", "regulation"]


class TestReportMarkdown:
    w = build_weekly(inputs())

    def test_draft_template_parses(self) -> None:
        e = parse_editorial(report_markdown(self.w))
        assert e.status == "draft" and e.week == "2026-W43"
        assert e.takeaways == ["", "", ""]

    def test_auto_publish(self) -> None:
        e = parse_editorial(report_markdown(self.w, auto_publish=True))
        assert e.status == "published"
        assert e.headline == self.w["suggestedSentences"][0]
        assert e.takeaways == self.w["suggestedSentences"][1:4]
        assert e.summary


class TestSentences:
    def test_usd_words(self) -> None:
        assert usd_words(2.45e12) == "2.45 их наяд ам.доллар"
        assert usd_words(3.124e11) == "312.4 тэрбум ам.доллар"
        assert usd_words(1.182e11) == "118.2 тэрбум ам.доллар"
        assert usd_words(68450, "dat") == "68,450 ам.долларт"
        assert usd_words(2.4712, "dat") == "2.47 ам.долларт"
        assert usd_words(4.5e6) == "4.5 сая ам.доллар"
        assert usd_words(0.000123456) == "0.0001235 ам.доллар"
        assert pct_words(-4.234) == "4.2 хувиар"

    def test_spec_examples(self) -> None:
        assert price_sentence("Биткойн", "Биткойны", 68450, 4.2) == "Биткойн 7 хоногт 4.2 хувиар өсөж, 68,450 ам.долларт хүрлээ."
        assert (
            price_sentence("Биткойн", "Биткойны", 68450, -4.2) == "Биткойн 7 хоногт 4.2 хувиар буурч, 68,450 ам.долларт хүрлээ."
        )
        assert (
            price_sentence("Биткойн", "Биткойны", 68450, 0.04)
            == "Биткойны ханш 7 хоногт бараг өөрчлөгдөөгүй, 68,450 ам.доллар байна."
        )
        assert (
            total_sentence(2.45e12, -0.01, False)
            == "Криптогийн нийт зах зээлийн үнэлгээ 2.45 их наяд ам.доллар болж, 7 хоногт бараг өөрчлөгдөөгүй."
        )
        assert (
            total_sentence(2.45e12, 3.1, False)
            == "Криптогийн нийт зах зээлийн үнэлгээ 2.45 их наяд ам.доллар болж, 7 хоногт 3.1 хувиар нэмэгдлээ."
        )
        assert (
            total_sentence(2.45e12, -3.1, True)
            == "Криптогийн нийт зах зээлийн үнэлгээ 2.45 их наяд ам.доллар болж, 7 хоногт 3.1 хувиар буурлаа (топ 100-аар тооцоолсон)."
        )
        assert dominance_sentence(57.8, 57.1) == "Биткойны давамгайлал 57.8 хувь боллоо (өмнөх 7 хоногт 57.1 хувь)."
        assert dominance_sentence(57.8, None) == "Биткойны давамгайлал 57.8 хувь байна."
        assert stable_sentence(3.124e11, 0.8) == "Стейблкойны нийт нийлүүлэлт 312.4 тэрбум ам.доллар, 7 хоногт 0.8 хувиар өслөө."
        assert tvl_sentence(1.182e11, None) == "DeFi-д түгжигдсэн нийт хөрөнгө (TVL) 118.2 тэрбум ам.доллар байна."
        assert fear_greed_sentence(34, "Айдас", 52) == "Айдас ба шунахайн индекс 34 (Айдас) байна, өмнөх 7 хоногт 52 байсан."
        assert top_gainer_sentence("XYZ", 38.5) == "Топ 100-аас хамгийн их өссөн нь XYZ (+38.5%)."

    def test_no_suffix_on_symbols(self) -> None:
        text = " ".join(
            [
                price_sentence("Биткойн", "Биткойны", 68450, -4.2),
                total_sentence(2.45e12, 3.1, True),
                stable_sentence(3.124e11, -0.8),
                tvl_sentence(1.182e11, 2.5),
            ]
        )
        assert not re.search(r"%[а-яөү]|\$", text, re.I)

    def test_to_fixed_matches_js(self) -> None:
        # JS: (2.5).toFixed(0) = "3", (1.005).toFixed(2) = "1.00" (хоёртын утга 1.00499…), (-0.05).toFixed(1) = "-0.1"
        assert (to_fixed(2.5, 0), to_fixed(1.005, 2), to_fixed(-0.05, 1)) == ("3", "1.00", "-0.1")


AUTO = parse(WeeklyAuto, json.loads((REPO / "scripts/__fixtures__/reports/2026-W42.json").read_text(encoding="utf-8")))


def ed(**over: Any) -> Editorial:
    base = {
        "week": "2026-W42",
        "status": "published",
        "headline": "BTC 4.2 хувиар буурав",
        "summary": "Товч.",
        "takeaways": ["a 1", "b 2", "c 3"],
    }
    return Editorial.model_validate({**base, **over})


class TestValidate:
    def test_valid_report(self) -> None:
        assert validate_report(ed(), AUTO).errors == []

    def test_editorial_fields(self) -> None:
        errs = validate_report(ed(headline="", summary=" ", takeaways=["x", ""]), AUTO).errors
        for needle in ("headline", "summary", "яг 3", "takeaways[2]"):
            assert any(needle in e for e in errs), needle

    def test_etf_source_and_https(self) -> None:
        r = validate_report(
            ed(
                etf={"btc_net_flow_usd": -1e9, "source_url": ""},
                mongolia=[{"text": "t", "url": "https://ok.mn"}],
                news_picks=["http://insecure.example"],
            ),
            AUTO,
        )
        assert any("etf.source_url заавал" in e for e in r.errors)
        assert any("news_picks[1]" in e for e in r.errors)

    def test_missing_json_or_week_mismatch(self) -> None:
        assert any(".json" in e for e in validate_report(ed(), None).errors)
        assert any("зөрж" in e for e in validate_report(ed(week="2026-W41"), AUTO).errors)

    def test_logic_checks(self) -> None:
        bad = {**AUTO, "global": {**AUTO["global"], "btcDominancePct": 120}, "fearGreed": {**AUTO["fearGreed"], "value": 101}}
        r = validate_report(ed(), bad)
        assert any("BTC давамгайлал" in e for e in r.errors)
        assert any("F&G" in e for e in r.errors)
        spike = {**AUTO, "topGainers": [{**AUTO["topGainers"][0], "change7dPct": 75}]}
        r2 = validate_report(ed(), spike)
        assert r2.errors == []
        assert any("|%| > 60" in w for w in r2.warnings)
