import { useLoaderData } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { NewsRow } from '@/components/cards/cards';
import { LiveStatus, LoadError } from '@/components/layout/live-status';
import { Page } from '@/components/layout/page';
import { Card, Chip, T } from '@/components/ui/primitives';
import { useNews } from '@/lib/data-client';
import { t } from '@/lib/i18n-mn';
import { pageMeta } from '@/lib/meta';
import { splitBySentiment, type Sentiment } from '@/lib/sentiment';
import { EMPTY_FILTER, filterNews, toggleTag, type NewsFilter } from '@/lib/news-filter';
import { NEWS_TAGS, type NewsItem } from '@/types/schemas';
import { fonts, radius, space } from '@/theme/tokens';
import { useLayout, useTheme } from '@/theme/use-theme';

export function generateMetadata() {
  return pageMeta(t.news.title, t.news.lead, '/medee');
}

/** Build үеийн snapshot — амьд дата ирэх хүртэл placeholder (CLS) */
export async function loader() {
  const { readFallback } = await import('@/lib/server/content');
  return { news: await readFallback('news') };
}

export default function News() {
  const snap = useLoaderData<typeof loader>();
  const { data, isError, isPlaceholderData } = useNews(snap.news);
  const { c } = useTheme();
  const [f, setF] = useState<NewsFilter>(EMPTY_FILTER);
  const items = data?.data.items ?? [];
  const sources = useMemo(() => [...new Set(items.map((i) => i.source))].sort(), [items]);
  const shown = useMemo(() => filterNews(items, f), [items, f]);
  // Эерэг / сөрөг / төвийг сахисан (гарчгийн түлхүүр үгээр, PROGRESS D74)
  const groups = useMemo(() => splitBySentiment(shown), [shown]);
  const [showNeutral, setShowNeutral] = useState(false);
  const { isDesktop } = useLayout();

  return (
    <Page
      title={t.news.title}
      lead={t.news.lead}
      meta={
        <LiveStatus updatedAt={data?.data.updatedAt} origin={data?.origin} sources={data?.data.sources} pending={isPlaceholderData} />
      }>
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
        <T v="caption" color="textMuted" style={{ marginTop: 2 }}>
          {t.news.sentimentNote}
        </T>
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: space.xl, marginTop: space.lg, alignItems: 'flex-start' }}>
          <SentimentColumn kind="positive" items={groups.positive} />
          <SentimentColumn kind="negative" items={groups.negative} />
        </View>
        {groups.neutral.length > 0 ? (
          <View style={{ marginTop: space.xl }}>
            <Pressable
              role="button"
              aria-expanded={showNeutral}
              onPress={() => setShowNeutral((v) => !v)}
              style={{
                alignSelf: 'flex-start',
                borderWidth: 1,
                borderColor: c.borderStrong,
                borderRadius: radius.md,
                paddingVertical: space.sm,
                paddingHorizontal: space.md,
              }}>
              <T v="smallStrong">{showNeutral ? t.news.hideNeutral : t.news.showNeutral(groups.neutral.length)}</T>
            </Pressable>
            {showNeutral ? <SentimentColumn kind="neutral" items={groups.neutral} /> : null}
          </View>
        ) : null}
        {data && shown.length === 0 ? (
          <T color="textMuted" style={{ marginTop: space.md }}>
            {t.news.empty}
          </T>
        ) : null}
      </View>
    </Page>
  );
}

const SENTIMENT_META: Record<Sentiment, { title: string; mark: string; tone: 'positiveText' | 'negativeText' | 'textMuted' }> = {
  positive: { title: t.news.positive, mark: '▲', tone: 'positiveText' },
  negative: { title: t.news.negative, mark: '▼', tone: 'negativeText' },
  neutral: { title: t.news.neutral, mark: '●', tone: 'textMuted' },
};

/** Нэг өнгө аясын багана: өнгөт толгой (тэмдэг + нэр + тоо) ба мэдээний жагсаалт. */
function SentimentColumn({ kind, items }: { kind: Sentiment; items: NewsItem[] }) {
  const { c } = useTheme();
  const m = SENTIMENT_META[kind];
  return (
    <View style={{ flex: 1, width: '100%', minWidth: 0, marginTop: kind === 'neutral' ? space.lg : 0 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          paddingBottom: space.sm,
          borderBottomWidth: 3,
          borderBottomColor: c[m.tone],
        }}>
        <T v="h3" color={m.tone} role="heading" aria-level={2}>
          {`${m.mark} ${m.title}`}
        </T>
        <T v="smallStrong" color="textMuted">
          {t.news.count(items.length)}
        </T>
      </View>
      <View role="list">
        {items.map((item) => (
          <NewsRow key={item.id} item={item} />
        ))}
      </View>
      {items.length === 0 ? (
        <T v="small" color="textMuted" style={{ marginTop: space.md }}>
          {t.news.noneInGroup}
        </T>
      ) : null}
    </View>
  );
}
