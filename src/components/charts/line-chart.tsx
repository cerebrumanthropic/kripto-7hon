import { View } from 'react-native';
import Svg, { Line, Polyline, Text as SvgText } from 'react-native-svg';

import { T } from '@/components/ui/primitives';
import { fonts, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { extent, linePoints } from './scale';
import { useWidth } from './use-width';

export type Series = { name: string; color: string; values: number[] };

/**
 * Шугаман график. Олон цуврал өгвөл тус бүрийг 100-д индексжүүлж (эхний утга = 100) харьцуулна.
 * Y тэнхлэгт min/max, X тэнхлэгт эхний/сүүлийн огноо.
 */
export function LineChart({
  series,
  dates,
  height = 200,
  formatY,
  label,
  indexed = false,
}: {
  series: Series[];
  dates: string[];
  height?: number;
  formatY: (v: number) => string;
  label: string;
  indexed?: boolean;
}) {
  const { c } = useTheme();
  const [width, onLayout] = useWidth();
  const padL = 64;
  const padB = 22;
  const padT = 8;
  const plotW = Math.max(0, width - padL);
  const plotH = height - padB - padT;

  const prepared = series.map((s) => ({
    ...s,
    values: indexed && s.values[0] ? s.values.map((v) => (v / s.values[0]) * 100) : s.values,
  }));
  const domain = extent(prepared.flatMap((s) => s.values));
  const ticks = [domain[1], (domain[0] + domain[1]) / 2, domain[0]];

  return (
    <View style={{ gap: space.sm }}>
      {series.length > 1 ? (
        <View style={{ flexDirection: 'row', gap: space.lg, flexWrap: 'wrap' }}>
          {series.map((s) => (
            <View key={s.name} style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <View style={{ width: 12, height: 3, backgroundColor: s.color }} />
              <T v="caption" color="textMuted">
                {s.name}
              </T>
            </View>
          ))}
        </View>
      ) : null}
      <View onLayout={onLayout} style={{ height, width: '100%' }} role="img" aria-label={label}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            {ticks.map((v, i) => {
              const y = padT + (i / 2) * plotH;
              return (
                <Line key={`g${i}`} x1={padL} x2={width} y1={y} y2={y} stroke={c.border} strokeWidth={1} />
              );
            })}
            {ticks.map((v, i) => (
              <SvgText
                key={`t${i}`}
                x={padL - 6}
                y={padT + (i / 2) * plotH + 4}
                fontSize={11}
                fontFamily={fonts.regular}
                fill={c.textMuted}
                textAnchor="end">
                {indexed ? v.toFixed(0) : formatY(v)}
              </SvgText>
            ))}
            {prepared.map((s) => (
              <Polyline
                key={s.name}
                points={linePoints(s.values, plotW, plotH, 0, domain)
                  .split(' ')
                  .map((p) => {
                    const [x, y] = p.split(',').map(Number);
                    return `${(x + padL).toFixed(1)},${(y + padT).toFixed(1)}`;
                  })
                  .join(' ')}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
              />
            ))}
            {dates.length > 0 ? (
              <>
                <SvgText x={padL} y={height - 4} fontSize={11} fontFamily={fonts.regular} fill={c.textMuted}>
                  {dates[0]}
                </SvgText>
                <SvgText
                  x={width}
                  y={height - 4}
                  fontSize={11}
                  fontFamily={fonts.regular}
                  fill={c.textMuted}
                  textAnchor="end">
                  {dates[dates.length - 1]}
                </SvgText>
              </>
            ) : null}
          </Svg>
        ) : null}
      </View>
    </View>
  );
}
