// Тайлангийн инфографик (SPEC §8.8). Логик хэмжээ 1080×1350 (4:5), сайтын theme-ээс хамааралгүй
// өөрийн цайвар/бараан палитртай — PNG үргэлж ижил харагдана.
import type { ComponentRef, ReactNode, Ref } from 'react';
import { Text, View, type TextStyle } from 'react-native';
import Svg, { Line, Polyline, Rect } from 'react-native-svg';

import { linePoints } from '@/components/charts/scale';
import { GaugeArc } from '@/components/charts/gauge';
import { BrandMark } from '@/components/ui/brand-mark';
import { formatDay, weekShortLabel } from '@/lib/dates';
import { arrow, direction, groupDigits, mnt, pct, pctPlain, price, usdCompact } from '@/lib/format';
import { t } from '@/lib/i18n-mn';
import type { MergedReport } from '@/types/schemas';
import { dark, fonts, light, type ThemeColors } from '@/theme/tokens';

export const INFOGRAPHIC_W = 1080;
export const INFOGRAPHIC_H = 1350;
const PAD = 48;
const GAP = 18;
const INNER = INFOGRAPHIC_W - PAD * 2;

export type InfographicVariant = 'light' | 'dark';
/** Вэбд энэ нь HTMLElement (react-native-web) — PNG экспортод ашиглана. */
export type ViewRef = ComponentRef<typeof View>;

function useInk(variant: InfographicVariant) {
  const c: ThemeColors = variant === 'dark' ? dark : light;
  const txt = (size: number, weight: keyof typeof fonts = 'regular', color = c.text): TextStyle => ({
    fontFamily: fonts[weight],
    fontSize: size,
    lineHeight: Math.round(size * 1.25),
    color,
    fontVariant: ['tabular-nums'],
  });
  const dirColor = (v: number | null | undefined) =>
    direction(v) === 'up' ? c.positiveText : direction(v) === 'down' ? c.negativeText : c.neutralText;
  return { c, txt, dirColor };
}

/** 984px өргөнд Nunito Bold-ийн кирилл үсэг ≈0.56em — 2 мөрт багтах хамгийн том хэмжээ. */
export function headlineFontSize(chars: number): number {
  if (chars <= 72) return 44;
  if (chars <= 92) return 38;
  return 32;
}

function Panel({ c, children, style }: { c: ThemeColors; children: ReactNode; style?: object }) {
  return (
    <View style={[{ backgroundColor: c.surface, borderColor: c.border, borderWidth: 1.5, borderRadius: 14, padding: 18 }, style]}>
      {children}
    </View>
  );
}

function Spark({ values, w, h, color }: { values: number[]; w: number; h: number; color: string }) {
  if (values.length < 2) return <View style={{ height: h }} />;
  return (
    <Svg width={w} height={h}>
      <Polyline points={linePoints(values, w, h, 3)} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}

export function Infographic({
  r,
  variant,
  siteUrl,
  ref,
}: {
  r: MergedReport;
  variant: InfographicVariant;
  siteUrl: string;
  /** PNG экспортод: масштабгүй 1080×1350 DOM node */
  ref?: Ref<ViewRef>;
}) {
  const { c, txt, dirColor } = useInk(variant);
  const a = r.auto;
  const e = r.editorial;
  const g = t.infographic;
  const btc = a.majors.find((m) => m.symbol === 'BTC');
  const domDelta = a.global.btcDominancePct7dAgo === null ? null : a.global.btcDominancePct - a.global.btcDominancePct7dAgo;
  const etf = e.etf?.btc_net_flow_usd != null || e.etf?.eth_net_flow_usd != null;
  const host = siteUrl.replace(/^https?:\/\//, '');
  // ≤120 тэмдэгттэй гарчиг 2 мөрт багтах ёстой (SPEC §8.8.2) — уртаар нь фонтыг багасгана
  const headlineSize = headlineFontSize(e.headline.length);

  const kpis: Array<{ label: string; value: string; delta: string; dv: number | null; extra?: ReactNode }> = [
    {
      label: g.totalMcap,
      value: usdCompact(a.global.totalMarketCapUsd),
      delta: `${arrow(a.global.change7dPct)} ${pct(a.global.change7dPct)}`,
      dv: a.global.change7dPct,
    },
    { label: g.btc, value: price(btc?.priceUsd), delta: `${arrow(btc?.change7dPct)} ${pct(btc?.change7dPct)}`, dv: btc?.change7dPct ?? null },
    {
      label: g.dominance,
      value: pctPlain(a.global.btcDominancePct),
      delta: domDelta === null ? '—' : `${arrow(domDelta)} ${domDelta > 0 ? '+' : domDelta < 0 ? '−' : ''}${groupDigits(Math.abs(domDelta), 1)} ${g.pp}`,
      dv: domDelta,
    },
  ];

  const movers = (title: string, list: typeof a.topGainers) => (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={txt(18, 'semibold', c.textMuted)}>{title}</Text>
      {list.slice(0, 5).map((m) => (
        <View key={m.symbol} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={txt(20, 'semibold')} numberOfLines={1}>
            {m.symbol}
          </Text>
          <Text style={txt(20, 'semibold', dirColor(m.change7dPct))}>
            {arrow(m.change7dPct)} {pct(m.change7dPct)}
          </Text>
        </View>
      ))}
    </View>
  );

  return (
    <View
      ref={ref}
      style={{
        width: INFOGRAPHIC_W,
        height: INFOGRAPHIC_H,
        backgroundColor: c.bg,
        padding: PAD,
        gap: GAP,
        overflow: 'hidden',
      }}>
      {/* 1. Толгой */}
      <View style={{ height: 96, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 3, borderBottomColor: c.accent }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <BrandMark size={60} />
          <Text style={[txt(30, 'bold'), { letterSpacing: 1.5 }]}>{g.title}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={txt(24, 'semibold', c.accent)}>{weekShortLabel(a.week)}</Text>
          <Text style={txt(17, 'regular', c.textMuted)}>
            {g.cutoff}: {formatDay(a.periodEnd)} 23:59 UTC
          </Text>
        </View>
      </View>

      {/* 2. Headline (≤2 мөр) */}
      <View style={{ height: 116, justifyContent: 'center' }}>
        <Text style={[txt(headlineSize, 'bold'), { lineHeight: Math.round(headlineSize * 1.22), letterSpacing: -0.5 }]} numberOfLines={2}>
          {e.headline}
        </Text>
      </View>

      {/* 3. 4 KPI */}
      <View style={{ height: 176, flexDirection: 'row', gap: GAP }}>
        {kpis.map((k) => (
          <Panel key={k.label} c={c} style={{ flex: 1, justifyContent: 'space-between' }}>
            <Text style={txt(18, 'medium', c.textMuted)} numberOfLines={2}>
              {k.label}
            </Text>
            {/* «$2.41 их наяд» → тоо том, нэгж жижиг (вэбд adjustsFontSizeToFit ажилладаггүй) */}
            <Text style={txt(38, 'bold')} numberOfLines={1}>
              {k.value.split(' ')[0]}
              {k.value.includes(' ') ? <Text style={txt(20, 'semibold')}> {k.value.split(' ').slice(1).join(' ')}</Text> : null}
            </Text>
            <Text style={txt(20, 'semibold', dirColor(k.dv))}>{k.delta}</Text>
          </Panel>
        ))}
        <Panel c={c} style={{ flex: 1, alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={txt(18, 'medium', c.textMuted)}>{g.fearGreed}</Text>
          <GaugeArc value={a.fearGreed.value} size={140} ink={c.text} label={g.fearGreed} />
          <Text style={txt(22, 'bold')}>
            {a.fearGreed.value} · {a.fearGreed.labelMn}
          </Text>
        </Panel>
      </View>

      {/* 4. ETF урсгал эсвэл BTC 30 хоног */}
      <Panel c={c} style={{ height: 210, gap: 10 }}>
        <Text style={txt(20, 'semibold', c.textMuted)}>{etf ? g.etf : g.btc30d}</Text>
        {etf ? (
          <View style={{ gap: 18, marginTop: 8 }}>
            {(
              [
                ['BTC', e.etf?.btc_net_flow_usd],
                ['ETH', e.etf?.eth_net_flow_usd],
              ] as const
            ).map(([sym, v]) => {
              const max = Math.max(Math.abs(e.etf?.btc_net_flow_usd ?? 0), Math.abs(e.etf?.eth_net_flow_usd ?? 0), 1);
              const w = v == null ? 0 : (Math.abs(v) / max) * (INNER - 380);
              return (
                <View key={sym} style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <Text style={[txt(24, 'bold'), { width: 60 }]}>{sym}</Text>
                  <Svg width={INNER - 380} height={28}>
                    <Rect x={0} y={0} width={Math.max(2, w)} height={28} rx={4} fill={v != null && v < 0 ? c.negative : c.positive} />
                  </Svg>
                  <Text style={[txt(24, 'bold', dirColor(v)), { width: 220, textAlign: 'right' }]}>
                    {v == null ? '—' : `${arrow(v)} ${usdCompact(v)}`}
                  </Text>
                </View>
              );
            })}
            <Text style={txt(15, 'regular', c.textMuted)}>
              {t.common.sourceLabel}: {e.etf?.source_name ?? ''}
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
            <Svg width={INNER - 300} height={140}>
              <Line x1={0} x2={INNER - 300} y1={139} y2={139} stroke={c.border} strokeWidth={1.5} />
              <Polyline
                points={linePoints(btc?.chart30d.map((p) => p.priceUsd) ?? [], INNER - 300, 136, 4)}
                fill="none"
                stroke={c.btc}
                strokeWidth={4}
                strokeLinejoin="round"
              />
            </Svg>
            <View style={{ gap: 6 }}>
              <Text style={txt(34, 'bold')}>{price(btc?.priceUsd)}</Text>
              <Text style={txt(20, 'semibold', dirColor(btc?.change30dPct))}>
                30 хоног: {arrow(btc?.change30dPct)} {pct(btc?.change30dPct)}
              </Text>
            </View>
          </View>
        )}
      </Panel>

      {/* 5. Хоёр багана */}
      <View style={{ height: 262, flexDirection: 'row', gap: GAP }}>
        <Panel c={c} style={{ flex: 1, flexDirection: 'row', gap: 24 }}>
          {movers(g.gainers, a.topGainers)}
          {movers(g.losers, a.topLosers)}
        </Panel>
        <Panel c={c} style={{ flex: 1, gap: 12 }}>
          {[
            { label: g.stable, v: a.stablecoins.totalUsd, d: a.stablecoins.change7dPct, s: a.stablecoins.series30d, color: c.stable },
            { label: g.tvl, v: a.defi.tvlUsd, d: a.defi.change7dPct, s: a.defi.series30d, color: c.brand },
          ].map((x) => (
            <View key={x.label} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ gap: 2 }}>
                <Text style={txt(18, 'medium', c.textMuted)}>{x.label}</Text>
                <Text style={txt(30, 'bold')}>{usdCompact(x.v)}</Text>
                <Text style={txt(18, 'semibold', dirColor(x.d))}>
                  {arrow(x.d)} {pct(x.d)}
                </Text>
              </View>
              <Spark values={(x.s ?? []).map((p) => p.value)} w={170} h={70} color={x.color} />
            </View>
          ))}
        </Panel>
      </View>

      {/* 6. Монгол */}
      <Panel c={c} style={{ height: 92, flexDirection: 'row', alignItems: 'center', gap: 28 }}>
        <Text style={txt(22, 'bold', c.accent)}>{g.mongolia}</Text>
        <View>
          <Text style={txt(15, 'medium', c.textMuted)}>{g.btcMnt}</Text>
          <Text style={txt(24, 'bold')}>{mnt(btc?.priceMnt)}</Text>
        </View>
        <View>
          <Text style={txt(15, 'medium', c.textMuted)}>{g.usdMnt}</Text>
          <Text style={txt(24, 'bold')}>{a.fx ? `${groupDigits(a.fx.usdMnt, 2)} ₮` : '—'}</Text>
        </View>
        <Text style={[txt(17, 'regular'), { flex: 1 }]} numberOfLines={2}>
          {e.mongolia
            .slice(0, 2)
            .map((m) => m.text)
            .join(' · ')}
        </Text>
      </Panel>

      {/* 7. Ирэх 7 хоног */}
      <Panel c={c} style={{ height: 112, gap: 6 }}>
        <Text style={txt(18, 'semibold', c.textMuted)}>{g.nextWeek}</Text>
        {/* 2×2 grid — Text-д өргөн өгөхөд вэбд мөр дамжихгүй тул View-д ороосон */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 28, rowGap: 6 }}>
          {e.calendar.slice(0, 4).map((ev) => (
            <View key={ev.date + ev.event} style={{ width: '48%' }}>
              <Text style={txt(19, 'regular')} numberOfLines={1}>
                <Text style={txt(19, 'bold', c.accent)}>{formatDay(ev.date).slice(5)}</Text> {ev.event}
              </Text>
            </View>
          ))}
        </View>
      </Panel>

      {/* 8. Хөл */}
      <View style={{ height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={txt(15, 'regular', c.textMuted)}>{g.sources}</Text>
        <Text style={txt(15, 'semibold', c.textMuted)}>
          {g.disclaimer} · {host}
        </Text>
      </View>
    </View>
  );
}
