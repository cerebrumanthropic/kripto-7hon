# content/reports/<week>.md загвар (SPEC §6.1). build-weekly нь .md-г ЗӨВХӨН байхгүй үед үүсгэнэ
# (CLAUDE.md дүрэм 6 — редакторын текстийг хэзээ ч дарж бичихгүй).
import json
from typing import Any


def _q(s: str) -> str:
    """YAML-ийн давхар хашилттай мөр (JSON мөр нь YAML-д хүчинтэй)."""
    return json.dumps(s, ensure_ascii=False)


def report_markdown(auto: dict[str, Any], auto_publish: bool = False) -> str:
    s: list[str] = auto["suggestedSentences"]
    headline = (s[0] if s else "") if auto_publish else ""
    summary = " ".join(s[1:3]) if auto_publish else ""
    takeaways = s[1:4] if auto_publish else ["", "", ""]
    takeaway_lines = "\n".join(f"  - {_q(t)}" for t in takeaways)
    suggestions = "\n".join(f"- {x}" for x in s)
    candidates = "\n".join(
        f"- [{', '.join(n['tags'])}] {n['title'].replace('--', '—')} — {n['url']}" for n in auto["newsCandidates"]
    )

    return f"""---
week: {auto["week"]}
status: {"published" if auto_publish else "draft"}            # draft | published — зөвхөн published нь сайтад гарна
headline: {_q(headline)}             # ≤120 тэмдэгт. Томьёо: тоо + чиглэл + шалтгаан
summary: {_q(summary)}              # 1–2 өгүүлбэр (OG description, нүүр хуудасны карт)
takeaways:               # яг 3, тоо агуулсан
{takeaway_lines}
etf:
  btc_net_flow_usd: null # 7 хоногийн цэвэр урсгал, жишээ нь -1470000000
  eth_net_flow_usd: null
  source_name: "Farside Investors"
  source_url: "https://farside.co.uk"
coinshares:
  weekly_flow_usd: null
  url: ""
mongolbank_usd_mnt: null # Монголбанкны албан ханш (заавал биш)
news_picks: []           # newsCandidates-аас сонгосон 3–5 URL
mongolia: []             # - text: "..."  url: "https://..."
regulation: []           # - text: "..."  url: "https://..."
calendar: []             # - date: "2026-10-28"  event: "FOMC хүүгийн шийдвэр"
author: ""
corrections: []          # - date: "2026-10-27"  text: "..."
---

<!-- Редакторын чөлөөт тайлбар (заавал биш). Зөвхөн догол мөр, «- » жагсаалт, «### » дэд гарчиг. -->

<!-- auto-suggestions (сайтад харагдахгүй — хуулж ашиглаж болно)
{suggestions}

Сонгох боломжтой мэдээ (news_picks-д URL-ийг нь хуул):
{candidates}
-->
"""
