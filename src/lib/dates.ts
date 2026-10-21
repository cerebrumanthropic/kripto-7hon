// Огноо ба ISO долоо хоног (SPEC §9, PROGRESS D10).
// Asia/Ulaanbaatar нь 2017 оноос хойш зуны цаггүй, тогтмол UTC+8 тул Intl-ийн
// цагийн бүсийн өгөгдөлд найдахгүйгээр офсетоор тооцно.

const UB_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, '0');

function toDate(input: string | Date): Date {
  return input instanceof Date ? input : new Date(input);
}

/** UTC+8-д шилжүүлсэн Date (getUTC* аргуудаар уншина). */
function ub(input: string | Date): Date {
  return new Date(toDate(input).getTime() + UB_OFFSET_MS);
}

/** «2026.10.21» (УБ цагаар) */
export function formatDate(input: string | Date): string {
  const d = ub(input);
  return `${d.getUTCFullYear()}.${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())}`;
}

/** «2026.10.21 14:07 (УБ)» */
export function formatDateTime(input: string | Date): string {
  const d = ub(input);
  return `${formatDate(input)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} (УБ)`;
}

/** «2026-10-25» хэлбэрийн өдрийг «2026.10.25» болгоно (цагийн бүсгүй). */
export function formatDay(day: string): string {
  return day.replaceAll('-', '.');
}

/** «10.19» */
function monthDay(day: string): string {
  const [, m, d] = day.split('-');
  return `${m}.${d}`;
}

export type IsoWeek = { year: number; week: number };

/** UTC огнооны ISO 8601 долоо хоног. */
export function isoWeekOf(input: string | Date): IsoWeek {
  const d = toDate(input);
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7; // Даваа=1 … Ням=7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum); // тухайн 7 хоногийн Пүрэв
  const year = date.getUTCFullYear();
  const yearStart = Date.UTC(year, 0, 1);
  const week = Math.ceil(((date.getTime() - yearStart) / DAY_MS + 1) / 7);
  return { year, week };
}

/** «2026-W43» */
export function isoWeek(input: string | Date): string {
  const { year, week } = isoWeekOf(input);
  return `${year}-W${pad(week)}`;
}

export function parseWeek(id: string): IsoWeek {
  const m = /^(\d{4})-W(\d{2})$/.exec(id);
  if (!m) throw new Error(`Буруу долоо хоногийн дугаар: ${id}`);
  const year = Number(m[1]);
  const week = Number(m[2]);
  if (week < 1 || week > 53) throw new Error(`Буруу долоо хоногийн дугаар: ${id}`);
  return { year, week };
}

const isoDay = (d: Date) =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

/** 2026-W43 → { start: "2026-10-19", end: "2026-10-25", cutoffUtc: "2026-10-25T23:59:59Z" } */
export function weekRange(id: string): { start: string; end: string; cutoffUtc: string } {
  const { year, week } = parseWeek(id);
  // 1-р сарын 4 үргэлж 1 дүгээр 7 хоногт байдаг
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const monday = new Date(jan4.getTime() - ((jan4.getUTCDay() || 7) - 1) * DAY_MS);
  const start = new Date(monday.getTime() + (week - 1) * 7 * DAY_MS);
  const end = new Date(start.getTime() + 6 * DAY_MS);
  return { start: isoDay(start), end: isoDay(end), cutoffUtc: `${isoDay(end)}T23:59:59Z` };
}

/**
 * Монгол дэс тооны нөхцөл: 43 → «дугаар», 41 → «дүгээр».
 * Сүүлийн оронгүй бол аравтын нэрээр (40 дөч → дүгээр), үгүй бол нэгжийн нэрээр (1 нэг, 4 дөрөв, 9 ес → дүгээр).
 */
export function ordinalSuffix(n: number): string {
  const ones = n % 10;
  if (ones === 0) {
    const tens = Math.floor(n / 10) % 10;
    return tens === 4 ? 'дүгээр' : 'дугаар';
  }
  return ones === 1 || ones === 4 || ones === 9 ? 'дүгээр' : 'дугаар';
}

/** «2026 оны 43 дугаар долоо хоног (10.19–10.25)» */
export function weekLabel(id: string): string {
  const { year, week } = parseWeek(id);
  const { start, end } = weekRange(id);
  return `${year} оны ${week} ${ordinalSuffix(week)} долоо хоног (${monthDay(start)}–${monthDay(end)})`;
}

/** «2026 · 43 дугаар 7 хоног» — инфографикийн толгой */
export function weekShortLabel(id: string): string {
  const { year, week } = parseWeek(id);
  return `${year} · ${week} ${ordinalSuffix(week)} 7 хоног`;
}

/** «2 цагийн өмнө» */
export function relativeTime(input: string | Date, now: Date = new Date()): string {
  const diff = Math.max(0, now.getTime() - toDate(input).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'саяхан';
  if (min < 60) return `${min} минутын өмнө`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} цагийн өмнө`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} өдрийн өмнө`;
  return formatDate(input);
}

/** `updatedAt` нь `maxHours`-аас хуучин эсэх (SPEC §8: 3 цаг). */
export function isStale(updatedAt: string, now: Date = new Date(), maxHours = 3): boolean {
  return now.getTime() - toDate(updatedAt).getTime() > maxHours * 60 * 60 * 1000;
}
