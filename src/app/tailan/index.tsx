import { useLoaderData } from 'expo-router';
import { View } from 'react-native';

import { ReportCard } from '@/components/cards/cards';
import { Page } from '@/components/layout/page';
import { T } from '@/components/ui/primitives';
import { t } from '@/lib/i18n-mn';
import { pageMeta } from '@/lib/meta';
import { space } from '@/theme/tokens';

export async function loader() {
  const { readReportIndex } = await import('@/lib/server/content');
  return { reports: await readReportIndex() };
}

export function generateMetadata() {
  return pageMeta(t.reports.title, t.reports.lead, '/tailan');
}

export default function ReportArchive() {
  const { reports } = useLoaderData<typeof loader>();
  return (
    <Page title={t.reports.title} lead={t.reports.lead}>
      {reports.length === 0 ? (
        <T color="textMuted">{t.reports.empty}</T>
      ) : (
        <View style={{ gap: space.md, maxWidth: 820 }} role="list">
          {reports.map((r) => (
            <View key={r.week} role="listitem">
              <ReportCard entry={r} />
            </View>
          ))}
        </View>
      )}
    </Page>
  );
}
