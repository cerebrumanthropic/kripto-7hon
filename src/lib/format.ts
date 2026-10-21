// Тоо, валют, хувийн формат (SPEC §9). Мянгатыг таслал, бутархайг цэгээр.
// Intl-д найдахгүй: Node, браузер, Hermes-д ижил үр дүн өгөхийн тулд гараар.

export const MINUS = '−';
export const DASH = '—';

type Num = number | null | undefined;

const isNum = (v: Num): v is number => typeof v === 'number' && Number.isFinite(v);

/** 1234567.891, 2 → "1,234,567.89" (тэмдэггүй). */
export function groupDigits(value: number, decimals = 0): string {
  const [int, frac] = Math.abs(value).toFixed(decimals).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac ? `${grouped}.${frac}` : grouped;
}

const sign = (v: number) => (v < 0 ? MINUS : '');

/** 3 чухал оронтой: 2.45, 95.3, 340, 1.20 */
function threeSig(v: number): string {
  if (v >= 100) return v.toFixed(0);
  if (v >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

const UNITS: Array<[number, string]> = [
  [1e12, 'их наяд'],
  [1e9, 'тэрбум'],
  [1e6, 'сая'],
];

/** usdCompact(2.45e12) → «$2.45 их наяд»; <1e6 → «$123,456» */
export function usdCompact(value: Num): string {
  if (!isNum(value)) return DASH;
  const abs = Math.abs(value);
  for (const [base, unit] of UNITS) {
    if (abs >= base) {
      // 999.6 тэрбум → «1000 тэрбум» болохоос сэргийлж дараагийн нэгж рүү шилжүүлнэ
      const scaled = abs / base;
      const text = threeSig(scaled);
      if (text === '1000' && base < 1e12) return usdCompact(Math.sign(value) * 1000 * base);
      return `${sign(value)}$${text} ${unit}`;
    }
  }
  return `${sign(value)}$${groupDigits(abs)}`;
}

/** mntCompact(2.451e11) → «245.1 тэрбум ₮» */
export function mntCompact(value: Num): string {
  if (!isNum(value)) return DASH;
  const abs = Math.abs(value);
  for (const [base, unit] of UNITS) {
    if (abs >= base) return `${sign(value)}${(abs / base).toFixed(1)} ${unit} ₮`;
  }
  return `${sign(value)}${groupDigits(abs)} ₮`;
}

/** Нэгж үнэ: ≥1000 → «$68,450»; ≥1 → «$2.47»; <1 → 4 чухал оронтой «$0.1234» */
export function price(value: Num): string {
  if (!isNum(value)) return DASH;
  const abs = Math.abs(value);
  let decimals: number;
  if (abs >= 1000) decimals = 0;
  else if (abs >= 1) decimals = 2;
  else if (abs === 0) decimals = 2;
  else decimals = Math.max(4, -Math.floor(Math.log10(abs)) + 3);
  return `${sign(value)}$${groupDigits(abs, decimals)}`;
}

/** Төгрөгийн үнэ: «233,512,000 ₮» (1-ээс бага бол 2 орон) */
export function mnt(value: Num): string {
  if (!isNum(value)) return DASH;
  const abs = Math.abs(value);
  return `${sign(value)}${groupDigits(abs, abs < 1 ? 2 : 0)} ₮`;
}

/** pct(4.234) → «+4.2%»; pct(-3.1) → «−3.1%»; 0 → «0.0%» */
export function pct(value: Num, decimals = 1): string {
  if (!isNum(value)) return DASH;
  const rounded = Number(value.toFixed(decimals));
  if (rounded === 0) return `${(0).toFixed(decimals)}%`;
  return `${rounded > 0 ? '+' : MINUS}${groupDigits(Math.abs(rounded), decimals)}%`;
}

/** Тэмдэггүй хувь (давамгайлал г.м.): «57.8%» */
export function pctPlain(value: Num, decimals = 1): string {
  if (!isNum(value)) return DASH;
  return `${groupDigits(value, decimals)}%`;
}

/** Энгийн тоо: «12,345» */
export function int(value: Num): string {
  if (!isNum(value)) return DASH;
  return `${sign(value)}${groupDigits(Math.round(Math.abs(value)))}`;
}

export type Direction = 'up' | 'down' | 'flat';

/** ±0.05%-иас бага өөрчлөлтийг «flat» гэж үзнэ (SPEC §7.3.5). */
export function direction(value: Num, epsilon = 0.05): Direction {
  if (!isNum(value) || Math.abs(value) < epsilon) return 'flat';
  return value > 0 ? 'up' : 'down';
}

/** ▲ / ▼ / ■ — өнгөөс гадна тэмдгээр чиглэлийг илэрхийлнэ (SPEC §9). */
export function arrow(value: Num): string {
  const d = direction(value);
  return d === 'up' ? '▲' : d === 'down' ? '▼' : '■';
}
