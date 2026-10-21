import { View } from 'react-native';

import { T } from '@/components/ui/primitives';
import { pct } from '@/lib/format';
import { radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Хэвтээ bar (өсөлт/бууралт). Урт нь |утга| / max. */
export function BarList({
  items,
  label,
}: {
  items: Array<{ key: string; label: string; sub?: string; value: number }>;
  label: string;
}) {
  const { c } = useTheme();
  const max = Math.max(1, ...items.map((i) => Math.abs(i.value)));
  return (
    <View style={{ gap: space.sm }} role="list" aria-label={label}>
      {items.map((i) => {
        const up = i.value >= 0;
        return (
          <View key={i.key} role="listitem" style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
              <T v="smallStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
                {i.label}
                {i.sub ? (
                  <T v="small" color="textMuted">
                    {'  '}
                    {i.sub}
                  </T>
                ) : null}
              </T>
              <T v="smallStrong" num color={up ? 'positiveText' : 'negativeText'}>
                {up ? '▲' : '▼'} {pct(i.value)}
              </T>
            </View>
            <View style={{ height: 8, backgroundColor: c.surfaceAlt, borderRadius: radius.sm }}>
              <View
                style={{
                  height: 8,
                  width: `${(Math.abs(i.value) / max) * 100}%`,
                  backgroundColor: up ? c.positive : c.negative,
                  borderRadius: radius.sm,
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}
