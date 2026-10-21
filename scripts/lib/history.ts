// Өдрийн түүх (SPEC §7.1). Цэг = UTC өдрийн хаалтад ойр утга.
// Шинэ UTC өдрийн анхны амжилттай ажиллалт одоогийн утгыг ӨМНӨХ өдрийн цэг болгон бичнэ.
// 06:00 UTC хүртэл тэр цэгийн null талбарыг (эх сурвалж түр унасан бол) нөхөж болно.
import type { DailyHistory, DailyPoint } from '../../src/types/schemas';

export type DailyValues = Omit<DailyPoint, 'date' | 'provisional'>;

const DAY_MS = 86_400_000;
export const dayOf = (d: Date) => d.toISOString().slice(0, 10);

const FILL_UNTIL_HOUR_UTC = 6;
const MAX_POINTS = 3650;

export const emptyHistory = (): DailyHistory => ({ schemaVersion: 1, points: [] });

/** provisional цэгүүдийг хасна (Pages-ээс ачаалсан үед). */
export function finalized(h: DailyHistory): DailyHistory {
  return { schemaVersion: 1, points: h.points.filter((p) => !p.provisional) };
}

const sortPoints = (points: DailyPoint[]) => [...points].sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_POINTS);

export function applyDailyClose(
  history: DailyHistory,
  values: DailyValues,
  now: Date,
): { history: DailyHistory; changed: boolean } {
  const base = finalized(history).points;
  const yesterday = dayOf(new Date(now.getTime() - DAY_MS));
  const i = base.findIndex((p) => p.date === yesterday);

  if (i === -1) {
    return { history: { schemaVersion: 1, points: sortPoints([...base, { date: yesterday, ...values }]) }, changed: true };
  }

  if (now.getUTCHours() >= FILL_UNTIL_HOUR_UTC) return { history: { schemaVersion: 1, points: base }, changed: false };

  const existing = base[i];
  let changed = false;
  const filled: DailyPoint = { ...existing };
  for (const k of Object.keys(values) as Array<keyof DailyValues>) {
    if (filled[k] === null && values[k] !== null) {
      filled[k] = values[k];
      changed = true;
    }
  }
  if (!changed) return { history: { schemaVersion: 1, points: base }, changed: false };
  const points = [...base];
  points[i] = filled;
  return { history: { schemaVersion: 1, points }, changed: true };
}

/** Pages-ийн хувилбарт өнөөдрийн явцын утгыг provisional цэгээр нэмнэ (store-д хадгалахгүй). */
export function withProvisional(history: DailyHistory, values: DailyValues, now: Date): DailyHistory {
  const today = dayOf(now);
  const points = history.points.filter((p) => p.date !== today);
  return { schemaVersion: 1, points: [...points, { date: today, ...values, provisional: true }] };
}
