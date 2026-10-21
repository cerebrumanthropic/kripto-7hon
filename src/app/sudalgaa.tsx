import { useLoaderData } from 'expo-router';

import { Page } from '@/components/layout/page';
import {
  AdditionalSection,
  BibliographySection,
  DesignSection,
  ExamplesSection,
  GlossarySection,
  MatrixSection,
  MongoliaSection,
  RegulatorsSection,
  SourcesSection,
  SummarySection,
  Toc,
} from '@/components/research/research-sections';
import { T } from '@/components/ui/primitives';
import { formatDay } from '@/lib/dates';
import { t } from '@/lib/i18n-mn';
import { pageMeta } from '@/lib/meta';

export async function loader() {
  const { readResearch } = await import('@/lib/server/content');
  return readResearch();
}

export async function generateMetadata() {
  const { readResearch } = await import('@/lib/server/content');
  const d = await readResearch();
  return pageMeta(t.research.title, d.meta.title, '/sudalgaa');
}

export default function ResearchPage() {
  const d = useLoaderData<typeof loader>();
  return (
    <Page
      title={t.research.title}
      lead={d.meta.title}
      meta={
        <T v="smallStrong" color="accent">
          {t.research.compiled(formatDay(d.meta.compiledAt))}
        </T>
      }>
      <Toc />
      <SummarySection d={d} />
      <ExamplesSection d={d} />
      <RegulatorsSection d={d} />
      <AdditionalSection d={d} />
      <MatrixSection d={d} />
      <DesignSection d={d} />
      <SourcesSection d={d} />
      <MongoliaSection d={d} />
      <GlossarySection d={d} />
      <BibliographySection d={d} />
    </Page>
  );
}
