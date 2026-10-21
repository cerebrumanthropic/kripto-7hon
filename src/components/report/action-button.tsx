import { Pressable } from 'react-native';

import { T, webPress } from '@/components/ui/primitives';
import { radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export function ActionButton({
  label,
  onPress,
  disabled,
  primary,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      role="button"
      aria-disabled={disabled}
      style={(s) => {
        const { hovered, focused } = webPress(s);
        return {
          paddingVertical: space.sm,
          paddingHorizontal: space.lg,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: primary ? c.brand : c.borderStrong,
          backgroundColor: primary ? c.brand : hovered ? c.surfaceAlt : c.surface,
          opacity: disabled ? 0.6 : 1,
          outlineColor: c.brand,
          outlineWidth: focused ? 2 : 0,
          outlineStyle: 'solid',
        };
      }}>
      <T v="smallStrong" color={primary ? 'onBrand' : 'text'}>
        {label}
      </T>
    </Pressable>
  );
}
