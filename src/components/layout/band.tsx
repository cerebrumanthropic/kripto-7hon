import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { dataAttrs } from '@/components/ui/primitives';
import { ink, inkBand } from '@/theme/tokens';
import { ThemeScope } from '@/theme/use-theme';

/**
 * Бүтэн өргөнтэй бараан хөх тууз (толгой, hero, хөл). Дотор нь `useTheme` → `ink` палитр.
 * `pattern` — туяа ба тортой дэвсгэр (hero). Хэвлэхэд цагаан болно (`+html.tsx`, `[data-band]`).
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
    <ThemeScope colors={ink}>
      <View
        role={role}
        {...dataAttrs({ band: '' })}
        style={[{ backgroundColor: inkBand.color }, pattern && { backgroundImage: inkBand.image }, style]}>
        {children}
      </View>
    </ThemeScope>
  );
}
