import { useLoaderData } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { BarList } from '@/components/charts/bar-list';
import { Heatmap } from '@/components/charts/heatmap';
import { LineChart } from '@/components/charts/line-chart';
import { Page } from '@/components/layout/page';
import type { InfographicVariant, ViewRef } from '@/components/report/infographic';
import { InfographicFrame } from '@/components/report/infographic-frame';
import { CopyTextButton, PngPrintActions } from '@/components/report/report-actions';
import { Attribution } from '@/components/ui/attribution';
import { Badge, Bullet, Card, Chip, Delta, ExtLink, Grid, InLink, SectionHeader, T } from '@/components/ui/primitives';
import { SITE_URL } from '@/lib/config';
import { formatDateTime, formatDay, weekLabel } from '@/lib/dates';
import { direction, groupDigits, mnt, usdCompact } from '@/lib/format';
import { t } from '@/lib/i18n-mn';
import { pageMeta } from '@/lib/meta';
import { byNumbers } from '@/lib/report-view';
import { buildShareText } from '@/lib/share-text';
import type { MergedReport } from '@/types/schemas';
import { space } from '@/theme/tokens';
import { useLayout, useTheme } from '@/theme/use-theme';

export async function generateStaticParams(): Promise<Record<string, string>[]> {
  const { readReportIndex } = await import('@/lib/server/content');
  return (await readReportIndex()).map((r) => ({ week: r.week }));
}

export async function loader(_request: unknown, params: Record<string, string | string[]>) {
  const { readReport, readReportIndex } = await import('@/lib/server/content');
  const week = String(params.week);
  const index = await readReportIndex();
  const i = index.findIndex((r) => r.week === week);
  return {
    report: await readReport(week),
    // index нь шинэ нь эхэндээ
    newer: i > 0 ? index[i - 1].week : null,
    older: i >= 0 && i < index.length - 1 ? index[i + 1].week : null,
  };
}

export async function generateMetadata(_request: unknown, params: Record<string, string | string[]>) {
  const { readReport } = await import('@/lib/server/content');
  const week = String(params.week);
  const r = await readReport(week); // буруу дугаарт null буцаана (export «[week]» загварыг ч render хийдэг)
  if (!r) return pageMeta(t.reports.title, t.reports.lead, '/tailan');
  return pageMeta(r.editorial.headline || weekLabel(week), r.editorial.summary || t.reports.lead, `/tailan/${week}`);
}

function Block({ title, children, id, kicker }: { title: string; children: ReactNode; id?: string; kicker?: string }) {
  return (
    <View style={{ gap: space.md }}>
      <SectionHeader title={title} id={id} kicker={kicker} />
      {children}
    </View>
  );
}

function NumbersTable({ r }: { r: MergedReport }) {
  const { c } = useTheme();
  const rows = byNumbers(r.auto, t.reports.rows);
  const cell = { flex: 1, textAlign: 'right' as const };
  return (
    <Card style={{ paddingVertical: space.sm }}>
      <View role="table" aria-label={t.reports.byNumbers}>
        <View role="row" style={{ flexDirection: 'row', gap: space.sm, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: c.borderStrong }}>
          <T v="caption" color="textMuted" style={{ flex: 1.6, fontWeight: '600' }} role="columnheader">
            {t.reports.indicator}
          </T>
          {[t.reports.thisWeek, t.reports.prevWeek, t.reports.change].map((h) => (
            <T key={h} v="caption" color="textMuted" style={[cell, { fontWeight: '600' }]} role="columnheader">
              {h}
            </T>
          ))}
        </View>
        {rows.map((row) => {
          const d = direction(row.change);
          return (
            <View
              key={row.key}
              role="row"
              style={{ flexDirection: 'row', gap: space.sm, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: c.border, alignItems: 'center' }}>
              <T v="small" style={{ flex: 1.6 }} role="rowheader">
                {row.label}
              </T>
              <T v="smallStrong" num style={cell} role="cell">
                {row.now}
              </T>
              <T v="small" num color="textMuted" style={cell} role="cell">
                {row.prev}
              </T>
              <T
                v="smallStrong"
                num
                role="cell"
                color={d === 'up' ? 'positiveText' : d === 'down' ? 'negativeText' : 'neutralText'}
                style={cell}>
                {d === 'up' ? '▲' : d === 'down' ? '▼' : '■'} {row.changeText}
              </T>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

function LinkList({ items }: { items: Array<{ text: string; url: string }> }) {
  return (
    <View style={{ gap: space.xs }}>
      {items.map((i) => (
        <Bullet key={i.url + i.text}>
          {i.text}{' '}
          <ExtLink href={i.url} v="small">
            {t.common.sourceLabel}
          </ExtLink>
        </Bullet>
      ))}
    </View>
  );
}

function Calendar({ r }: { r: MergedReport }) {
  return (
    <Card style={{ gap: space.sm }}>
      {r.editorial.calendar.map((ev) => (
        <View key={ev.date + ev.event} style={{ flexDirection: 'row', gap: space.lg }}>
          <T v="smallStrong" num color="accent" style={{ width: 92 }}>
            {formatDay(ev.date)}
          </T>
          <T v="small" style={{ flex: 1 }}>
            {ev.event}
          </T>
        </View>
      ))}
    </Card>
  );
}

function MongoliaNumbers({ r }: { r: MergedReport }) {
  const a = r.auto;
  const e = r.editorial;
  const btc = a.majors.find((m) => m.symbol === 'BTC');
  return (
    <View style={{ gap: space.xs }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xl }}>
        <View>
          <T v="small" color="textMuted">
            {t.reports.btcMnt}
          </T>
          <T v="h3" num>
            {mnt(btc?.priceMnt)}
          </T>
        </View>
        {a.fx ? (
          <View>
            <T v="small" color="textMuted">
              {t.reports.refRate}
            </T>
            <T v="h3" num>
              {groupDigits(a.fx.usdMnt, 2)} ₮
            </T>
          </View>
        ) : null}
        {e.mongolbank_usd_mnt != null ? (
          <View>
            <T v="small" color="textMuted">
              {t.reports.mongolbank}
            </T>
            <T v="h3" num>
              {groupDigits(e.mongolbank_usd_mnt, 2)} ₮
            </T>
          </View>
        ) : null}
      </View>
      <T v="caption" color="textMuted">
        {t.kpi.usdMntNote}
      </T>
      <Attribution sources={['exchangerate']} />
    </View>
  );
}

function Report({ r, newer, older }: { r: MergedReport; newer: string | null; older: string | null }) {
  const { c } = useTheme();
  const { cols, isDesktop } = useLayout();
  const [variant, setVariant] = useState<InfographicVariant>('light');
  const nodeRef = useRef<ViewRef>(null);
  const a = r.auto;
  const e = r.editorial;
  const picks = a.newsCandidates.filter((n) => e.news_picks.includes(n.url));
  const g = t.infographic;

  return (
    <Page
      kicker={weekLabel(a.week)}
      title={e.headline}
      lead={e.summary}
      meta={
        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md, alignItems: 'center' }}>
            {r.sample ? <Badge label={t.reports.sample} tone="warn" /> : null}
            {e.status === 'draft' ? <Badge label={t.reports.draft} tone="warn" /> : null}
            <T v="small" color="textMuted" num>
              {t.reports.published}: {formatDateTime(r.publishedAt)}
              {e.author ? ` · ${t.reports.author}: ${e.author}` : ''}
            </T>
          </View>
          {r.sample ? (
            <T v="small" color="warnText">
              {t.reports.sampleNote}
            </T>
          ) : null}
        </View>
      }>
      {/* 1. Инфографик */}
      <View style={{ gap: space.md, alignItems: 'flex-start' }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' }} nativeID="infographic-controls">
          <T v="label" color="textMuted">
            {g.variant}
          </T>
          <Chip label={g.light} selected={variant === 'light'} onPress={() => setVariant('light')} />
          <Chip label={g.dark} selected={variant === 'dark'} onPress={() => setVariant('dark')} />
        </View>
        <InfographicFrame r={r} variant={variant} siteUrl={SITE_URL} nodeRef={nodeRef} />
        <PngPrintActions
          getNode={() => nodeRef.current as unknown as HTMLElement | null}
          filename={`vh7hon-${a.week}${variant === 'dark' ? '-dark' : ''}.png`}
        />
      </View>

      {/* 2. Товч мэдээ */}
      <Block title={t.reports.brief} id="brief">
        <View style={{ gap: space.lg, maxWidth: 860 }}>
          <View style={{ gap: space.sm }}>
            <T v="label" color="textMuted">
              {t.reports.takeaways}
            </T>
            {e.takeaways.map((x, i) => (
              <View key={x + i} style={{ flexDirection: 'row', gap: space.md }}>
                <T v="h2" color="accent" num style={{ width: 24 }}>
                  {i + 1}
                </T>
                <T style={{ flex: 1 }}>{x}</T>
              </View>
            ))}
          </View>
          <View style={{ gap: space.sm }}>
            <T v="label" color="textMuted">
              {t.reports.byNumbers}
            </T>
            <NumbersTable r={r} />
          </View>
          <View style={{ gap: space.sm }}>
            <T v="label" color="textMuted">
              {t.reports.mongolia}
            </T>
            <MongoliaNumbers r={r} />
            {e.mongolia.length > 0 ? <LinkList items={e.mongolia} /> : null}
          </View>
          {e.calendar.length > 0 ? (
            <View style={{ gap: space.sm }}>
              <T v="label" color="textMuted">
                {t.reports.calendar}
              </T>
              <Calendar r={r} />
            </View>
          ) : null}
          <Attribution sources={['coingecko', 'defillama', 'alternative', 'exchangerate']} />
          <CopyTextButton text={buildShareText(r, SITE_URL)} />
        </View>
      </Block>

      {/* 3. Дэлгэрэнгүй */}
      <Block title={t.reports.overview}>
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: space.md }}>
          <Card style={{ flex: isDesktop ? 3 : undefined, gap: space.sm }}>
            <T v="h3">{t.reports.majors30d}</T>
            <LineChart
              label={t.reports.majors30d}
              indexed
              series={a.majors.map((m) => ({
                name: `${m.symbol} (${m.change30dPct === null ? '—' : `${m.change30dPct > 0 ? '+' : '−'}${Math.abs(m.change30dPct).toFixed(1)}%`})`,
                color: m.symbol === 'BTC' ? c.btc : c.eth,
                values: m.chart30d.map((p) => p.priceUsd),
              }))}
              dates={(a.majors[0]?.chart30d ?? []).map((p) => formatDay(p.date))}
              formatY={(v) => v.toFixed(0)}
            />
          </Card>
          <Card style={{ flex: isDesktop ? 2 : undefined, gap: space.md }}>
            <T v="h3">{t.market.gainers}</T>
            <BarList label={t.market.gainers} items={a.topGainers.map((m) => ({ key: m.symbol, label: m.symbol, sub: m.name, value: m.change7dPct }))} />
            <T v="h3">{t.market.losers}</T>
            <BarList label={t.market.losers} items={a.topLosers.map((m) => ({ key: m.symbol, label: m.symbol, sub: m.name, value: m.change7dPct }))} />
          </Card>
        </View>
        <Card style={{ gap: space.sm }}>
          <T v="h3">{t.reports.heatmap}</T>
          <Heatmap label={t.reports.heatmap} columns={cols === 1 ? 4 : 5} items={a.heatmapTop20.map((m) => ({ symbol: m.symbol, change: m.change7dPct }))} />
        </Card>
        <Attribution sources={['coingecko']} />
      </Block>

      <Block title={t.reports.flows}>
        <Grid cols={cols === 1 ? 1 : 2}>
          {[
            <Card key="etf" style={{ gap: space.sm, height: '100%' }}>
              <T v="h3">{t.reports.etfFlows}</T>
              {e.etf?.btc_net_flow_usd != null || e.etf?.eth_net_flow_usd != null ? (
                <>
                  {(
                    [
                      ['BTC', e.etf?.btc_net_flow_usd],
                      ['ETH', e.etf?.eth_net_flow_usd],
                    ] as const
                  ).map(([sym, v]) => (
                    <View key={sym} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <T v="smallStrong">{sym}</T>
                      <T v="smallStrong" num color={v == null ? 'textMuted' : v >= 0 ? 'positiveText' : 'negativeText'}>
                        {v == null ? '—' : `${v >= 0 ? '▲' : '▼'} ${usdCompact(v)}`}
                      </T>
                    </View>
                  ))}
                  {e.etf?.source_url ? (
                    <ExtLink href={e.etf.source_url} v="caption" color="textMuted">
                      {t.common.sourceLabel}: {e.etf.source_name ?? e.etf.source_url}
                    </ExtLink>
                  ) : null}
                </>
              ) : (
                <T v="small" color="textMuted">
                  {t.reports.etfMissing}
                </T>
              )}
              {e.coinshares?.weekly_flow_usd != null ? (
                <View style={{ marginTop: space.sm }}>
                  <T v="small" color="textMuted">
                    {t.reports.coinshares}
                  </T>
                  <T v="smallStrong" num color={e.coinshares.weekly_flow_usd >= 0 ? 'positiveText' : 'negativeText'}>
                    {e.coinshares.weekly_flow_usd >= 0 ? '▲' : '▼'} {usdCompact(e.coinshares.weekly_flow_usd)}
                  </T>
                  {e.coinshares.url ? (
                    <ExtLink href={e.coinshares.url} v="caption" color="textMuted">
                      CoinShares
                    </ExtLink>
                  ) : null}
                </View>
              ) : null}
            </Card>,
            <Card key="stable" style={{ gap: space.xs, height: '100%' }}>
              <T v="h3">{t.kpi.stablecoins}</T>
              <T v="kpi" num>
                {usdCompact(a.stablecoins.totalUsd)}
              </T>
              <Delta value={a.stablecoins.change7dPct} suffix={t.kpi.change7d} />
              {a.stablecoins.top.map((s) => (
                <View key={s.symbol} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
                  <T v="small">{s.symbol}</T>
                  <T v="small" num>
                    {usdCompact(s.circulatingUsd)}
                  </T>
                  <Delta value={s.change7dPct} v="caption" />
                </View>
              ))}
              <Attribution sources={['defillama']} />
            </Card>,
          ]}
        </Grid>
      </Block>

      <Grid cols={cols === 1 ? 1 : 2} gap={space.xl}>
        {[
          <Block key="defi" title={t.reports.defi}>
            <Card style={{ gap: space.xs }}>
              <T v="small" color="textMuted">
                {t.market.tvl}
              </T>
              <T v="kpi" num>
                {usdCompact(a.defi.tvlUsd)}
              </T>
              <Delta value={a.defi.change7dPct} suffix={t.kpi.change7d} />
              <T v="small" color="textMuted" style={{ marginTop: space.sm }}>
                {t.market.dex7}
              </T>
              <T v="h3" num>
                {usdCompact(a.defi.dexVolume7dUsd)}
              </T>
              {a.defi.dexChange7dPct != null ? <Delta value={a.defi.dexChange7dPct} suffix={t.kpi.change7d} /> : null}
              {a.hacks && a.hacks.length > 0 ? (
                <View style={{ marginTop: space.sm, gap: 2 }}>
                  <T v="label" color="textMuted">
                    {t.reports.hacks}
                  </T>
                  {a.hacks.slice(0, 5).map((h) => (
                    <T key={h.name + h.date} v="small" num>
                      {formatDay(h.date)} · {h.name} · {usdCompact(h.amountUsd)}
                    </T>
                  ))}
                </View>
              ) : null}
              <Attribution sources={['defillama']} />
            </Card>
          </Block>,
          <Block key="fg" title={t.reports.sentiment}>
            <Card style={{ gap: space.sm }}>
              <T v="h3">{t.reports.fg7d}</T>
              <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'baseline' }}>
                <T v="kpi" num>
                  {a.fearGreed.value}
                </T>
                <T v="smallStrong" color="textMuted">
                  {a.fearGreed.labelMn}
                </T>
                <T v="small" color="textMuted" num>
                  ({t.reports.prevWeek}: {a.fearGreed.value7dAgo ?? '—'})
                </T>
              </View>
              <LineChart
                label={t.reports.fg7d}
                height={140}
                series={[{ name: t.kpi.fearGreed, color: c.brand, values: a.fearGreed.series7d.map((p) => p.value) }]}
                dates={a.fearGreed.series7d.map((p) => formatDay(p.date))}
                formatY={(v) => v.toFixed(0)}
              />
              <Attribution sources={['alternative']} />
            </Card>
          </Block>,
        ]}
      </Grid>

      {e.regulation.length > 0 ? (
        <Block title={t.reports.regulation}>
          <LinkList items={e.regulation} />
        </Block>
      ) : null}

      {picks.length > 0 ? (
        <Block title={t.reports.picks}>
          <View style={{ gap: space.xs }}>
            {picks.map((n) => (
              <Bullet key={n.id}>
                <ExtLink href={n.url}>{n.title}</ExtLink>
                <T v="caption" color="textMuted">
                  {' '}
                  · {n.source}
                </T>
              </Bullet>
            ))}
          </View>
        </Block>
      ) : null}

      {r.body.length > 0 ? (
        <Block title={t.reports.editorNote}>
          <View style={{ gap: space.sm, maxWidth: 820 }}>
            {r.body.map((b, i) =>
              b.type === 'h3' ? (
                <T key={i} v="h3" role="heading" aria-level={3} style={{ marginTop: space.sm }}>
                  {b.text}
                </T>
              ) : b.type === 'li' ? (
                <Bullet key={i}>{b.text}</Bullet>
              ) : (
                <T key={i}>{b.text}</T>
              ),
            )}
          </View>
        </Block>
      ) : null}

      {e.corrections.length > 0 ? (
        <Block title={t.reports.corrections}>
          {e.corrections.map((x) => (
            <T key={x.date + x.text} v="small">
              {formatDay(x.date)}: {x.text}
            </T>
          ))}
        </Block>
      ) : null}

      {/* 4. Арга зүй ба эх сурвалж */}
      <Block title={t.reports.methodology}>
        <Card tone="surfaceAlt" style={{ gap: space.xs }}>
          <T v="small" num>
            {t.reports.asOf(t.reports.dataAsOf.cutoff, `${formatDay(a.periodEnd)} 23:59 UTC`)}
          </T>
          <T v="small" num>
            {t.reports.asOf(t.reports.dataAsOf.fetched, formatDateTime(a.fetchedAt))}
          </T>
          {a.fx ? (
            <T v="small" num>
              {t.reports.asOf(t.reports.dataAsOf.fx, formatDateTime(a.fx.asOf))}
            </T>
          ) : null}
          {a.global.change7dMethod === 'top100-estimate' ? (
            <T v="small" color="warnText">
              {t.reports.rows.mcap}: {t.reports.estimated}
            </T>
          ) : null}
          <Attribution sources={['coingecko', 'defillama', 'alternative', 'exchangerate']} />
          <T v="small" style={{ marginTop: space.sm, fontWeight: '600' }}>
            {t.footer.disclaimer}
          </T>
          <InLink href="/arga-zui" v="small">
            {t.footer.method}
          </InLink>
        </Card>
      </Block>

      {/* 5. Навигаци */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md, flexWrap: 'wrap' }} nativeID="report-nav">
        {older ? (
          <InLink href={`/tailan/${older}`} v="bodyStrong">
            {t.reports.prev}
          </InLink>
        ) : (
          <View />
        )}
        {newer ? (
          <InLink href={`/tailan/${newer}`} v="bodyStrong">
            {t.reports.next}
          </InLink>
        ) : null}
      </View>
    </Page>
  );
}

export default function ReportPage() {
  const { report, newer, older } = useLoaderData<typeof loader>();
  if (!report) {
    return (
      <Page title={t.reports.notFound}>
        <InLink href="/tailan">{t.reports.title}</InLink>
      </Page>
    );
  }
  return <Report r={report} newer={newer} older={older} />;
}
