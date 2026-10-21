import { createContext, createElement, useContext, useSyncExternalStore, type ReactNode } from 'react';
import { Appearance, Dimensions } from 'react-native';

import { breakpoints, dark, light, type ThemeColors } from './tokens';

/*
 * Статик HTML нь сервер дээр цайвар горим ба мобайл өргөнөөр үүснэ. `useSyncExternalStore`-ийн server
 * snapshot нь hydration-д тэр утгыг өгч (mismatch-гүй), клиентийн утга өөр үед л дахин render хийнэ
 * (PROGRESS D58). Hydration-ий дараах шинэ mount (клиент навигаци) шууд бодит утгаар зурагдана.
 */

const noopSubscribe = () => () => {};

/** SSR ба hydration үед false, дараа нь true. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

type Scheme = 'light' | 'dark';
const subscribeScheme = (cb: () => void) => {
  const s = Appearance.addChangeListener(cb);
  return () => s.remove();
};
const getScheme = (): Scheme => (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light');

const Forced = createContext<ThemeColors | null>(null);

/** Дотор нь `useTheme` заасан палитрыг буцаана (бараан хөх тууз — `ink`). SSR ба клиентэд ижил. */
export function ThemeScope({ colors, children }: { colors: ThemeColors; children: ReactNode }) {
  return createElement(Forced.Provider, { value: colors }, children);
}

export function useTheme(): { c: ThemeColors; scheme: Scheme } {
  const forced = useContext(Forced);
  const scheme = useSyncExternalStore(subscribeScheme, getScheme, () => 'light' as const);
  if (forced) return { c: forced, scheme: 'dark' };
  return { c: scheme === 'dark' ? dark : light, scheme };
}

export type Layout = {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  /** <600: 1, 600–1023: 2, ≥1024: 4 (SPEC §9) */
  cols: 1 | 2 | 4;
};

type Breakpoint = 'mobile' | 'tablet' | 'desktop';
const subscribeWidth = (cb: () => void) => {
  const s = Dimensions.addEventListener('change', cb);
  return () => s.remove();
};
// Өргөн биш breakpoint-ийг snapshot болгоно — 360 ба 412 px ялгаагүй тул дахин render хийхгүй
const getBreakpoint = (): Breakpoint => {
  const w = Dimensions.get('window').width;
  return w >= breakpoints.desktop ? 'desktop' : w >= breakpoints.tablet ? 'tablet' : 'mobile';
};

export function useLayout(): Layout {
  const bp = useSyncExternalStore(subscribeWidth, getBreakpoint, () => 'mobile' as const);
  return {
    isMobile: bp === 'mobile',
    isTablet: bp === 'tablet',
    isDesktop: bp === 'desktop',
    cols: bp === 'desktop' ? 4 : bp === 'tablet' ? 2 : 1,
  };
}
