import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from 'react';
import { useColorScheme, useWindowDimensions } from 'react-native';

import { breakpoints, dark, light, type ThemeColors } from './tokens';

/**
 * Статик HTML нь сервер дээр цайвар горим ба мобайл өргөнөөр үүснэ.
 * Hydration-ий дараа л бодит утгыг ашиглана (hydration mismatch-ээс сэргийлж).
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

const Forced = createContext<ThemeColors | null>(null);

/** Дотор нь `useTheme` заасан палитрыг буцаана (бараан хөх тууз — `ink`). SSR ба клиентэд ижил. */
export function ThemeScope({ colors, children }: { colors: ThemeColors; children: ReactNode }) {
  return createElement(Forced.Provider, { value: colors }, children);
}

export function useTheme(): { c: ThemeColors; scheme: 'light' | 'dark' } {
  const forced = useContext(Forced);
  const hydrated = useHydrated();
  const scheme = useColorScheme();
  if (forced) return { c: forced, scheme: 'dark' };
  const isDark = hydrated && scheme === 'dark';
  return { c: isDark ? dark : light, scheme: isDark ? 'dark' : 'light' };
}

export type Layout = {
  width: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  /** <600: 1, 600–1023: 2, ≥1024: 4 (SPEC §9) */
  cols: 1 | 2 | 4;
};

export function useLayout(): Layout {
  const hydrated = useHydrated();
  const { width: w } = useWindowDimensions();
  const width = hydrated ? w : 360;
  const isDesktop = width >= breakpoints.desktop;
  const isTablet = !isDesktop && width >= breakpoints.tablet;
  return {
    width,
    isMobile: !isDesktop && !isTablet,
    isTablet,
    isDesktop,
    cols: isDesktop ? 4 : isTablet ? 2 : 1,
  };
}
