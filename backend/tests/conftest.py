import json
from pathlib import Path
from typing import Any

import pytest

from kripto_api import assemble
from kripto_api.sources import coingecko, defillama
from kripto_api.sources.feargreed import parse_fear_greed
from kripto_api.sources.fx import parse_fx

FIXTURES = Path(__file__).parent / "fixtures"
REPO = Path(__file__).resolve().parents[2]


def fixture(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def all_ok_inputs() -> assemble.MarketInputs:
    return {
        "coingecko": assemble.ok(
            {
                "global": coingecko.parse_global(fixture("coingecko-global.json")),
                "coins": coingecko.parse_markets(fixture("coingecko-markets.json")),
                "trending": coingecko.parse_trending(fixture("coingecko-trending.json")),
            }
        ),
        "tvl": assemble.ok(defillama.parse_tvl(fixture("defillama-historicalChainTvl.json"))),
        "stablecoins": assemble.ok(
            {
                **defillama.parse_stable_chart(fixture("defillama-stablecoincharts-all.json")),
                **defillama.parse_stablecoins(fixture("defillama-stablecoins.json")),
            }
        ),
        "dexs": assemble.ok(defillama.parse_dexs(fixture("defillama-dexs-overview.json"))),
        "feargreed": assemble.ok(parse_fear_greed(fixture("feargreed.json"))),
        "fx": assemble.ok(parse_fx(fixture("fx-open-er-api.json"))),
    }


@pytest.fixture
def quiet() -> Any:
    return lambda _msg: None
