import { View } from 'react-native';

import { T } from '@/components/ui/primitives';
import { pct } from '@/lib/format';
import { radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { heatIntensity } from './scale';

/** Өнгөний ил тод байдлыг 60%-иас хэтрүүлэхгүй — текст үргэлж үндсэн өнгөөрөө уншигдана (AA). */
function tint(hex: string, intensity: number): string {
  const a = Math.round((0.12 + 0.48 * intensity) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

/** Топ 20-ийн 7 хоногийн өөрчлөлтийн дулааны зураг. */
export function Heatmap({
  items,
  label,
  columns = 5,
}: {
  items: Array<{ symbol: string; change: number }>;
  label: string;
  columns?: number;
}) {
  const { c } = useTheme();
  return (
    <View role="list" aria-label={label} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {items.map((i) => (
        <View
          key={i.symbol}
          role="listitem"
          style={{
            flexBasis: `${100 / columns - 2}%`,
            flexGrow: 1,
            minHeight: 64,
            borderRadius: radius.md,
            padding: space.sm,
            justifyContent: 'space-between',
            backgroundColor: tint(i.change >= 0 ? c.heatUp : c.heatDown, heatIntensity(i.change)),
          }}>
          <T v="smallStrong">{i.symbol}</T>
          <T v="caption" num style={{ fontWeight: '600' }}>
            {i.change >= 0 ? '▲' : '▼'} {pct(i.change)}
          </T>
        </View>
      ))}
    </View>
  );
}
