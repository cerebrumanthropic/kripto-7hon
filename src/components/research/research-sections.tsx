import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Badge, Bullet, Card, ExtLink, Grid, SectionHeader, T, webPress } from '@/components/ui/primitives';
import { t } from '@/lib/i18n-mn';
import type { Research } from '@/types/research';
import { radius, space } from '@/theme/tokens';
import { useLayout, useTheme } from '@/theme/use-theme';

const r = t.research;

// Lighthouse target-size: дараалсан жижиг холбоос бүр ≥24px өндөртэй
const LINK_TARGET = { paddingVertical: 3 } as const;

export const SECTIONS = [
  { id: 'summary', title: r.summary },
  { id: 'examples', title: r.examples },
  { id: 'regulators', title: r.regulators },
  { id: 'additional', title: r.additional },
  { id: 'matrix', title: r.matrix },
  { id: 'design', title: r.design },
  { id: 'sources', title: r.sources },
  { id: 'mongolia', title: r.mongolia },
  { id: 'glossary', title: r.glossary },
  { id: 'bibliography', title: r.bibliography },
] as const;

function Section({ id, title, kicker, children }: { id: string; title: string; kicker?: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.md }}>
      <SectionHeader id={id} title={title} kicker={kicker} />
      {children}
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: 2 }}>
      <T v="label" color="textMuted">
        {label}
      </T>
      <T v="small">{children}</T>
    </View>
  );
}

/** Энгийн хүснэгт; мобайлд нарийн багана тасрахгүйгээр мөр бүрийг доош нь урсгана. */
function SimpleTable({ head, rows, flex }: { head: string[]; rows: ReactNode[][]; flex?: number[] }) {
  const { c } = useTheme();
  const f = (i: number) => flex?.[i] ?? 1;
  return (
    <View role="table">
      <View role="row" style={{ flexDirection: 'row', gap: space.sm, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: c.borderStrong }}>
        {head.map((h, i) => (
          <T key={h} v="caption" color="textMuted" role="columnheader" style={{ flex: f(i), fontWeight: '600' }}>
            {h}
          </T>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} role="row" style={{ flexDirection: 'row', gap: space.sm, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: c.border }}>
          {row.map((cell, ci) => (
            <View key={ci} role="cell" style={{ flex: f(ci), minWidth: 0 }}>
              {typeof cell === 'string' ? <T v="small">{cell}</T> : cell}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/** Хуудас доторх anchor руу гүйлгэнэ (`nativeID` нь вэбд `id` болдог). */
function scrollToSection(id: string) {
  if (typeof document === 'undefined') return;
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  history.replaceState(null, '', `#${id}`);
}

export function Toc() {
  const { c } = useTheme();
  return (
    <Card tone="surfaceAlt" style={{ gap: space.sm }}>
      <T v="label" color="textMuted">
        {r.toc}
      </T>
      <View role="list" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {SECTIONS.map((s, i) => (
          <View key={s.id} role="listitem">
            <Pressable
              role="link"
              onPress={() => scrollToSection(s.id)}
              style={(st) => ({
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: webPress(st).hovered ? c.borderStrong : c.border,
                paddingHorizontal: space.md,
                paddingVertical: 4,
                backgroundColor: c.surface,
                outlineColor: c.brand,
                outlineWidth: webPress(st).focused ? 2 : 0,
                outlineStyle: 'solid',
              })}>
              <T v="small">{`${i + 1}. ${s.title}`}</T>
            </Pressable>
          </View>
        ))}
      </View>
    </Card>
  );
}

export function SummarySection({ d }: { d: Research }) {
  const { cols } = useLayout();
  return (
    <Section id="summary" title={r.summary}>
      <View style={{ gap: space.sm, maxWidth: 860 }}>
        {d.summary.map((s) => (
          <Bullet key={s}>{s}</Bullet>
        ))}
      </View>
      <Grid cols={cols === 4 ? 3 : cols}>
        {d.keyFindings.map((k) => (
          <Card key={k.title} style={{ gap: space.xs, height: '100%' }}>
            <T v="h3">{k.title}</T>
            <T v="small" color="textMuted">
              {k.text}
            </T>
          </Card>
        ))}
      </Grid>
    </Section>
  );
}

export function ExamplesSection({ d }: { d: Research }) {
  const { cols } = useLayout();
  const verified = d.internationalExamples.filter((e) => e.verified2026).length;
  return (
    <Section id="examples" title={`${r.examples} (${d.internationalExamples.length})`} kicker={`${r.examplesNote}: ${verified}`}>
      <Grid cols={cols === 4 ? 3 : cols}>
        {d.internationalExamples.map((e) => (
          <Card key={e.id} style={{ gap: space.sm, height: '100%' }}>
            <View style={{ gap: 2 }}>
              <T v="h3">{e.name}</T>
              <T v="small" color="textMuted">
                {e.publisher}
              </T>
            </View>
            {e.verified2026 ? <Badge label={r.examplesNote} tone="brand" /> : <Badge label={r.unverified} tone="warn" />}
            <Field label={r.frequency}>{e.frequency}</Field>
            <Field label={r.format}>{e.format}</Field>
            <Field label={r.metrics}>{e.metrics.join(' · ')}</Field>
            <Field label={r.structure}>{e.structure}</Field>
            <Field label={t.research.design}>{e.design}</Field>
            <Field label={r.distribution}>{e.distribution}</Field>
            <Field label={r.pricing}>{e.pricing}</Field>
            <View style={{ gap: 2 }}>
              {e.urls.map((u) => (
                <ExtLink key={u.url} href={u.url} v="small" style={LINK_TARGET}>
                  {u.label}
                </ExtLink>
              ))}
            </View>
          </Card>
        ))}
      </Grid>
    </Section>
  );
}

export function RegulatorsSection({ d }: { d: Research }) {
  const { cols } = useLayout();
  return (
    <Section id="regulators" title={`${r.regulators} (${d.regulators.length})`}>
      <Grid cols={cols === 1 ? 1 : 2}>
        {d.regulators.map((g) => (
          <Card key={g.id} style={{ gap: space.sm, height: '100%' }}>
            <T v="h3">{g.name}</T>
            <Field label={r.frequency}>{g.frequency}</Field>
            <T v="small">{g.keyData}</T>
            {g.urls.map((u) => (
              <ExtLink key={u.url} href={u.url} v="small" style={LINK_TARGET}>
                {u.label}
              </ExtLink>
            ))}
          </Card>
        ))}
      </Grid>
    </Section>
  );
}

export function AdditionalSection({ d }: { d: Research }) {
  const { cols } = useLayout();
  return (
    <Section id="additional" title={r.additional}>
      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center', flexWrap: 'wrap' }}>
        <Badge label={r.unverified} tone="warn" />
        <T v="small" color="textMuted" style={{ flex: 1, minWidth: 220 }}>
          {d.additionalReferences.note}
        </T>
      </View>
      <Grid cols={cols}>
        {d.additionalReferences.groups.map((g) => (
          <Card key={g.category} style={{ gap: space.xs, height: '100%' }}>
            <T v="smallStrong">{g.category}</T>
            {g.items.map((i) =>
              i.url ? (
                <ExtLink key={i.name} href={i.url} v="small" style={LINK_TARGET}>
                  {i.name}
                </ExtLink>
              ) : (
                <T key={i.name} v="small">
                  {i.name}
                </T>
              ),
            )}
          </Card>
        ))}
      </Grid>
    </Section>
  );
}

export function MatrixSection({ d }: { d: Research }) {
  const { isMobile, cols } = useLayout();
  const m = d.metricsMatrix;
  const legend = Object.entries(m.legend)
    .map(([k, v]) => `${k} ${v}`)
    .join(' · ');
  return (
    <Section id="matrix" title={r.matrix}>
      <T v="small" color="textMuted">
        {legend}
      </T>
      <Card>
        {isMobile ? (
          <View style={{ gap: space.md }}>
            {m.rows.map((row) => (
              <View key={row.metric} style={{ gap: 4 }}>
                <T v="smallStrong">{row.metric}</T>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                  {m.publishers.map((p, i) => (
                    <T key={p.id} v="caption" color="textMuted">
                      {p.label}: <T v="caption">{row.values[i]}</T>
                    </T>
                  ))}
                </View>
                <T v="caption" color="textMuted">
                  {row.presentation}
                </T>
              </View>
            ))}
          </View>
        ) : (
          <SimpleTable
            head={[r.metric, ...m.publishers.map((p) => p.label), r.presentation]}
            flex={[2.2, ...m.publishers.map(() => 0.8), 2.2]}
            rows={m.rows.map((row) => [
              row.metric,
              ...row.values.map((v) => (
                <T key={v} v="smallStrong" style={{ textAlign: 'center' }} aria-label={m.legend[v] ?? v}>
                  {v}
                </T>
              )),
              <T key="p" v="caption" color="textMuted">
                {row.presentation}
              </T>,
            ])}
          />
        )}
      </Card>
      <Grid cols={cols === 1 ? 1 : 3}>
        {[
          <Card key="core" style={{ gap: 4, height: '100%' }}>
            <T v="smallStrong">{r.coreMetrics}</T>
            {d.coreMetrics.map((x) => (
              <T key={x} v="small">
                • {x}
              </T>
            ))}
          </Card>,
          <Card key="diff" style={{ gap: 4, height: '100%' }}>
            <T v="smallStrong">{r.diffMetrics}</T>
            {d.differentiatingMetrics.map((x) => (
              <T key={x} v="small">
                • {x}
              </T>
            ))}
          </Card>,
          <Card key="order" style={{ gap: 4, height: '100%' }}>
            <T v="smallStrong">{r.sectionOrder}</T>
            {d.sectionOrder.map((x, i) => (
              <T key={x} v="small">
                {i + 1}. {x}
              </T>
            ))}
          </Card>,
        ]}
      </Grid>
    </Section>
  );
}

export function DesignSection({ d }: { d: Research }) {
  const { cols } = useLayout();
  const p = d.designPractices;
  return (
    <Section id="design" title={r.design}>
      <Grid cols={cols === 1 ? 1 : 2}>
        {[
          <Card key="headline" style={{ gap: space.sm, height: '100%' }}>
            <T v="h3">{r.headlineFormula}</T>
            <T v="bodyStrong" color="accent">
              {d.headlineFormula.rule}
            </T>
            {d.headlineFormula.examples.map((x) => (
              <T key={x.text} v="small" color="textMuted">
                {x.source}: «{x.text}»
              </T>
            ))}
            <T v="small">«{d.headlineFormula.mongolianExample}»</T>
          </Card>,
          <Card key="info" style={{ gap: 4, height: '100%' }}>
            <T v="h3">{r.infographic}</T>
            {p.infographicLayout.map((x, i) => (
              <T key={x} v="small">
                {i + 1}. {x}
              </T>
            ))}
          </Card>,
          <Card key="charts" style={{ gap: 4, height: '100%' }}>
            <T v="h3">{r.chartTypes}</T>
            {p.chartTypes.map((x) => (
              <T key={x.type} v="small">
                <T v="smallStrong">{x.type}</T> — {x.use}
              </T>
            ))}
          </Card>,
          <Card key="color" style={{ gap: 4, height: '100%' }}>
            <T v="h3">{r.color}</T>
            {p.color.map((x) => (
              <T key={x} v="small">
                • {x}
              </T>
            ))}
            <T v="label" color="textMuted" style={{ marginTop: space.sm }}>
              {r.citation}
            </T>
            <T v="small">{p.citation}</T>
          </Card>,
          <Card key="tools" style={{ gap: 4, height: '100%' }}>
            <T v="h3">{r.tools}</T>
            {p.tools.map((x) => (
              <T key={x.name} v="small">
                <ExtLink href={x.url} v="smallStrong">
                  {x.name}
                </ExtLink>{' '}
                — {x.use}
              </T>
            ))}
          </Card>,
          <Card key="tmpl" style={{ gap: 4, height: '100%' }}>
            <T v="h3">{r.weeklyTemplate}</T>
            {d.weeklyTemplate.formats.map((f) => (
              <T key={f.name} v="small">
                <T v="smallStrong">{f.name}</T> — {f.schedule}; {f.channel}; {f.size}
              </T>
            ))}
            <View style={{ marginTop: space.sm, gap: 2 }}>
              {d.weeklyTemplate.briefSections.map((x, i) => (
                <T key={x} v="small" color="textMuted">
                  {i + 1}. {x}
                </T>
              ))}
            </View>
            <View style={{ marginTop: space.sm, gap: 2 }}>
              {d.weeklyTemplate.monthlyAddOns.map((x) => (
                <T key={x} v="caption" color="textMuted">
                  + {x}
                </T>
              ))}
            </View>
          </Card>,
        ]}
      </Grid>
      <Card tone="surfaceAlt">
        <T v="small">{p.disclaimerExampleMn}</T>
      </Card>
    </Section>
  );
}

export function SourcesSection({ d }: { d: Research }) {
  const { cols } = useLayout();
  return (
    <Section id="sources" title={`${r.sources} (${d.dataSources.length})`}>
      <Grid cols={cols === 4 ? 3 : cols}>
        {d.dataSources.map((s) => (
          <Card key={s.name} style={{ gap: space.sm, height: '100%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm, alignItems: 'flex-start' }}>
              <ExtLink href={s.url} v="bodyStrong" style={{ flexShrink: 1 }}>
                {s.name}
              </ExtLink>
              {s.usedByPlatform ? <Badge label={r.used} tone="brand" /> : null}
            </View>
            <T v="small" color="textMuted">
              {s.provides}
            </T>
            <Field label={r.free}>{s.free}</Field>
            <Field label={r.paid}>{s.paid}</Field>
            <Field label={r.terms}>{s.terms}</Field>
          </Card>
        ))}
      </Grid>
    </Section>
  );
}

export function MongoliaSection({ d }: { d: Research }) {
  const { c } = useTheme();
  const { cols } = useLayout();
  const mn = d.mongolia;
  return (
    <Section id="mongolia" title={r.mongolia}>
      <Card style={{ gap: space.sm }}>
        <T v="h3">{r.legal}</T>
        {mn.legal.map((x) => (
          <Bullet key={x}>{x}</Bullet>
        ))}
      </Card>

      <Card style={{ gap: space.sm }}>
        <T v="h3">{r.stats}</T>
        <T v="caption" color="textMuted">
          {mn.stats.source}
        </T>
        <SimpleTable
          head={[r.metric, ...mn.stats.columns]}
          flex={[1.6, 1, 1, 1]}
          rows={mn.stats.rows.map((row) => [row.metric, ...row.values])}
        />
        <View style={{ gap: 4, marginTop: space.sm }}>
          {mn.stats.footnotes.map((f) => (
            <T key={f} v="caption" color="textMuted">
              {f}
            </T>
          ))}
        </View>
      </Card>

      <Grid cols={cols === 1 ? 1 : 2}>
        {[
          <Card key="vasp" style={{ gap: space.sm, height: '100%' }}>
            <T v="h3">
              {r.vasps} ({mn.vasps.items.length})
            </T>
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', alignItems: 'center' }}>
              <Badge label={r.vaspVerify} tone="warn" />
              <ExtLink href={mn.vasps.verifyUrl} v="small">
                license.frc.mn
              </ExtLink>
            </View>
            <T v="caption" color="textMuted">
              {mn.vasps.note}
            </T>
            <SimpleTable
              head={[r.no, r.company, r.platform, r.registered]}
              flex={[0.4, 2, 1.4, 1.2]}
              rows={mn.vasps.items.map((v) => [String(v.no), v.company, v.platform, v.registeredAt.replaceAll('-', '.')])}
            />
            <ExtLink href={mn.vasps.sourceUrl} v="caption" color="textMuted">
              {t.common.sourceLabel}: СЗХ
            </ExtLink>
          </Card>,
          <Card key="share" style={{ gap: space.sm, height: '100%' }}>
            <T v="h3">{r.marketShare}</T>
            <T v="caption" color="textMuted">
              {mn.marketShare2023.note}
            </T>
            {mn.marketShare2023.items.map((i) => (
              <View key={i.platform} style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <T v="smallStrong">{i.platform}</T>
                  <T v="smallStrong" num>
                    {i.sharePct.toFixed(1)}%
                  </T>
                </View>
                <View style={{ height: 8, backgroundColor: c.surfaceAlt, borderRadius: radius.sm }}>
                  <View style={{ height: 8, width: `${i.sharePct}%`, backgroundColor: c.brand, borderRadius: radius.sm }} />
                </View>
              </View>
            ))}
            <T v="small" color="textMuted">
              {r.top3(mn.marketShare2023.top3SharePct)}
            </T>
            <T v="h3" style={{ marginTop: space.md }}>
              {r.dataAvailability}
            </T>
            {mn.dataAvailability.map((x) => (
              <T key={x} v="small">
                • {x}
              </T>
            ))}
          </Card>,
        ]}
      </Grid>

      <View style={{ gap: 4 }}>
        {mn.links.map((l) => (
          <ExtLink key={l.url} href={l.url} v="small" style={LINK_TARGET}>
            {l.label}
          </ExtLink>
        ))}
      </View>
    </Section>
  );
}

export function GlossarySection({ d }: { d: Research }) {
  return (
    <Section id="glossary" title={r.glossary}>
      <Card>
        <SimpleTable head={[r.glossaryMn, r.glossaryEn]} rows={d.glossary.map((g) => [g.mn, g.en])} />
      </Card>
    </Section>
  );
}

export function BibliographySection({ d }: { d: Research }) {
  return (
    <Section id="bibliography" title={`${r.bibliography} (${d.sources.length})`}>
      <View style={{ gap: 6 }} role="list">
        {d.sources.map((s, i) => (
          <View key={s.url + i} role="listitem" style={{ flexDirection: 'row', gap: space.sm }}>
            <T v="small" color="textMuted" num style={{ width: 28 }}>
              {i + 1}.
            </T>
            <ExtLink href={s.url} v="small" style={{ flex: 1 }}>
              {s.title}
            </ExtLink>
          </View>
        ))}
      </View>
      <Card tone="surfaceAlt" style={{ gap: 4 }}>
        <T v="label" color="textMuted">
          {r.caveats}
        </T>
        {d.caveats.map((x) => (
          <T key={x} v="small">
            • {x}
          </T>
        ))}
        <T v="small" style={{ marginTop: space.sm, fontWeight: '600' }}>
          {d.meta.disclaimer}
        </T>
      </Card>
    </Section>
  );
}
