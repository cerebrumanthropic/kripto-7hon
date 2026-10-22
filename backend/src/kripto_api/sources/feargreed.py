# Alternative.me Fear & Greed (SPEC §5.3). Иш татах тэмдэглэгээ виджетийн яг доор (UI).
from typing import Annotated, Any

from pydantic import BaseModel, Field

from kripto_api.http import HttpOptions, get_json
from kripto_api.jsnum import day_of, from_unix, iso_z

# src/lib/i18n-mn.ts → fearGreedLabels (PROGRESS D7)
FEAR_GREED_MN = {
    "Extreme Fear": "Хэт айдас",
    "Fear": "Айдас",
    "Neutral": "Төвийг сахисан",
    "Greed": "Шунахай",
    "Extreme Greed": "Хэт шунахай",
}


def fear_greed_mn(label_en: str) -> str:
    return FEAR_GREED_MN.get(label_en, label_en)


class _Fng(BaseModel):
    value: Annotated[int, Field(ge=0, le=100)]  # API мөрөөр буцаадаг ("34") → бүхэл тоо
    value_classification: str
    timestamp: float


class _FngResponse(BaseModel):
    data: Annotated[list[_Fng], Field(min_length=1)]


def parse_fear_greed(raw: Any, days: int = 30) -> dict[str, Any]:
    """API шинээс хуучин руу буцаана → history-г хуучнаас шинэ рүү, сүүлийн `days` өдөр."""
    data = _FngResponse.model_validate(raw).data
    latest = data[0]
    history = [{"date": day_of(from_unix(d.timestamp)), "value": d.value} for d in reversed(data)][-days:]
    return {
        "value": latest.value,
        "labelEn": latest.value_classification,
        "labelMn": fear_greed_mn(latest.value_classification),
        "timestamp": iso_z(from_unix(latest.timestamp)),
        "history": history,
    }


async def fetch_fear_greed(limit: int = 31, http: HttpOptions | None = None) -> dict[str, Any]:
    return parse_fear_greed(await get_json(f"https://api.alternative.me/fng/?limit={limit}", http))
