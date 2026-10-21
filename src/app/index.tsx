import { useLoaderData } from 'expo-router';
import { View } from 'react-native';

import { NewsRow, ReportCard } from '@/components/cards/cards';
import { KpiGrid } from '@/components/cards/kpi-grid';
import { LoadError } from '@/components/layout/live-status';
import { Page } from '@/components/layout/page';
import { Card, InLink, SectionHeader, T } from '@/components/ui/primitives';
import { useNews } from '@/lib/data-client';
import { t } from '@/lib/i18n-mn';
import { pageMeta } from '@/lib/meta';
import { space } from '@/theme/tokens';
import { useLayout } from '@/theme/use-theme';

export async function loader() {
  const { readResearch, readReportIndex, readReport } = await import('@/lib/server/content');
  const research = await readResearch();
  const [latest] = await readReportIndex();
  const report = latest ? await readReport(latest.week) : null;
  return {
    // PROGRESS D8
    examples: research.internationalExamples.length,
    dataSources: research.dataSources.length,
    latest: latest ?? null,
    takeaways: report?.editorial.takeaways ?? [],
  };
}

export function generateMetadata() {
  return pageMeta(t.site.name, t.site.tagline, '/');
}

function LatestNews() {
  const { data, isError } = useNews();
  if (isError) return <LoadError />;
  const items = data?.data.items.slice(0, 8) ?? [];
  return (
    <View role="list">
      {items.map((item) => (
        <NewsRow key={item.id} item={item} />
      ))}
    </View>
  );
}

export default function Home() {
  const d = useLoaderData<typeof loader>();
  const { isDesktop } = useLayout();

  return (
    <Page title={t.home.heroTitle} lead={t.home.heroLead}>
      <View style={{ gap: space.md }}>
        <SectionHeader title={t.home.kpiTitle} />
        <KpiGrid />
      </View>

      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: space.xl, alignItems: 'flex-start' }}>
        <View style={{ flex: isDesktop ? 5 : undefined, width: isDesktop ? undefined : '100%', gap: space.md }}>
          <SectionHeader title={t.home.latestReport} />
          {d.latest ? (
            <>
              <ReportCard entry={d.latest} takeaways={d.takeaways} />
              <InLink href={`/tailan/${d.latest.week}`} v="bodyStrong">
                {t.home.readReport}
              </InLink>
            </>
          ) : (
            <T color="textMuted">{t.home.noReport}</T>
          )}

          <View style={{ marginTop: space.lg, gap: space.md }}>
            <SectionHeader title={t.home.researchTitle} />
            <Card tone="surfaceAlt" style={{ gap: space.sm }}>
              <T>{t.home.researchTeaser(d.examples, d.dataSources)}</T>
              <InLink href="/sudalgaa" v="bodyStrong">
                {t.home.researchLink}
              </InLink>
            </Card>
          </View>
        </View>

        <View style={{ flex: isDesktop ? 7 : undefined, width: isDesktop ? undefined : '100%', gap: space.sm }}>
          <SectionHeader title={t.home.latestNews} right={<InLink href="/medee" v="smallStrong">{t.home.allNews}</InLink>} />
          <LatestNews />
        </View>
      </View>
    </Page>
  );
}
