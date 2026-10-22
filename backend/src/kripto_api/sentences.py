# Дүрэмд суурилсан монгол өгүүлбэр (SPEC §7.3.5).
# «%», «$» тэмдэгтэд залгавар залгахгүйн тулд «хувиар», «ам.доллар/ам.долларт» гэж үгээр бичнэ.
# 0.05%-иас бага өөрчлөлт → «бараг өөрчлөгдөөгүй».
import re
from typing import Any, Literal

from kripto_api.jsnum import to_fixed, to_precision

UsdCase = Literal["nom", "dat"]  # «ам.доллар» | «ам.долларт»
_USD: dict[UsdCase, str] = {"nom": "ам.доллар", "dat": "ам.долларт"}


def group_digits(value: float, decimals: int = 0) -> str:
    """src/lib/format.ts → groupDigits: 68450 → «68,450»"""
    int_part, _, frac = to_fixed(abs(value), decimals).partition(".")
    grouped = re.sub(r"\B(?=(\d{3})+(?!\d))", ",", int_part)
    return f"{grouped}.{frac}" if frac else grouped


def direction(value: float | None, epsilon: float = 0.05) -> Literal["up", "down", "flat"]:
    """src/lib/format.ts → direction"""
    if value is None or abs(value) < epsilon:
        return "flat"
    return "up" if value > 0 else "down"


def usd_words(v: float, case: UsdCase = "nom") -> str:
    """2.45e12 → «2.45 их наяд ам.доллар»; 3.124e11 → «312.4 тэрбум …»; 68450 → «68,450 …»"""
    a = abs(v)
    if a >= 1e12:
        n = f"{to_fixed(a / 1e12, 2)} их наяд"
    elif a >= 1e9:
        n = f"{to_fixed(a / 1e9, 1)} тэрбум"
    elif a >= 1e6:
        n = f"{to_fixed(a / 1e6, 1)} сая"
    elif a >= 1000:
        n = group_digits(a, 0)
    elif a >= 1:
        n = group_digits(a, 2)
    else:
        n = to_precision(a, 4)
    return f"{n} {_USD[case]}"


def pct_words(v: float) -> str:
    """4.234 → «4.2 хувиар» (тэмдэггүй)"""
    return f"{group_digits(abs(v), 1)} хувиар"


def pct_noun(v: float) -> str:
    """57.84 → «57.8 хувь»"""
    return f"{group_digits(v, 1)} хувь"


_CONVERB = {"grow": "өсөж", "fall": "буурч"}  # нийлмэл өгүүлбэрийн дунд
_PERFECT = {"grow": "нэмэгдлээ", "fall": "буурлаа"}  # өгүүлбэрийн төгсгөл
_PERFECT_GROW = {"grow": "өслөө", "fall": "буурлаа"}


def _verb(forms: dict[str, str], change: float) -> str:
    return forms["grow"] if change > 0 else forms["fall"]


def price_sentence(name: str, genitive: str, price: float, change: float | None) -> str:
    """«Биткойн 7 хоногт 4.2 хувиар өсөж, 68,450 ам.долларт хүрлээ.»"""
    if change is None or direction(change) == "flat":
        return f"{genitive} ханш 7 хоногт бараг өөрчлөгдөөгүй, {usd_words(price)} байна."
    return f"{name} 7 хоногт {pct_words(change)} {_verb(_CONVERB, change)}, {usd_words(price, 'dat')} хүрлээ."


def total_sentence(total: float, change: float | None, estimated: bool) -> str:
    """«Криптогийн нийт зах зээлийн үнэлгээ 2.45 их наяд ам.доллар болж, 7 хоногт 3.1 хувиар нэмэгдлээ.»"""
    if change is None:
        return f"Криптогийн нийт зах зээлийн үнэлгээ {usd_words(total)} байна."
    base = f"Криптогийн нийт зах зээлийн үнэлгээ {usd_words(total)} болж"
    est = " (топ 100-аар тооцоолсон)" if estimated else ""
    if direction(change) == "flat":
        return f"{base}, 7 хоногт бараг өөрчлөгдөөгүй{est}."
    return f"{base}, 7 хоногт {pct_words(change)} {_verb(_PERFECT, change)}{est}."


def dominance_sentence(now: float, prev: float | None) -> str:
    """«Биткойны давамгайлал 57.8 хувь боллоо (өмнөх 7 хоногт 57.1 хувь).»"""
    if prev is None:
        return f"Биткойны давамгайлал {pct_noun(now)} байна."
    return f"Биткойны давамгайлал {pct_noun(now)} боллоо (өмнөх 7 хоногт {pct_noun(prev)})."


def stable_sentence(total: float, change: float | None) -> str:
    """«Стейблкойны нийт нийлүүлэлт 312.4 тэрбум ам.доллар, 7 хоногт 0.8 хувиар өслөө.»"""
    base = f"Стейблкойны нийт нийлүүлэлт {usd_words(total)}"
    if change is None:
        return f"{base} байна."
    if direction(change) == "flat":
        return f"{base}, 7 хоногт бараг өөрчлөгдөөгүй."
    return f"{base}, 7 хоногт {pct_words(change)} {_verb(_PERFECT_GROW, change)}."


def tvl_sentence(tvl: float, change: float | None) -> str:
    """«DeFi-д түгжигдсэн нийт хөрөнгө (TVL) 118.2 тэрбум ам.доллар байна.»"""
    base = f"DeFi-д түгжигдсэн нийт хөрөнгө (TVL) {usd_words(tvl)} байна"
    if change is None or direction(change) == "flat":
        return f"{base}."
    return f"{base}, 7 хоногт {pct_words(change)} {_verb(_PERFECT, change)}."


def fear_greed_sentence(value: float, label_mn: str, prev: float | None) -> str:
    """«Айдас ба шунахайн индекс 34 (Айдас) байна, өмнөх 7 хоногт 52 байсан.»"""
    base = f"Айдас ба шунахайн индекс {value} ({label_mn}) байна"
    return f"{base}." if prev is None else f"{base}, өмнөх 7 хоногт {prev} байсан."


def top_gainer_sentence(symbol: str, change: float) -> str:
    """«Топ 100-аас хамгийн их өссөн нь XYZ (+38.5%).» — хаалтан доторх тэмдэгтэд залгавар залгахгүй"""
    return f"Топ 100-аас хамгийн их өссөн нь {symbol} (+{group_digits(change, 1)}%)."


def suggest_sentences(a: dict[str, Any]) -> list[str]:
    """Тайлангийн автомат хэсгээс санал болгох өгүүлбэрүүд. Эхнийх нь headline, дараагийн 3 нь takeaways (--auto-publish)."""
    out: list[str] = []
    btc = next((m for m in a["majors"] if m["symbol"] == "BTC"), None)
    eth = next((m for m in a["majors"] if m["symbol"] == "ETH"), None)
    g, st, fg, defi = a["global"], a["stablecoins"], a["fearGreed"], a["defi"]
    if btc:
        out.append(price_sentence("Биткойн", "Биткойны", btc["priceUsd"], btc["change7dPct"]))
    out.append(total_sentence(g["totalMarketCapUsd"], g["change7dPct"], g["change7dMethod"] == "top100-estimate"))
    out.append(dominance_sentence(g["btcDominancePct"], g["btcDominancePct7dAgo"]))
    out.append(stable_sentence(st["totalUsd"], st["change7dPct"]))
    out.append(fear_greed_sentence(fg["value"], fg["labelMn"], fg["value7dAgo"]))
    out.append(tvl_sentence(defi["tvlUsd"], defi["change7dPct"]))
    if eth:
        out.append(price_sentence("Этериум", "Этериумын", eth["priceUsd"], eth["change7dPct"]))
    top = a["topGainers"][0] if a["topGainers"] else None
    if top and top["change7dPct"] > 0:
        out.append(top_gainer_sentence(top["symbol"], top["change7dPct"]))
    return out
