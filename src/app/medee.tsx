import { useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';

import { NewsRow } from '@/components/cards/cards';
import { LiveStatus, LoadError } from '@/components/layout/live-status';
import { Page } from '@/components/layout/page';
import { Card, Chip, T } from '@/components/ui/primitives';
import { useNews } from '@/lib/data-client';
import { t } from '@/lib/i18n-mn';
import { pageMeta } from '@/lib/meta';
import { EMPTY_FILTER, filterNews, toggleTag, type NewsFilter } from '@/lib/news-filter';
import { NEWS_TAGS } from '@/types/schemas';
import { fonts, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export function generateMetadata() {
  return pageMeta(t.news.title, t.news.lead, '/medee');
}

export default function News() {
  const { data, isError } = useNews();
  const { c } = useTheme();
  const [f, setF] = useState<NewsFilter>(EMPTY_FILTER);
  const items = data?.data.items ?? [];
  const sources = useMemo(() => [...new Set(items.map((i) => i.source))].sort(), [items]);
  const shown = useMemo(() => filterNews(items, f), [items, f]);

  return (
    <Page
      title={t.news.title}
      lead={t.news.lead}
      meta={<LiveStatus updatedAt={data?.data.updatedAt} origin={data?.origin} sources={data?.data.sources} />}>
      <Card tone="surfaceAlt">
        <T v="small">{t.news.notice}</T>
      </Card>

      <View style={{ gap: space.md }} role="group" aria-label={t.news.search}>
        <TextInput
          value={f.query}
          onChangeText={(query) => setF((s) => ({ ...s, query }))}
          placeholder={t.news.search}
          aria-label={t.news.search}
          placeholderTextColor={c.textMuted}
          style={{
            fontFamily: fonts.regular,
            fontSize: 16,
            color: c.text,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.borderStrong,
            borderRadius: radius.md,
            paddingHorizontal: space.md,
            paddingVertical: space.sm,
            maxWidth: 480,
          }}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }} aria-label={t.news.title}>
          <Chip label={t.news.all} selected={f.tags.length === 0} onPress={() => setF((s) => ({ ...s, tags: [] }))} />
          {NEWS_TAGS.map((tag) => (
            <Chip
              key={tag}
              label={t.tags[tag]}
              selected={f.tags.includes(tag)}
              onPress={() => setF((s) => ({ ...s, tags: toggleTag(s.tags, tag) }))}
            />
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' }}>
          <T v="label" color="textMuted">
            {t.news.source}
          </T>
          <Chip label={t.news.allSources} selected={!f.source} onPress={() => setF((s) => ({ ...s, source: null }))} />
          {sources.map((src) => (
            <Chip
              key={src}
              label={src}
              selected={f.source === src}
              onPress={() => setF((s) => ({ ...s, source: s.source === src ? null : src }))}
            />
          ))}
          <Chip
            label={t.news.mongoliaOnly}
            selected={f.mongoliaOnly}
            onPress={() => setF((s) => ({ ...s, mongoliaOnly: !s.mongoliaOnly }))}
          />
        </View>
      </View>

      <View>
        {isError ? <LoadError /> : null}
        <T v="small" color="textMuted" aria-live="polite">
          {t.news.count(shown.length)}
        </T>
        <View role="list">
          {shown.map((item) => (
            <NewsRow key={item.id} item={item} />
          ))}
        </View>
        {data && shown.length === 0 ? (
          <T color="textMuted" style={{ marginTop: space.md }}>
            {t.news.empty}
          </T>
        ) : null}
      </View>
    </Page>
  );
}
