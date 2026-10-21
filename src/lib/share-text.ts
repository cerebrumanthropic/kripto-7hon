// «Текст хуулах» — Facebook/Telegram-д наах цэвэр текст (SPEC §8.5.2).
import type { MergedReport } from '@/types/schemas';

import { formatDay, weekLabel } from './dates';
import { arrow, groupDigits, mnt } from './format';
import { t } from './i18n-mn';
import { byNumbers } from './report-view';

export function buildShareText(r: MergedReport, siteUrl: string): string {
  const e = r.editorial;
  const a = r.auto;
  const s = t.share;
  const lines: string[] = [];

  lines.push(`${t.site.name} — ${weekLabel(a.week)}`, '', e.headline, '');
  lines.push(`${t.reports.takeaways}:`, ...e.takeaways.map((x) => `• ${x}`), '');

  lines.push(`${t.reports.byNumbers}:`);
  for (const row of byNumbers(a, t.reports.rows)) {
    lines.push(`• ${row.label}: ${row.now} (${arrow(row.change)} ${row.changeText})`);
  }
  lines.push('');

  const btc = a.majors.find((m) => m.symbol === 'BTC');
  const mn: string[] = [];
  if (btc?.priceMnt) mn.push(`${t.reports.btcMnt}: ${mnt(btc.priceMnt)}`);
  if (a.fx) mn.push(`${s.refRate}: ${groupDigits(a.fx.usdMnt, 2)} ₮`);
  if (mn.length || e.mongolia.length) {
    lines.push(`${t.reports.mongolia}:`);
    if (mn.length) lines.push(`• ${mn.join(' · ')}`);
    for (const m of e.mongolia) lines.push(`• ${m.text} ${m.url}`);
    lines.push('');
  }

  if (e.calendar.length) {
    lines.push(`${t.reports.calendar}:`, ...e.calendar.map((c) => `• ${formatDay(c.date).slice(5)} — ${c.event}`), '');
  }

  lines.push(`${t.common.sourceLabel}: ${s.sources}`);
  lines.push(s.disclaimer);
  lines.push(`${s.more}: ${siteUrl}/tailan/${a.week}`);
  return lines.join('\n');
}
