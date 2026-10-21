// Дизайны токенууд (SPEC §9, PROGRESS D12).
// Чиглэл: «санхүүгийн сонины ledger» — цаасан дэвсгэр, бэх хар текст, Монгол хөх брэнд,
// сойомбын алтан өнгө зөвхөн долоо хоногийн шошго ба онцлох тэмдэгт. Сүүдэр бараг үгүй, 1px шугам.
import { Platform } from 'react-native';

export const palette = {
  // SPEC §9 — график, bar, тэмдэгт
  positive: '#16A34A',
  negative: '#DC2626',
  neutral: '#64748B',
  btc: '#F7931A',
  eth: '#627EEA',
  stable: '#26A17B',
} as const;

export type ThemeColors = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  brand: string;
  brandText: string;
  onBrand: string;
  accent: string;
  /** Жижиг текстэд WCAG AA хангах эерэг/сөрөг өнгө (#16A34A цагаан дээр 3.3:1 тул) */
  positiveText: string;
  negativeText: string;
  neutralText: string;
  warnBg: string;
  warnText: string;
  infoBg: string;
  infoText: string;
  heatUp: string;
  heatDown: string;
} & typeof palette;

export const light: ThemeColors = {
  ...palette,
  bg: '#F6F4EF',
  surface: '#FFFFFF',
  surfaceAlt: '#EFEBE3',
  border: '#E3DED4',
  borderStrong: '#C9C2B4',
  text: '#14161B',
  textMuted: '#555B68',
  brand: '#2457C5',
  brandText: '#1D47A3',
  onBrand: '#FFFFFF',
  accent: '#A8741F',
  positiveText: '#15803D',
  negativeText: '#B91C1C',
  neutralText: '#475569',
  warnBg: '#FEF3C7',
  warnText: '#7C4A03',
  infoBg: '#E7E5E0',
  infoText: '#3F444F',
  heatUp: '#15803D',
  heatDown: '#B91C1C',
};

export const dark: ThemeColors = {
  ...palette,
  bg: '#0B1220',
  surface: '#111A2E',
  surfaceAlt: '#172239',
  border: '#24314D',
  borderStrong: '#34446A',
  text: '#E8ECF4',
  textMuted: '#A0ABC0',
  brand: '#5B8CFF',
  brandText: '#93B4FF',
  onBrand: '#0B1220',
  accent: '#E0B25A',
  positiveText: '#4ADE80',
  negativeText: '#F87171',
  neutralText: '#A0ABC0',
  warnBg: '#3A2A08',
  warnText: '#FCD68A',
  infoBg: '#1E2840',
  infoText: '#C5CEE0',
  heatUp: '#15803D',
  heatDown: '#B91C1C',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 4, md: 8, lg: 12, pill: 999 } as const;
export const maxWidth = 1200;
export const breakpoints = { tablet: 600, desktop: 1024 } as const;

const webStack = (face: string) =>
  `"${face}", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

/** Inter 400/500/600/700 (`@expo-google-fonts/inter`). Вэбд fallback stack-тай. */
export const fonts = {
  regular: Platform.select({ web: webStack('Inter_400Regular'), default: 'Inter_400Regular' }),
  medium: Platform.select({ web: webStack('Inter_500Medium'), default: 'Inter_500Medium' }),
  semibold: Platform.select({ web: webStack('Inter_600SemiBold'), default: 'Inter_600SemiBold' }),
  bold: Platform.select({ web: webStack('Inter_700Bold'), default: 'Inter_700Bold' }),
} as const;

export const type = {
  display: { fontFamily: fonts.bold, fontSize: 40, lineHeight: 46, letterSpacing: -0.8 },
  h1: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.5 },
  h2: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  h3: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 24 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 25 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 25 },
  small: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  smallStrong: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  kpi: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 32, letterSpacing: -0.5 },
} as const;

export type TypeVariant = keyof typeof type;
