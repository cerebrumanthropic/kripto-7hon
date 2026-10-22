# JS-тэй ижил тоо/огнооны хэлбэржүүлэлт. Гаралтын JSON ба монгол өгүүлбэр нь TypeScript
# хувилбар (апп)-тай байт түвшинд ижил байх ёстой тул Python-ы round()/format()-ыг шууд ашиглахгүй.
import math
from datetime import UTC, datetime
from decimal import ROUND_HALF_UP, Decimal


def to_fixed(value: float, digits: int) -> str:
    """`Number.prototype.toFixed`: яг хоёртын утгаас, тэнцүү зайд байвал том модультай руу."""
    q = Decimal(value).quantize(Decimal(1).scaleb(-digits), rounding=ROUND_HALF_UP)
    return f"{q:f}"


def round_to(value: float, digits: int = 2) -> float:
    """`Number(v.toFixed(d))`"""
    return float(to_fixed(value, digits))


def js_round(value: float) -> int:
    """`Math.round`: .5 үед +∞ руу."""
    return math.floor(value + 0.5)


def to_precision(value: float, digits: int) -> str:
    """`Number.prototype.toPrecision` (эерэг, 1e-6-аас их утгад)."""
    if value == 0:
        return to_fixed(0, digits - 1)
    exp = math.floor(math.log10(abs(value)))
    if exp < -6 or exp >= digits:
        return f"{value:.{digits - 1}e}"
    return to_fixed(value, max(0, digits - 1 - exp))


def iso_z(dt: datetime) -> str:
    """`Date.prototype.toISOString`: «2026-10-21T05:07:00.000Z»"""
    u = dt.astimezone(UTC)
    return u.strftime("%Y-%m-%dT%H:%M:%S.") + f"{u.microsecond // 1000:03d}Z"


def parse_iso(s: str) -> datetime:
    """ISO 8601 мөр → UTC datetime (цагийн бүсгүй бол UTC гэж үзнэ)."""
    dt = datetime.fromisoformat(s.strip())
    return dt.replace(tzinfo=UTC) if dt.tzinfo is None else dt.astimezone(UTC)


def day_of(dt: datetime) -> str:
    """UTC өдөр «YYYY-MM-DD»"""
    return dt.astimezone(UTC).strftime("%Y-%m-%d")


def from_unix(seconds: float) -> datetime:
    return datetime.fromtimestamp(seconds, UTC)


def ms(dt: datetime) -> float:
    return dt.timestamp() * 1000
