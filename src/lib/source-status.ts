// Эх сурвалжийн төлөвийг UI-д («хоцорсон» тэмдэг) бэлтгэнэ.
import type { SourceStatus } from '@/types/schemas';

import { t } from './i18n-mn';

export function sourceName(id: string): string {
  return t.sourceNames[id] ?? id;
}

/** Өмнөх утгаараа харагдаж буй эх сурвалжууд (stale:true). Нэр давхардвал нэг удаа. */
export function staleSources(sources: SourceStatus[]): Array<{ id: string; name: string; fetchedAt: string }> {
  const seen = new Set<string>();
  const out: Array<{ id: string; name: string; fetchedAt: string }> = [];
  for (const s of sources) {
    if (!s.stale) continue;
    const name = sourceName(s.id);
    if (seen.has(name)) continue;
    seen.add(name);
    out.push({ id: s.id, name, fetchedAt: s.fetchedAt });
  }
  return out;
}
