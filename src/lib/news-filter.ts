// Мэдээний шүүлтүүр (SPEC §8.3) — цэвэр функц, тесттэй.
import type { NewsItem, NewsTag } from '@/types/schemas';

export type NewsFilter = {
  tags: NewsTag[]; // хоосон = бүгд
  source: string | null;
  mongoliaOnly: boolean;
  query: string;
};

export const EMPTY_FILTER: NewsFilter = { tags: [], source: null, mongoliaOnly: false, query: '' };

export function filterNews(items: NewsItem[], f: NewsFilter): NewsItem[] {
  const q = f.query.trim().toLowerCase();
  return items.filter(
    (i) =>
      (f.tags.length === 0 || i.tags.some((t) => f.tags.includes(t))) &&
      (!f.source || i.source === f.source) &&
      (!f.mongoliaOnly || i.isMongolia) &&
      (!q || i.title.toLowerCase().includes(q)),
  );
}

export function toggleTag(tags: NewsTag[], tag: NewsTag): NewsTag[] {
  return tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
}
