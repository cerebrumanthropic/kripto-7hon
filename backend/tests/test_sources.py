# Бодит хариуны fixture-ээр задлагчийг шалгана (tests/fixtures, 2026.10.21 авсан).
import pytest
from pydantic import ValidationError

from kripto_api.classify import classify, is_mongolia
from kripto_api.dates import iso_week, week_range
from kripto_api.sources.coingecko import parse_global, parse_market_chart, parse_markets, parse_trending
from kripto_api.sources.defillama import parse_dexs, parse_hacks, parse_stable_chart, parse_stablecoins, parse_tvl
from kripto_api.sources.feargreed import parse_fear_greed
from kripto_api.sources.fx import parse_fx
from kripto_api.stablecoins import make_stable_detector

from .conftest import fixture


class TestCoinGecko:
    def test_global(self) -> None:
        g = parse_global(fixture("coingecko-global.json"))
        assert g["totalMarketCapUsd"] > 1e12
        assert 30 < g["btcDominancePct"] < 80
        assert isinstance(g["activeCryptocurrencies"], int)

    def test_markets_sorted_with_changes(self) -> None:
        coins = parse_markets(fixture("coingecko-markets.json"))
        assert len(coins) >= 95
        assert coins[0]["symbol"] == "btc"
        assert [c["rank"] for c in coins] == sorted(c["rank"] for c in coins)
        assert sum(c["change7dPct"] is not None for c in coins) > 90

    def test_trending(self) -> None:
        t = parse_trending(fixture("coingecko-trending.json"))
        assert t and "symbol" in t[0]

    def test_market_chart_daily_unique(self) -> None:
        s = parse_market_chart(fixture("coingecko-market-chart-bitcoin.json"))
        assert len(s) >= 30
        assert len({p["date"] for p in s}) == len(s)

    def test_rejects_bad_response(self) -> None:
        with pytest.raises(ValidationError):
            parse_global({"data": {}})


class TestDefiLlama:
    def test_tvl(self) -> None:
        r = parse_tvl(fixture("defillama-historicalChainTvl.json"))
        assert r["tvlUsd"] > 1e10
        assert r["change7dPct"] is not None and abs(r["change7dPct"]) < 50

    def test_tvl_picks_point_exactly_7_days_back(self) -> None:
        day = 86_400
        pts = [{"date": i * day, "tvl": 100 + i} for i in range(10)]
        # сүүлийн = 109 (өдөр 9), 7 хоногийн өмнө = өдөр 2 → 102
        assert parse_tvl(pts)["change7dPct"] == pytest.approx((109 / 102 - 1) * 100)

    def test_stable_total_sums_all_pegs(self) -> None:
        raw = fixture("defillama-stablecoincharts-all.json")
        last = raw[-1]["totalCirculatingUSD"]
        r = parse_stable_chart(raw)
        assert r["totalUsd"] == pytest.approx(sum(last.values()))
        assert r["totalUsd"] > last["peggedUSD"]

    def test_stable_top5(self) -> None:
        r = parse_stablecoins(fixture("defillama-stablecoins.json"))
        assert len(r["top"]) == 5
        assert r["top"][0]["symbol"] == "USDT"
        assert r["top"][0]["circulatingUsd"] > r["top"][4]["circulatingUsd"]
        assert "usdt" in r["symbols"]

    def test_dexs(self) -> None:
        r = parse_dexs(fixture("defillama-dexs-overview.json"))
        assert r["dexVolume24hUsd"] > 0
        assert r["dexVolume7dUsd"] > r["dexVolume24hUsd"]

    def test_hacks_filtered_by_time(self) -> None:
        raw = fixture("defillama-hacks.json")
        newest = raw[0]["date"]
        r = parse_hacks(raw, newest - 7 * 86_400, newest)
        assert r and len(r[0]["date"]) == 10
        assert parse_hacks(raw, 0, 1) == []


def test_fear_greed() -> None:
    r = parse_fear_greed(fixture("feargreed.json"))
    assert 0 <= r["value"] <= 100
    assert r["labelMn"] != r["labelEn"]
    assert len(r["history"]) == 30
    assert r["history"][0]["date"] < r["history"][29]["date"]
    assert r["history"][29]["value"] == r["value"]


def test_fx() -> None:
    r = parse_fx(fixture("fx-open-er-api.json"))
    assert 2000 < r["usdMnt"] < 6000
    assert r["asOf"].endswith("Z")
    with pytest.raises(ValidationError):
        parse_fx({"result": "error", "rates": {}})


class TestStableDetector:
    coins = parse_markets(fixture("coingecko-markets.json"))
    is_stable = staticmethod(make_stable_detector(parse_stablecoins(fixture("defillama-stablecoins.json"))["symbols"]))

    def test_main_stables(self) -> None:
        for s in ("usdt", "usdc", "dai", "usde"):
            c = next((x for x in self.coins if x["symbol"] == s), None)
            if c:
                assert self.is_stable(c)

    def test_not_fooled_by_price_near_1(self) -> None:
        assert not self.is_stable({"symbol": "sui", "name": "Sui", "priceUsd": 1.0})
        assert not self.is_stable({"symbol": "btc", "name": "Bitcoin", "priceUsd": 82000})

    def test_usd_name_near_1(self) -> None:
        assert make_stable_detector([])({"symbol": "xyzusd", "name": "XYZ USD", "priceUsd": 1.001})
        assert not make_stable_detector([])({"symbol": "xyzusd", "name": "XYZ USD", "priceUsd": 0.9})


def test_classify() -> None:
    assert classify("SEC sues exchange over unregistered tokens") == ["regulation"]
    assert classify("Impact of banner federal") == ["market"]  # бүтэн үгээр л таарна
    assert classify("Bitcoin Treasury Company raises $1B") == ["market"]  # компанийн нөөц ≠ Сангийн яам
    assert classify("US Treasury yields climb") == ["macro"]
    assert classify("Монголд крипто луйврын хэрэг") == ["security"]
    assert is_mongolia("Ulaanbaatar hosts blockchain week")
    assert is_mongolia("МОНГОЛ улс")
    assert not is_mongolia("Mongolianism")


def test_iso_weeks() -> None:
    assert iso_week("2026-10-21T05:07:00Z") == "2026-W43"
    assert iso_week("2027-01-03T12:00:00Z") == "2026-W53"
    assert week_range("2026-W43") == {"start": "2026-10-19", "end": "2026-10-25", "cutoffUtc": "2026-10-25T23:59:59Z"}
    with pytest.raises(ValueError):
        week_range("2026-43")
