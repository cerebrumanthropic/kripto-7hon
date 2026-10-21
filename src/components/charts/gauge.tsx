import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { T } from '@/components/ui/primitives';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { gaugeAngle } from './scale';

const BANDS = [
  { from: 0, to: 25, color: '#DC2626' },
  { from: 25, to: 45, color: '#F97316' },
  { from: 45, to: 55, color: '#94A3B8' },
  { from: 55, to: 75, color: '#84CC16' },
  { from: 75, to: 100, color: '#16A34A' },
];

function arc(cx: number, cy: number, r: number, from: number, to: number): string {
  const a0 = gaugeAngle(from);
  const a1 = gaugeAngle(to);
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy - r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy - r * Math.sin(a1);
  return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
}

/** Хагас тойргийн SVG (утга/шошгогүй) — инфографикт өөрийн өнгөөр. */
export function GaugeArc({ value, size, ink, label }: { value: number; size: number; ink: string; label: string }) {
  const h = size / 2 + 14;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 14;
  const a = gaugeAngle(value);
  return (
    <View role="img" aria-label={`${label}: ${value}`}>
      <Svg width={size} height={h}>
        {BANDS.map((b) => (
          <Path key={b.from} d={arc(cx, cy, r, b.from + 0.6, b.to - 0.6)} stroke={b.color} strokeWidth={size / 16} fill="none" />
        ))}
        <Line
          x1={cx}
          y1={cy}
          x2={cx + (r - 14) * Math.cos(a)}
          y2={cy - (r - 14) * Math.sin(a)}
          stroke={ink}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <Circle cx={cx} cy={cy} r={5} fill={ink} />
      </Svg>
    </View>
  );
}

/** Айдас ба шунахайн индексийн хагас тойрог хэмжигч. */
export function Gauge({ value, label, size = 220 }: { value: number; label: string; size?: number }) {
  const { c } = useTheme();
  const h = size / 2 + 14;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 14;
  const a = gaugeAngle(value);
  const nx = cx + (r - 18) * Math.cos(a);
  const ny = cy - (r - 18) * Math.sin(a);

  return (
    <View style={{ alignItems: 'center', gap: space.xs }}>
      <View role="img" aria-label={`${label}: ${value}`}>
        <Svg width={size} height={h}>
          {BANDS.map((b) => (
            <Path
              key={b.from}
              d={arc(cx, cy, r, b.from + 0.6, b.to - 0.6)}
              stroke={b.color}
              strokeWidth={14}
              fill="none"
            />
          ))}
          <Line x1={cx} y1={cy} x2={nx} y2={ny} stroke={c.text} strokeWidth={3} strokeLinecap="round" />
          <Circle cx={cx} cy={cy} r={6} fill={c.text} />
        </Svg>
      </View>
      <T v="kpi" num style={{ marginTop: -space.sm }}>
        {value}
      </T>
      <T v="smallStrong" color="textMuted">
        {label}
      </T>
    </View>
  );
}
