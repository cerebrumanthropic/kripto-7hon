// Дизайны токенууд (SPEC §9, PROGRESS D12).
// Чиглэл: «санхүүгийн сонины ledger» — цаасан дэвсгэр, бэх хар текст, Монгол хөх брэнд,
// сойомбын алтан өнгө зөвхөн долоо хоногийн шошго ба онцлох тэмдэгт. Сүүдэр бараг үгүй, 1px шугам.
// Толгой, hero, хөл нь бараан хөх тууз (`ink`) — анхаарал татах хүрээ (PROGRESS D54).
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
  /** ▲▼ pill (KPI карт): дэвсгэр ба AA хангах текст */
  upBg: string;
  upFg: string;
  downBg: string;
  downFg: string;
  /** Картын сүүдэр (CSS box-shadow) */
  shadow: string;
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
  // #A8741F нь цаасан дэвсгэр дээр 3.7:1 байсан (Lighthouse) → AA (≥4.5) хангах бараан алт
  accent: '#8A5D12',
  positiveText: '#15803D',
  negativeText: '#B91C1C',
  neutralText: '#475569',
  warnBg: '#FEF3C7',
  warnText: '#7C4A03',
  infoBg: '#E7E5E0',
  infoText: '#3F444F',
  heatUp: '#15803D',
  heatDown: '#B91C1C',
  upBg: 'rgba(22,163,74,0.10)',
  upFg: '#166534',
  downBg: 'rgba(220,38,38,0.09)',
  downFg: '#991B1B',
  shadow: '0 1px 2px rgba(20,22,27,0.05), 0 6px 20px rgba(20,22,27,0.06)',
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
  upBg: 'rgba(74,222,128,0.14)',
  upFg: '#86EFAC',
  downBg: 'rgba(248,113,113,0.14)',
  downFg: '#FCA5A5',
  shadow: 'none',
};

/**
 * Бараан хөх тууз (толгой, hero, хөл) — сайтын горимоос үл хамаарна (PROGRESS D54).
 * Карт нь тунгалаг цагаан давхарга; текстийн тодрол туузны хамгийн цайвар хэсэгт ч ≥4.5:1.
 */
export const ink: ThemeColors = {
  ...dark,
  bg: '#0B1A3D',
  surface: 'rgba(255,255,255,0.06)',
  surfaceAlt: 'rgba(255,255,255,0.10)',
  border: 'rgba(255,255,255,0.12)',
  borderStrong: 'rgba(255,255,255,0.30)',
  text: '#F4F6FB',
  textMuted: '#B6C2DA',
  brand: '#7FA6FF',
  brandText: '#A9C4FF',
  onBrand: '#0B1A3D',
  accent: '#F2C46B',
};

/**
 * Туузны дэвсгэр: хөх/алтан туяа (зөвхөн вэб CSS). Торон `repeating-linear-gradient` нь анхны
 * frame-ийг ≈60ms удаашруулж Lighthouse FCP-г унагасан тул хассан (PROGRESS D57).
 */
export const inkBand = {
  color: ink.bg,
  image: [
    'radial-gradient(900px 420px at 88% -12%, rgba(91,140,255,0.26), transparent 62%)',
    'radial-gradient(700px 320px at -8% 112%, rgba(242,196,107,0.12), transparent 60%)',
    'linear-gradient(180deg, #0B1A3D 0%, #0F2453 100%)',
  ].join(', '),
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 4, md: 8, lg: 12, pill: 999 } as const;
export const maxWidth = 1200;
export const breakpoints = { tablet: 600, desktop: 1024 } as const;

/**
 * Helvetica (хэрэглэгчийн шийдвэр, PROGRESS D69). Helvetica нь арилжааны фонт тул сайтад суулгахгүй —
 * төхөөрөмжийн фонтыг stack-аар: Apple → Helvetica Neue / Helvetica, Windows/Android → Arial (Helvetica-тай
 * ижил хэмжээстэй). Arial ба Segoe UI-д Ө ө Ү ү бий. Вэб фонт татахгүй тул хуудас хөнгөн.
 */
const HELVETICA = Platform.select({
  web: '"Helvetica Neue", Helvetica, Arial, "Segoe UI", system-ui, sans-serif',
  default: 'System',
}) as string;

export const weights = { regular: '400', medium: '500', semibold: '600', bold: '700', extrabold: '800' } as const;
export type FontWeightName = keyof typeof weights;

/** fontFamily + fontWeight (нэг family, жинг fontWeight-ээр). */
export const font = (w: FontWeightName) => ({ fontFamily: HELVETICA, fontWeight: weights[w] });

/** Хуучин түлхүүрүүд (SVG текст г.м. зөвхөн family хэрэгтэй газарт). */
export const fonts = { regular: HELVETICA } as const;

export const type = {
  heroLg: { ...font('bold'), fontSize: 54, lineHeight: 60, letterSpacing: -1.2 },
  hero: { ...font('bold'), fontSize: 34, lineHeight: 40, letterSpacing: -0.6 },
  display: { ...font('bold'), fontSize: 40, lineHeight: 46, letterSpacing: -0.6 },
  h1: { ...font('bold'), fontSize: 30, lineHeight: 36, letterSpacing: -0.4 },
  h2: { ...font('bold'), fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  h3: { ...font('bold'), fontSize: 17, lineHeight: 24 },
  lead: { ...font('regular'), fontSize: 18, lineHeight: 28 },
  body: { ...font('regular'), fontSize: 16, lineHeight: 25 },
  bodyStrong: { ...font('bold'), fontSize: 16, lineHeight: 25 },
  small: { ...font('regular'), fontSize: 14, lineHeight: 20 },
  smallStrong: { ...font('bold'), fontSize: 14, lineHeight: 20 },
  caption: { ...font('regular'), fontSize: 12, lineHeight: 17 },
  label: {
    ...font('bold'),
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  kpi: { ...font('bold'), fontSize: 26, lineHeight: 32, letterSpacing: -0.5 },
} as const;

export type TypeVariant = keyof typeof type;
