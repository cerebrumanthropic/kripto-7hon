// Alternative.me Fear & Greed (SPEC §5.3). Иш татах тэмдэглэгээ виджетийн яг доор (UI).
import { z } from 'zod';

import { fearGreedMn } from '../../src/lib/i18n-mn';
import { getJson, type HttpOptions } from '../lib/http';

export const FngSchema = z.looseObject({
  data: z
    .array(
      z.looseObject({
        value: z.coerce.number().int().min(0).max(100),
        value_classification: z.string(),
        timestamp: z.coerce.number(),
      }),
    )
    .min(1),
});

export type FearGreed = {
  value: number;
  labelEn: string;
  labelMn: string;
  timestamp: string;
  history: Array<{ date: string; value: number }>;
};

/** API шинээс хуучин руу буцаана → history-г хуучнаас шинэ рүү, сүүлийн `days` өдөр. */
export function parseFearGreed(raw: unknown, days = 30): FearGreed {
  const data = FngSchema.parse(raw).data;
  const latest = data[0];
  const history = data
    .map((d) => ({ date: new Date(d.timestamp * 1000).toISOString().slice(0, 10), value: d.value }))
    .reverse()
    .slice(-days);
  return {
    value: latest.value,
    labelEn: latest.value_classification,
    labelMn: fearGreedMn(latest.value_classification),
    timestamp: new Date(latest.timestamp * 1000).toISOString(),
    history,
  };
}

export async function fetchFearGreed(limit = 31, http: HttpOptions = {}) {
  return parseFearGreed(await getJson(`https://api.alternative.me/fng/?limit=${limit}`, http));
}
