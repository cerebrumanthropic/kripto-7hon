# Нийлэг (synthetic) feed-ээр шалгана — бодит мэдээний текстийг repo-д хадгалахгүй.
import json
from typing import Any

import pytest

from kripto_api.jsnum import parse_iso
from kripto_api.sources.rss import (
    FeedConfig,
    RawEntry,
    canonical_url,
    dedupe,
    is_crypto_title,
    jaccard,
    latest_news,
    merge_into_archives,
    news_id,
    parse_feed,
    title_tokens,
    to_news_items,
)

NOW = parse_iso("2026-10-21T05:07:00Z")

RSS2 = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel><title>Test</title>
<item>
  <title><![CDATA[SEC &amp; CFTC sign MoU on crypto oversight]]></title>
  <link>https://news.example/a?utm_source=rss&amp;id=7#top</link>
  <pubDate>Tue, 20 Oct 2026 10:00:00 +0000</pubDate>
  <description><![CDATA[<p>Long <b>body</b> that must never be stored</p>]]></description>
  <content:encoded><![CDATA[<div><div><div>full article</div></div></div>]]></content:encoded>
</item>
<item>
  <title>Bitcoin &#8217;s rally stalls at $70K</title>
  <link>http://news.example/b/</link>
  <pubDate>Mon, 19 Oct 2026 08:30:00 GMT</pubDate>
</item>
<item>
  <title>Old story</title>
  <link>https://news.example/old</link>
  <pubDate>Mon, 05 Oct 2026 08:30:00 GMT</pubDate>
</item>
<item>
  <title>Bad date</title>
  <link>https://news.example/bad</link>
  <pubDate>not a date</pubDate>
</item>
</channel></rss>"""

ATOM = """<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom test</title>
  <entry>
    <title type="html">Ethereum ETF inflows return</title>
    <link rel="alternate" href="https://atom.example/eth-etf"/>
    <link rel="self" href="https://atom.example/self"/>
    <published>2026-10-20T12:00:00Z</published>
    <summary>should be ignored</summary>
  </entry>
</feed>"""

RDF = """<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <item><title>Miners boost hashrate</title><link>https://rdf.example/1</link><dc:date>2026-10-20T01:00:00Z</dc:date></item>
</rdf:RDF>"""

FEED = FeedConfig("t", "Test News", "https://news.example/rss", "https://news.example")


class TestParseFeed:
    def test_rss2_cdata_entities_no_body(self) -> None:
        e = parse_feed(RSS2)
        assert len(e) == 4
        assert e[0].title == "SEC & CFTC sign MoU on crypto oversight"
        assert e[1].title == "Bitcoin ’s rally stalls at $70K"
        assert "body" not in json.dumps([x.__dict__ for x in e]) and "full article" not in str(e)

    def test_atom_alternate_link(self) -> None:
        assert parse_feed(ATOM) == [
            RawEntry("Ethereum ETF inflows return", "https://atom.example/eth-etf", "2026-10-20T12:00:00Z")
        ]

    def test_rdf_dc_date(self) -> None:
        e = parse_feed(RDF)[0]
        assert (e.title, e.date) == ("Miners boost hashrate", "2026-10-20T01:00:00Z")

    def test_rejects_html(self) -> None:
        with pytest.raises(ValueError, match="RSS биш"):
            parse_feed("<!DOCTYPE html><html><body>hi</body></html>")

    def test_no_external_entities(self) -> None:
        xxe = '<?xml version="1.0"?><!DOCTYPE r [<!ENTITY x SYSTEM "file:///etc/passwd">]><rss><channel><item><title>a&x;</title><link>https://e.example/1</link></item></channel></rss>'
        assert all("root:" not in e.title for e in parse_feed(xxe))


def test_canonical_url() -> None:
    assert canonical_url("https://News.Example/a?utm_source=rss&id=7#top") == "https://news.example/a?id=7"
    assert canonical_url("http://news.example/b/") == "https://news.example/b"
    assert canonical_url("https://news.example/") == "https://news.example/"
    assert canonical_url("javascript:alert(1)") is None
    assert canonical_url("not a url") is None


class TestToNewsItems:
    items = to_news_items(parse_feed(RSS2), FEED, NOW)

    def test_window_and_bad_dates(self) -> None:
        assert [i["url"] for i in self.items] == ["https://news.example/a?id=7", "https://news.example/b"]

    def test_id_and_fields(self) -> None:
        first = self.items[0]
        assert first["id"] == news_id("https://news.example/a?id=7") and len(first["id"]) == 12
        assert first["tags"] == ["regulation"]
        assert first["source"] == "Test News"
        assert first["publishedAt"] == "2026-10-20T10:00:00.000Z"

    def test_future_dropped(self) -> None:
        future = "<rss><channel><item><title>x</title><link>https://n.example/f</link><pubDate>Fri, 30 Oct 2026 00:00:00 GMT</pubDate></item></channel></rss>"
        assert to_news_items(parse_feed(future), FEED, NOW) == []

    def test_mongolian_feed_keyword_filter(self) -> None:
        mn = """<rss><channel>
          <item><title>Биткойны ханш огцом өслөө</title><link>https://mn.example/1</link><pubDate>Tue, 20 Oct 2026 01:00:00 +0800</pubDate></item>
          <item><title>Улаанбаатарт цас орно</title><link>https://mn.example/2</link><pubDate>Tue, 20 Oct 2026 02:00:00 +0800</pubDate></item>
        </channel></rss>"""
        r = to_news_items(parse_feed(mn), FeedConfig("t", "T", "https://x", "https://x", mongolian=True), NOW)
        assert len(r) == 1 and r[0]["isMongolia"]

    def test_sec_crypto_only(self) -> None:
        assert is_crypto_title("SEC Charges Promoters of Crypto Asset Scheme")
        assert not is_crypto_title("SEC Charges Investment Adviser with Fraud")
        assert is_crypto_title("Tokenization roundtable announced")


def item(id_: str, title: str, published_at: str, url: str | None = None) -> dict[str, Any]:
    return {
        "id": id_.ljust(12, "0")[:12],
        "title": title,
        "url": url or f"https://x.example/{id_}",
        "source": "X",
        "sourceUrl": "https://x.example",
        "publishedAt": published_at,
        "tags": ["market"],
        "isMongolia": False,
    }


class TestDedupe:
    def test_jaccard_or_same_url(self) -> None:
        assert jaccard(title_tokens("Bitcoin hits $70,000 today"), title_tokens("Bitcoin hits $70,000 today!")) == 1
        r = dedupe(
            [
                item("a", "Bitcoin ETF sees record inflows this week", "2026-10-20T10:00:00Z"),
                item("b", "Bitcoin ETF sees record inflows this week!", "2026-10-20T09:00:00Z"),
                item("c", "Totally different headline", "2026-10-20T08:00:00Z", "https://x.example/a"),
                item("d", "Ether options expiry looms", "2026-10-20T07:00:00Z"),
            ]
        )
        assert [i["id"][0] for i in r] == ["a", "d"]

    def test_similar_but_different_kept(self) -> None:
        r = dedupe(
            [
                item("a", "Bitcoin rises 5% as ETF inflows jump", "2026-10-20T10:00:00Z"),
                item("b", "Bitcoin falls 5% as ETF outflows jump", "2026-10-20T09:00:00Z"),
            ]
        )
        assert len(r) == 2


def empty(week: str) -> dict[str, Any]:
    return {"schemaVersion": 1, "week": week, "items": []}


class TestArchives:
    def test_bucketed_by_week_unloaded_skipped(self) -> None:
        nxt = merge_into_archives(
            {"2026-W43": empty("2026-W43"), "2026-W42": empty("2026-W42")},
            [
                item("a", "A news", "2026-10-20T10:00:00Z"),  # W43
                item("b", "B news", "2026-10-18T10:00:00Z"),  # W42 (Ням)
                item("c", "C news", "2026-10-05T10:00:00Z"),  # W41 — ачаалаагүй
            ],
        )
        assert [i["title"] for i in nxt["2026-W43"]["items"]] == ["A news"]
        assert [i["title"] for i in nxt["2026-W42"]["items"]] == ["B news"]
        assert "2026-W41" not in nxt

    def test_no_duplicates_first_version_kept_capped(self) -> None:
        start = {"2026-W43": {**empty("2026-W43"), "items": [item("a", "First title version", "2026-10-20T10:00:00Z")]}}
        nxt = merge_into_archives(
            start,
            [
                item("z", "Edited title", "2026-10-20T10:00:00Z", "https://x.example/a"),
                item("n", "New one", "2026-10-21T01:00:00Z"),
                item("m", "Another", "2026-10-21T02:00:00Z"),
            ],
            cap=2,
        )
        assert [i["title"] for i in nxt["2026-W43"]["items"]] == ["Another", "New one"]
        uncapped = merge_into_archives(start, [item("z", "Edited title", "2026-10-20T10:00:00Z", "https://x.example/a")])
        assert [i["title"] for i in uncapped["2026-W43"]["items"]] == ["First title version"]

    def test_latest_news(self) -> None:
        a = {
            **empty("2026-W43"),
            "items": [item("a", "Fresh", "2026-10-21T01:00:00Z"), item("b", "Week old", "2026-10-13T01:00:00Z")],
        }
        b = {**empty("2026-W42"), "items": [item("c", "Mid", "2026-10-17T01:00:00Z")]}
        assert [i["title"] for i in latest_news([a, b], NOW)] == ["Fresh", "Mid"]
        assert len(latest_news([a, b], NOW, 1)) == 1
