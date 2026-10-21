// content/reports/<week>.md загвар (SPEC §6.1). build-weekly нь .md-г ЗӨВХӨН байхгүй үед үүсгэнэ
// (CLAUDE.md дүрэм 6 — редакторын текстийг хэзээ ч дарж бичихгүй).
import type { WeeklyAuto } from '../../src/types/schemas';

/** YAML-ийн давхар хашилттай мөр (JSON мөр нь YAML-д хүчинтэй). */
const q = (s: string) => JSON.stringify(s);

export function reportMarkdown(auto: WeeklyAuto, opts: { autoPublish?: boolean } = {}): string {
  const s = auto.suggestedSentences;
  const publish = Boolean(opts.autoPublish);
  const headline = publish ? (s[0] ?? '') : '';
  const summary = publish ? s.slice(1, 3).join(' ') : '';
  const takeaways = publish ? s.slice(1, 4) : ['', '', ''];

  return `---
week: ${auto.week}
status: ${publish ? 'published' : 'draft'}            # draft | published — зөвхөн published нь сайтад гарна
headline: ${q(headline)}             # ≤120 тэмдэгт. Томьёо: тоо + чиглэл + шалтгаан
summary: ${q(summary)}              # 1–2 өгүүлбэр (OG description, нүүр хуудасны карт)
takeaways:               # яг 3, тоо агуулсан
${takeaways.map((t) => `  - ${q(t)}`).join('\n')}
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
${s.map((x) => `- ${x}`).join('\n')}

Сонгох боломжтой мэдээ (news_picks-д URL-ийг нь хуул):
${auto.newsCandidates.map((n) => `- [${n.tags.join(', ')}] ${n.title.replace(/--/g, '—')} — ${n.url}`).join('\n')}
-->
`;
}
