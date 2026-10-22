# open.er-api.com (SPEC §5.4). Лавлах ханш — Монголбанкны албан ханш биш.
# Иш татах: «Rates By Exchange Rate API» (UI).
from typing import Any, Literal

from pydantic import BaseModel, PositiveFloat

from kripto_api.http import HttpOptions, get_json
from kripto_api.jsnum import from_unix, iso_z
from kripto_api.schemas import Num


class _Rates(BaseModel):
    MNT: PositiveFloat


class _ErApi(BaseModel):
    result: Literal["success"]
    time_last_update_unix: Num
    rates: _Rates


def parse_fx(raw: Any) -> dict[str, Any]:
    d = _ErApi.model_validate(raw)
    return {"usdMnt": d.rates.MNT, "source": "exchangerate-api", "asOf": iso_z(from_unix(d.time_last_update_unix))}


async def fetch_fx(http: HttpOptions | None = None) -> dict[str, Any]:
    return parse_fx(await get_json("https://open.er-api.com/v6/latest/USD", http))
