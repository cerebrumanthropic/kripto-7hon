import { useLoaderData } from 'expo-router';
import { View } from 'react-native';

import { NewsRow, ReportCard } from '@/components/cards/cards';
import { KpiGrid } from '@/components/cards/kpi-grid';
import { LoadError } from '@/components/layout/live-status';
import { Page } from '@/components/layout/page';
import { ButtonLink, Card, InLink, SectionHeader, T } from '@/components/ui/primitives';
import { useNews } from '@/lib/data-client';
import { t } from '@/lib/i18n-mn';
import { pageMeta } from '@/lib/meta';
import type { NewsFeed } from '@/types/schemas';
import { fonts, space } from '@/theme/tokens';
import { useLayout, useTheme } from '@/theme/use-theme';

export async function loader() {
  const { readResearch, readReportIndex, readReport, readFallback } = await import('@/lib/server/content');
  const research = await readResearch();
  const [latest] = await readReportIndex();
  const report = latest ? await readReport(latest.week) : null;
  const news = await readFallback('news');
  return {
    // PROGRESS D8
    examples: research.internationalExamples.length,
    dataSources: research.dataSources.length,
    latest: latest ?? null,
    takeaways: report?.editorial.takeaways ?? [],
    // Build үеийн snapshot — амьд дата ирэх хүртэл placeholder (CLS)
    market: await readFallback('market'),
    news: news ? { ...news, items: news.items.slice(0, 8) } : null,
  };
}

export function generateMetadata() {
  return pageMeta(t.site.name, t.site.tagline, '/');
}

function LatestNews({ snapshot }: { snapshot: NewsFeed | null }) {
  const { data, isError } = useNews(snapshot);
  if (isError) return <LoadError />;
  const items = data?.data.items.slice(0, 8) ?? [];
  return (
    <Card style={{ paddingVertical: space.xs }}>
      <View role="list">
        {items.map((item) => (
          <NewsRow key={item.id} item={item} />
        ))}
      </View>
    </Card>
  );
}

function NoReport() {
  const { c } = useTheme();
  return (
    <Card style={{ gap: space.sm, borderStyle: 'dashed', borderColor: c.borderStrong }}>
      <T v="label" color="accent">
        {t.home.noReportKicker}
      </T>
      <T v="h3">{t.home.noReport}</T>
      <T v="small" color="textMuted">
        {t.home.noReportHint}
      </T>
      <InLink href="/arga-zui" v="smallStrong">
        {t.home.methodLink}
      </InLink>
    </Card>
  );
}

function ResearchTeaser({ examples, dataSources }: { examples: number; dataSources: number }) {
  const { c } = useTheme();
  const stats: Array<[number, string]> = [
    [examples, t.home.researchStats.examples],
    [dataSources, t.home.researchStats.sources],
  ];
  return (
    <Card style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xxl }}>
        {stats.map(([n, label]) => (
          <View key={label}>
            <T num style={{ fontFamily: fonts.displayBold, fontSize: 44, lineHeight: 50, letterSpacing: -0.5, color: c.brandText }}>
              {n}
            </T>
            <T v="small" color="textMuted">
              {label}
            </T>
          </View>
        ))}
      </View>
      <T>{t.home.researchMore}</T>
      <InLink href="/sudalgaa" v="bodyStrong">
        {t.home.researchLink}
      </InLink>
    </Card>
  );
}

export default function Home() {
  const d = useLoaderData<typeof loader>();
  const { isDesktop } = useLayout();

  return (
    <Page
      size="hero"
      title={t.home.heroTitle}
      titleAccent={t.home.heroTitleAccent}
      lead={t.home.heroLead}
      meta={
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: space.sm }}>
          <ButtonLink href="/tailan" label={t.home.ctaReports} primary />
          <ButtonLink href="/zah-zeel" label={t.home.ctaMarket} />
        </View>
      }
      band={<KpiGrid snapshot={d.market} />}>
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: space.xxl, alignItems: 'flex-start' }}>
        <View style={{ flex: isDesktop ? 5 : undefined, width: isDesktop ? undefined : '100%', gap: space.xxl }}>
          <View>
            <SectionHeader title={t.home.latestReport} />
            {d.latest ? (
              <View style={{ gap: space.md }}>
                <ReportCard entry={d.latest} takeaways={d.takeaways} />
                <InLink href={`/tailan/${d.latest.week}`} v="bodyStrong">
                  {t.home.readReport}
                </InLink>
              </View>
            ) : (
              <NoReport />
            )}
          </View>

          <View>
            <SectionHeader title={t.home.researchTitle} />
            <ResearchTeaser examples={d.examples} dataSources={d.dataSources} />
          </View>
        </View>

        <View style={{ flex: isDesktop ? 7 : undefined, width: isDesktop ? undefined : '100%' }}>
          <SectionHeader title={t.home.latestNews} right={<InLink href="/medee" v="smallStrong">{t.home.allNews}</InLink>} />
          <LatestNews snapshot={d.news} />
        </View>
      </View>
    </Page>
  );
}
