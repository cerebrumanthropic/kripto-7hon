# Мэдээний ангилал (SPEC §5.5) — src/lib/classify.ts-ийн хуулбар (апп ч ашигладаг тул дүрмийг хоёуланд нь өөрчил).
# Латин түлхүүр үг нь гарчгийн үгийн эхэнд таарна (\b, JS-ийн адил ASCII). Богино үгс бүтэн үгээр л таарна —
# «impact», «banner», «federal» буруу орохоос сэргийлнэ. Кирилл үгийн хэсгийг дэд мөрөөр таарна.
import re
from dataclasses import dataclass, field

from kripto_api.schemas import NewsTag


@dataclass(frozen=True)
class _Rule:
    tag: NewsTag
    stems: list[str]
    words: list[str]
    mn: list[str] = field(default_factory=list)


RULES = [
    _Rule(
        "regulation",
        ["regulat", "licen", "lawsuit", "sanction", "legislat"],
        ["sec", "cftc", "law", "laws", "bill", "act", "mica", "fatf", "ban", "bans", "banned", "court", "tax", "taxes"],
        ["сзх", "хууль", "зохицуул", "зөвшөөрөл", "татвар", "шүүх"],
    ),
    _Rule(
        "etf", ["inflow", "outflow", "blackrock", "grayscale"], ["etf", "etfs", "etp", "etps", "fund flow", "fund flows", "ibit"]
    ),
    # «луйвар» → «луйврын» (эгшиг гээгдэх) тул язгуур «луйв»
    _Rule(
        "security",
        ["hack", "exploit", "drain", "stolen", "phishing", "breach", "attack", "scam"],
        [],
        ["хакер", "луйв", "залилан", "хулгайл"],
    ),
    _Rule(
        "macro",
        ["inflation", "treasur", "recession", "tariff"],
        ["fed", "fomc", "cpi", "rate cut", "rate cuts", "rate hike", "rate hikes", "dollar"],
    ),
    _Rule("stablecoin", ["stablecoin", "tether"], ["usdt", "usdc", "circle"], ["стейблкойн"]),
    _Rule("defi", ["defi", "uniswap", "aave", "lending"], ["dex", "dexs", "dexes", "tvl"]),
    _Rule("mining", ["mining", "miner", "hashrate", "halving"], [], ["олборл"]),
]


def _compile(r: _Rule) -> tuple[NewsTag, re.Pattern[str], re.Pattern[str] | None]:
    latin = "|".join([*(rf"\b{re.escape(s)}" for s in r.stems), *(rf"\b{re.escape(w)}\b" for w in r.words)])
    mn = re.compile("|".join(map(re.escape, r.mn)), re.I) if r.mn else None
    return r.tag, re.compile(latin, re.I | re.A), mn


_COMPILED = [_compile(r) for r in RULES]

_MONGOLIA_LATIN = re.compile(r"\b(mongolia|mongolian|ulaanbaatar)\b", re.I | re.A)
_MONGOLIA_MN = re.compile(r"монгол|улаанбаатар", re.I)

# «Bitcoin Treasury Company», «crypto treasury» — компанийн нөөцийн стратеги, АНУ-ын Сангийн яам биш
_CORPORATE_TREASURY = re.compile(
    r"\b(bitcoin|btc|crypto|ether|ethereum|eth|sol|solana|digital[- ]asset|corporate)\s+treasur(y|ies)\b", re.I | re.A
)


def classify(title: str) -> list[NewsTag]:
    """Гарчгаас ангиллын жагсаалт; аль нь ч таарахгүй бол ['market']."""
    text = _CORPORATE_TREASURY.sub(r"\1 reserve", title)
    tags = [tag for tag, latin, mn in _COMPILED if latin.search(text) or (mn and mn.search(text))]
    return tags or ["market"]


def is_mongolia(title: str, source_is_mongolian: bool = False) -> bool:
    """Монголтой холбоотой эсэх: гарчиг эсвэл монгол эх сурвалж."""
    return source_is_mongolian or bool(_MONGOLIA_LATIN.search(title) or _MONGOLIA_MN.search(title))
