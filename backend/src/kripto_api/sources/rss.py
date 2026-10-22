# RSS/Atom мэдээ (SPEC §5.5). Зөвхөн гарчиг, эх сурвалж, огноо, холбоос хадгална —
# description, зураг, бүрэн текстийг хэзээ ч хадгалахгүй (зохиогчийн эрх).
import hashlib
import html
import os
import re
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from email.utils import parsedate_to_datetime
from typing import Any
from urllib.parse import parse_qsl, quote, urlencode, urlsplit, urlunsplit

from lxml import etree

from kripto_api.classify import classify, is_mongolia
from kripto_api.dates import iso_week
from kripto_api.http import HttpOptions, get_bytes
from kripto_api.jsnum import iso_z, parse_iso


@dataclass(frozen=True)
class FeedConfig:
    id: str
    name: str
    url: str
    source_url: str
    mongolian: bool = False  # Монгол эх сурвалж → isMongolia, түлхүүр үгээр шүүнэ
    needs_contact: bool = False  # SEC: холбоо барих имэйлтэй User-Agent шаардана
    crypto_only: bool = False  # Ерөнхий сэдэвтэй feed (SEC) → зөвхөн крипто түлхүүр үгтэй гарчиг


@dataclass(frozen=True)
class RawEntry:
    title: str
    link: str
    date: str


# Гадны XML: entity задлахгүй, сүлжээнд хандахгүй (XXE), эвдэрхий feed-ийг аль болох уншина.
_PARSER = etree.XMLParser(resolve_entities=False, no_network=True, recover=True, huge_tree=False)


def _local(tag: Any) -> str:
    return etree.QName(tag).localname if isinstance(tag, str) else ""


def _child(el: etree._Element, *names: str) -> etree._Element | None:
    for name in names:
        for c in el:
            if _local(c.tag) == name:
                return c
    return None


def _text(el: etree._Element | None) -> str:
    return "".join(str(t) for t in el.itertext()).strip() if el is not None else ""


def _decode(s: str) -> str:
    s = re.sub(r"<[^>]*>", " ", s)
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def _atom_link(entry: etree._Element) -> str:
    links = [c for c in entry if _local(c.tag) == "link"]
    for link in links:
        if link.get("rel") in (None, "alternate") and link.get("href"):
            return link.get("href") or ""
    return _text(links[0]) if links else ""


def parse_feed(xml: str | bytes) -> list[RawEntry]:
    """RSS 2.0, RSS 1.0 (RDF) ба Atom-ийг дэмжинэ. Зөвхөн гарчиг/холбоос/огноо."""
    data = xml.encode() if isinstance(xml, str) else xml
    if re.match(rb"^\s*(<!doctype html|<html)", data, re.I):
        raise ValueError("RSS биш (HTML хуудас буцаав)")
    root = etree.fromstring(data, _PARSER)
    if root is None:
        return []
    out: list[RawEntry] = []
    for el in root.iter():
        name = _local(el.tag)
        if name == "item":
            link = _text(_child(el, "link")) or _text(_child(el, "guid"))
            date = _text(_child(el, "pubDate", "date", "published"))
        elif name == "entry":
            link = _atom_link(el)
            date = _text(_child(el, "published", "updated"))
        else:
            continue
        title = _decode(_text(_child(el, "title")))
        if title and link:
            out.append(RawEntry(title, link, date))
    return out


_TRACKING = re.compile(r"^(utm_|mc_|fbclid$|gclid$|ref$|ref_src$|cmpid$|guccounter$)", re.I)
# WHATWG URL-ийн percent-encode багц (path / special-query) — `new URL()`-тай ижил canonical хэлбэр гаргах
_PATH_SAFE = "".join(chr(c) for c in range(0x21, 0x7F) if chr(c) not in ' "#<>?`{}')
_QUERY_SAFE = "".join(chr(c) for c in range(0x21, 0x7F) if chr(c) not in " \"#<>'")


def canonical_url(raw: str) -> str | None:
    """utm_* г.м. хасах, hash хасах, host жижиг үсэг, http→https, төгсгөлийн «/» хасах."""
    try:
        u = urlsplit(raw.strip())
        port = u.port
    except ValueError:
        return None
    if u.scheme.lower() not in ("http", "https") or not u.hostname:
        return None
    host = u.hostname.encode("idna").decode("ascii") if not u.hostname.isascii() else u.hostname
    if port and not (port == 443 or (port == 80 and u.scheme.lower() == "http")):
        host = f"{host}:{port}"
    pairs = parse_qsl(u.query, keep_blank_values=True)
    kept = [(k, v) for k, v in pairs if not _TRACKING.match(k)]
    # JS: searchParams.delete() дуудагдсан үед л query-г дахин кодолно
    query = urlencode(kept) if len(kept) != len(pairs) else quote(u.query, safe=_QUERY_SAFE)
    path = quote(u.path or "/", safe=_PATH_SAFE)
    s = urlunsplit(("https", host, path, query, ""))
    if len(path) > 1 and s.endswith("/") and not query:
        s = s[:-1]
    return s


def news_id(canonical: str) -> str:
    return hashlib.sha1(canonical.encode()).hexdigest()[:12]


def title_tokens(title: str) -> set[str]:
    # JS: /[^\p{L}\p{N}\s]/gu — Python-ы \w нь «_»-ийг оруулдаг тул тусад нь хасна
    return set(re.sub(r"[^\w\s]|_", " ", title.lower()).split())


def jaccard(a: set[str], b: set[str]) -> float:
    if not a and not b:
        return 1
    inter = len(a & b)
    return inter / (len(a) + len(b) - inter)


def dedupe(items: list[dict[str, Any]], threshold: float = 0.8) -> list[dict[str, Any]]:
    """Canonical URL ижил, эсвэл гарчгийн үгийн Jaccard ≥ 0.8 бол давхардал. Эхэнд байгаа нь үлдэнэ."""
    kept: list[tuple[dict[str, Any], set[str]]] = []
    urls: set[str] = set()
    for item in items:
        if item["url"] in urls:
            continue
        tokens = title_tokens(item["title"])
        if any(jaccard(t, tokens) >= threshold for _, t in kept):
            continue
        urls.add(item["url"])
        kept.append((item, tokens))
    return [i for i, _ in kept]


MN_KEYWORDS = ["крипто", "виртуал хөрөнгө", "биткойн", "биткоин", "блокчэйн", "блокчейн", "сзх", "вхүү", "bitcoin", "crypto"]


def is_mongolian_crypto_title(title: str) -> bool:
    t = title.lower()
    return any(k in t for k in MN_KEYWORDS)


_CRYPTO_RE = re.compile(
    r"\b(crypto\w*|digital asset\w*|bitcoin|ether(eum)?|blockchain|stablecoin\w*|token\w*|virtual asset\w*|defi|nft\w*|web3)\b",
    re.I | re.A,
)


def is_crypto_title(title: str) -> bool:
    return bool(_CRYPTO_RE.search(title))


def parse_date(s: str) -> datetime | None:
    """`Date.parse`-ийн RSS-д хэрэгтэй хэсэг: RFC 2822 ба ISO 8601. Буруу бол None."""
    s = s.strip()
    if not s:
        return None
    try:
        dt = parsedate_to_datetime(s)
        return dt.replace(tzinfo=UTC) if dt.tzinfo is None else dt.astimezone(UTC)
    except (TypeError, ValueError, IndexError):
        pass
    try:
        return parse_iso(s)
    except ValueError:
        return None


def to_news_items(entries: list[RawEntry], feed: FeedConfig, now: datetime, window_days: int = 7) -> list[dict[str, Any]]:
    """Feed-ийн мөрүүдийг NewsItem болгоно: 7 хоногийн цонх, ирээдүйн огноог хасна."""
    out: list[dict[str, Any]] = []
    for e in entries:
        url = canonical_url(e.link)
        t = parse_date(e.date)
        if not url or t is None:
            continue
        if t > now + timedelta(hours=1) or t < now - timedelta(days=window_days):
            continue
        if feed.mongolian and not is_mongolian_crypto_title(e.title):
            continue
        if feed.crypto_only and not is_crypto_title(e.title):
            continue
        out.append(
            {
                "id": news_id(url),
                "title": e.title[:300],
                "url": url,
                "source": feed.name,
                "sourceUrl": feed.source_url,
                "publishedAt": iso_z(t),
                "tags": classify(e.title),
                "isMongolia": is_mongolia(e.title, feed.mongolian),
            }
        )
    return out


async def fetch_feed(feed: FeedConfig, now: datetime, http: HttpOptions | None = None) -> list[dict[str, Any]]:
    if feed.needs_contact and not os.environ.get("CONTACT_EMAIL"):
        raise RuntimeError("CONTACT_EMAIL тохируулаагүй (SEC шаардана)")
    entries = parse_feed(await get_bytes(feed.url, http))
    if not entries:
        raise ValueError("feed хоосон эсвэл танигдаагүй формат")
    return to_news_items(entries, feed, now)


def _by_newest(items: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(items, key=lambda i: i["publishedAt"], reverse=True)


def merge_into_archives(
    archives: dict[str, dict[str, Any]], items: list[dict[str, Any]], cap: int = 500
) -> dict[str, dict[str, Any]]:
    """Шинэ мэдээг долоо хоногийн архивт (publishedAt-ийн ISO долоо хоног, UTC) хуваарилж нэгтгэнэ."""
    nxt = dict(archives)
    buckets: dict[str, list[dict[str, Any]]] = {}
    for it in items:
        w = iso_week(it["publishedAt"])
        if w in nxt:  # зөвхөн ачаалсан (одоогийн/өмнөх) долоо хоногууд
            buckets.setdefault(w, []).append(it)
    for w, fresh in buckets.items():
        # Хуучин нь эхэнд → анх бүртгэгдсэн хувилбар үлдэнэ
        merged = _by_newest(dedupe([*nxt[w]["items"], *_by_newest(fresh)]))[:cap]
        nxt[w] = {"schemaVersion": 1, "week": w, "items": merged}
    return nxt


def latest_news(archives: Iterable[dict[str, Any]], now: datetime, limit: int = 60) -> list[dict[str, Any]]:
    """Амьд news.json: сүүлийн 7 хоногийн хамгийн шинэ `limit` мэдээ (SPEC §5.5)."""
    frm = now - timedelta(days=7)
    recent = [i for a in archives for i in a["items"] if parse_iso(i["publishedAt"]) >= frm]
    return dedupe(_by_newest(recent))[:limit]
