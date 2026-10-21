// Нийтийн (нууц биш) тохиргоо. Build үед EXPO_PUBLIC_* хувьсагчаас орно (SPEC §11).
// Нууц түлхүүрийг ХЭЗЭЭ Ч энд эсвэл EXPO_PUBLIC_ угтвартай хувьсагчид бүү оруул.

const trimSlash = (s: string) => s.replace(/\/+$/, '');

/** GitHub Pages дээрх амьд датаны үндэс, жишээ нь https://<user>.github.io/<repo>. Хоосон бол зөвхөн fallback. */
export const DATA_BASE_URL = trimSlash(process.env.EXPO_PUBLIC_DATA_BASE_URL ?? '');

/** Сайтын үндсэн URL (OG, sitemap, «Текст хуулах»). */
export const SITE_URL = trimSlash(
  process.env.EXPO_PUBLIC_SITE_URL ?? 'https://kripto-7hon.expo.app',
);

/** Клиент амьд датаг дахин унших давтамж (SPEC §1). */
export const LIVE_REFETCH_MS = 10 * 60 * 1000;

/** Fetch-ийн хугацааны хязгаар (клиент). */
export const FETCH_TIMEOUT_MS = 8000;
