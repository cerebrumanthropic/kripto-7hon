# Pydantic схемүүд (SPEC §6) — src/types/schemas.ts (Zod)-ийн хуулбар. Апп нь JSON-ийг Zod-оор шалгадаг тул
# хоёр талыг ижил байлга: талбар нэмэх/өөрчлөхдөө schemas.ts-ийг ч бас шинэчил.
# Дотооддоо өгөгдлийг dict-ээр дамжуулж, хилийн цэг (бичих/унших)-д `parse`/`safe_parse`-аар шалгана —
# `.optional()` талбар байхгүй (null биш) үлдэх нь Zod-той ижил JSON гаргана.
from typing import Annotated, Any, Literal

from pydantic import AfterValidator, BaseModel, Field, ValidationError

Num = int | float  # JS number; int|float smart union нь бүхэл тоог «1.0» болгохгүй
Iso = Annotated[str, Field(min_length=10)]
Day = Annotated[str, Field(pattern=r"^\d{4}-\d{2}-\d{2}$")]
Week = Annotated[str, Field(pattern=r"^\d{4}-W\d{2}$")]
Url = Annotated[str, Field(pattern=r"^https://")]


def _between(lo: float, hi: float) -> AfterValidator:
    def check(v: Num) -> Num:
        if not lo <= v <= hi:
            raise ValueError(f"{lo}–{hi} байх ёстой")
        return v

    return AfterValidator(check)


def _positive(v: Num) -> Num:
    if not v > 0:
        raise ValueError("> 0 байх ёстой")
    return v


Pct100 = Annotated[Num, _between(0, 100)]


class SourceStatus(BaseModel):
    id: str
    ok: bool
    fetchedAt: Iso
    stale: bool | None = None
    error: str | None = None


class LiveCoin(BaseModel):
    id: str
    symbol: str
    name: str
    rank: Num
    priceUsd: Num
    priceMnt: Num | None
    change24hPct: Num | None
    change7dPct: Num | None
    marketCapUsd: Num
    volume24hUsd: Num
    isStablecoin: bool


class LiveGlobal(BaseModel):
    totalMarketCapUsd: Num
    totalVolume24hUsd: Num
    marketCapChange24hPct: Num
    btcDominancePct: Num
    ethDominancePct: Num
    activeCryptocurrencies: Num


class Trending(BaseModel):
    id: str
    symbol: str
    name: str
    rank: Num | None


class DayValue(BaseModel):
    date: Day
    value: Num


class LiveFearGreed(BaseModel):
    value: Pct100
    labelEn: str
    labelMn: str
    timestamp: Iso
    history: list[DayValue]


class LiveStableTop(BaseModel):
    symbol: str
    name: str
    circulatingUsd: Num
    change7dPct: Num | None


class LiveStablecoins(BaseModel):
    totalUsd: Num
    change7dPct: Num | None
    top: list[LiveStableTop]


class LiveDefi(BaseModel):
    tvlUsd: Num
    change7dPct: Num | None
    dexVolume24hUsd: Num | None
    dexVolume7dUsd: Num | None


class LiveFx(BaseModel):
    usdMnt: Num
    source: Literal["exchangerate-api"]
    asOf: Iso


class LiveMarket(BaseModel):
    schemaVersion: Literal[1]
    updatedAt: Iso
    sources: list[SourceStatus]
    global_: LiveGlobal | None = Field(alias="global")
    coins: list[LiveCoin]
    trending: list[Trending]
    fearGreed: LiveFearGreed | None
    stablecoins: LiveStablecoins | None
    defi: LiveDefi | None
    fx: LiveFx | None


NEWS_TAGS = ("regulation", "etf", "security", "macro", "stablecoin", "defi", "mining", "market")
NewsTag = Literal["regulation", "etf", "security", "macro", "stablecoin", "defi", "mining", "market"]


class NewsItem(BaseModel):
    id: Annotated[str, Field(min_length=12, max_length=12)]
    title: str
    url: Url
    source: str
    sourceUrl: Url
    publishedAt: Iso
    tags: Annotated[list[NewsTag], Field(min_length=1)]
    isMongolia: bool


class NewsFeed(BaseModel):
    schemaVersion: Literal[1]
    updatedAt: Iso
    sources: list[SourceStatus]
    items: list[NewsItem]


class DailyPoint(BaseModel):
    date: Day
    totalMarketCapUsd: Num | None
    totalVolume24hUsd: Num | None
    btcDominancePct: Num | None
    btcUsd: Num | None
    ethUsd: Num | None
    stablecoinsUsd: Num | None
    defiTvlUsd: Num | None
    fearGreed: Num | None
    usdMnt: Num | None
    provisional: bool | None = None


class DailyHistory(BaseModel):
    schemaVersion: Literal[1]
    points: list[DailyPoint]


class NewsWeekArchive(BaseModel):
    schemaVersion: Literal[1]
    week: Week
    items: list[NewsItem]


class LiveStatus(BaseModel):
    schemaVersion: Literal[1]
    updatedAt: Iso
    sources: list[SourceStatus]
    coingeckoCallsThisRun: Num


class CoinMove(BaseModel):
    symbol: str
    name: str
    priceUsd: Num
    change7dPct: Num
    marketCapUsd: Num


class WeeklyGlobal(BaseModel):
    totalMarketCapUsd: Num
    totalMarketCapUsd7dAgo: Num | None
    change7dPct: Num | None
    change7dMethod: Literal["history", "top100-estimate"] | None
    btcDominancePct: Pct100
    btcDominancePct7dAgo: Num | None
    ethDominancePct: Pct100
    totalVolume24hUsd: Num


class ChartPoint(BaseModel):
    date: Day
    priceUsd: Num


class Major(BaseModel):
    symbol: Literal["BTC", "ETH"]
    priceUsd: Annotated[Num, AfterValidator(_positive)]
    priceMnt: Num | None
    change7dPct: Num
    change30dPct: Num | None
    chart30d: list[ChartPoint]


class WeeklyStableTop(BaseModel):
    symbol: str
    circulatingUsd: Num
    change7dPct: Num | None


class WeeklyStablecoins(BaseModel):
    totalUsd: Num
    change7dPct: Num | None
    top: list[WeeklyStableTop]
    series30d: list[DayValue] | None = None  # SPEC §6-аас нэмэлт: инфографикийн sparkline (SPEC §8.8.5)


class WeeklyDefi(BaseModel):
    tvlUsd: Num
    change7dPct: Num | None
    dexVolume7dUsd: Num | None
    dexChange7dPct: Num | None
    series30d: list[DayValue] | None = None


class WeeklyFearGreed(BaseModel):
    value: Pct100
    labelMn: str
    value7dAgo: Num | None
    series7d: list[DayValue]


class WeeklyFx(BaseModel):
    usdMnt: Num
    source: str
    asOf: Iso


class SymbolName(BaseModel):
    symbol: str
    name: str


class Hack(BaseModel):
    name: str
    date: Day
    amountUsd: Num | None
    url: Url | None = None


class WeeklyAuto(BaseModel):
    schemaVersion: Literal[1]
    week: Week
    periodStart: Day
    periodEnd: Day
    cutoffUtc: Iso
    fetchedAt: Iso
    global_: WeeklyGlobal = Field(alias="global")
    majors: list[Major]
    topGainers: list[CoinMove]
    topLosers: list[CoinMove]
    heatmapTop20: list[CoinMove]
    stablecoins: WeeklyStablecoins
    defi: WeeklyDefi
    fearGreed: WeeklyFearGreed
    fx: WeeklyFx | None
    trending: list[SymbolName]
    newsCandidates: list[NewsItem]
    hacks: list[Hack] | None
    suggestedSentences: list[str]
    sources: list[SourceStatus]


class LinkItem(BaseModel):
    text: str
    url: Url


class Etf(BaseModel):
    btc_net_flow_usd: Num | None = None
    eth_net_flow_usd: Num | None = None
    source_name: str | None = None
    source_url: str | None = None


class CoinShares(BaseModel):
    weekly_flow_usd: Num | None = None
    url: str | None = None


class CalendarItem(BaseModel):
    date: Day
    event: str


class Correction(BaseModel):
    date: Day
    text: str


class Editorial(BaseModel):
    """content/reports/<week>.md frontmatter (SPEC §6.1)"""

    week: Week
    status: Literal["draft", "published"]
    headline: Annotated[str, Field(max_length=120)]
    summary: str
    takeaways: list[str]
    etf: Etf | None = None
    coinshares: CoinShares | None = None
    mongolbank_usd_mnt: Num | None = None
    news_picks: list[str] = []
    mongolia: list[LinkItem] = []
    regulation: list[LinkItem] = []
    calendar: list[CalendarItem] = []
    author: str = ""
    corrections: list[Correction] = []


def parse(model: type[BaseModel], data: Any) -> dict[str, Any]:
    """Zod `.parse`: шалгаж, мэдэгдээгүй түлхүүрийг хасна. Алдаа → ValidationError."""
    return model.model_validate(data).model_dump(mode="json", by_alias=True, exclude_unset=True)


def safe_parse(model: type[BaseModel], data: Any) -> dict[str, Any] | None:
    try:
        return parse(model, data)
    except ValidationError:
        return None
