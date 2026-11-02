import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { dataAttrs } from '@/components/ui/primitives';
import { glass, inkBand } from '@/theme/tokens';
import { ThemeScope } from '@/theme/use-theme';

/**
 * Бүтэн өргөнтэй тууз (толгой, hero, хөл). Дотор нь `useTheme` → `glass` палитр (PROGRESS D75).
 * `pattern` (hero) — тунгалаг, body-ийн гэрэлтэх дэвсгэр харагдана; бусад нь blur-тэй шил (`[data-glass]`).
 * Хэвлэхэд цагаан болно (`+html.tsx`, `[data-band]`).
 */
export function Band({
  children,
  pattern,
  role,
  style,
}: {
  children: ReactNode;
  pattern?: boolean;
  role?: 'banner' | 'contentinfo';
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <ThemeScope colors={glass}>
      <View
        role={role}
        {...dataAttrs(pattern ? { band: '' } : { band: '', glass: '' })}
        style={[{ backgroundColor: pattern ? 'transparent' : inkBand.color }, style]}>
        {children}
      </View>
    </ThemeScope>
  );
}
