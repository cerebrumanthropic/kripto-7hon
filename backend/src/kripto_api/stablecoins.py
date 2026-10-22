# Стейблкойн илрүүлэлт (SPEC §7.2.6):
# DefiLlama-гийн симбол ∪ үндсэн жагсаалт ∪ (үнэ 0.97–1.03 бөгөөд нэр нь «usd» агуулсан).
from collections.abc import Callable, Iterable, Mapping
from typing import Any

BASE_STABLES = ["usdt", "usdc", "dai", "usde", "fdusd", "pyusd", "tusd", "usds", "usdd", "rlusd"]


def make_stable_detector(defillama_symbols: Iterable[str] = ()) -> Callable[[Mapping[str, Any]], bool]:
    known = {*BASE_STABLES, *(s.lower() for s in defillama_symbols)}

    def is_stable(c: Mapping[str, Any]) -> bool:
        return c["symbol"].lower() in known or (0.97 <= c["priceUsd"] <= 1.03 and "usd" in c["name"].lower())

    return is_stable
