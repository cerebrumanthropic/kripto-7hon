import { useLoaderData } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Page } from '@/components/layout/page';
import { SOURCES } from '@/components/ui/attribution';
import { Card, ExtLink, SectionHeader, T } from '@/components/ui/primitives';
import { t } from '@/lib/i18n-mn';
import { pageMeta } from '@/lib/meta';
import { space } from '@/theme/tokens';
import { useLayout, useTheme } from '@/theme/use-theme';

export async function loader() {
  const { readResearch } = await import('@/lib/server/content');
  const d = await readResearch();
  return {
    schedule: d.productionSchedule, // PROGRESS D6
    sources: d.dataSources.filter((s) => s.usedByPlatform).map(({ name, terms, url }) => ({ name, terms, url })),
    disclaimer: d.meta.disclaimer,
  };
}

export function generateMetadata() {
  return pageMeta(t.method.title, t.method.lead, '/arga-zui');
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.md, maxWidth: 860 }}>
      <SectionHeader title={title} />
      {children}
    </View>
  );
}

export default function Method() {
  const d = useLoaderData<typeof loader>();
  const { c } = useTheme();
  const { isMobile } = useLayout();
  const m = t.method;

  return (
    <Page title={m.title} lead={m.lead}>
      <Block title={m.cutoffTitle}>
        <T>{m.cutoff}</T>
        <T>{m.publish}</T>
      </Block>

      <Block title={m.calcTitle}>
        <T>{m.calc7d}</T>
        <T>{m.calcTop100}</T>
        <T>{m.calcStable}</T>
      </Block>

      <Block title={m.sourcesTitle}>
        <Card style={{ gap: space.md }}>
          {d.sources.map((s) => (
            <View key={s.name} style={{ gap: 2 }}>
              <ExtLink href={s.url} v="bodyStrong">
                {s.name}
              </ExtLink>
              <T v="small" color="textMuted">
                {s.terms}
              </T>
            </View>
          ))}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
            {Object.values(SOURCES).map((s) => (
              <ExtLink key={s.url} href={s.url} v="small">
                {s.label}
              </ExtLink>
            ))}
          </View>
        </Card>
      </Block>

      <Block title={m.scheduleTitle}>
        <Card style={{ paddingVertical: space.sm }}>
          {d.schedule.map((row, i) => (
            <View
              key={row.timeUb + row.task}
              style={{
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? 2 : space.lg,
                paddingVertical: space.sm,
                borderBottomWidth: i < d.schedule.length - 1 ? 1 : 0,
                borderBottomColor: c.border,
              }}>
              <T v="smallStrong" color="accent" style={{ width: isMobile ? undefined : 160 }}>
                {row.timeUb}
              </T>
              <T v="small" style={{ flex: 1 }}>
                {row.task}
              </T>
              <T v="caption" color="textMuted" style={{ width: isMobile ? undefined : 120 }}>
                {row.owner}
              </T>
            </View>
          ))}
        </Card>
      </Block>

      <Block title={m.qaTitle}>
        <T>{m.qa}</T>
      </Block>

      <Block title={m.correctionsTitle}>
        <T>{m.corrections}</T>
      </Block>

      <Block title={m.disclaimerTitle}>
        <Card tone="surfaceAlt">
          <T v="bodyStrong">{d.disclaimer}</T>
        </Card>
      </Block>
    </Page>
  );
}
