// open.er-api.com (SPEC §5.4). Лавлах ханш — Монголбанкны албан ханш биш.
// Иш татах: «Rates By Exchange Rate API» (UI).
import { z } from 'zod';

import { getJson, type HttpOptions } from '../lib/http';

export const ErApiSchema = z.looseObject({
  result: z.literal('success'),
  time_last_update_unix: z.number(),
  rates: z.looseObject({ MNT: z.number().positive() }),
});

export type Fx = { usdMnt: number; source: 'exchangerate-api'; asOf: string };

export function parseFx(raw: unknown): Fx {
  const d = ErApiSchema.parse(raw);
  return {
    usdMnt: d.rates.MNT,
    source: 'exchangerate-api',
    asOf: new Date(d.time_last_update_unix * 1000).toISOString(),
  };
}

export async function fetchFx(http: HttpOptions = {}) {
  return parseFx(await getJson('https://open.er-api.com/v6/latest/USD', http));
}
