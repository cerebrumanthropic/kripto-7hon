import { describe, expect, it } from 'vitest';

import { sourceName, staleSources } from './source-status';

describe('source-status', () => {
  it('нэр', () => {
    expect(sourceName('feargreed')).toBe('Alternative.me');
    expect(sourceName('unknown-x')).toBe('unknown-x');
  });

  it('зөвхөн stale эх сурвалж', () => {
    const r = staleSources([
      { id: 'coingecko', ok: true, fetchedAt: '2026-10-21T05:00:00Z' },
      { id: 'feargreed', ok: false, stale: true, fetchedAt: '2026-10-21T04:00:00Z', error: 'timeout' },
      { id: 'fx', ok: false, fetchedAt: '2026-10-21T05:00:00Z', error: 'x' },
    ]);
    expect(r).toEqual([{ id: 'feargreed', name: 'Alternative.me', fetchedAt: '2026-10-21T04:00:00Z' }]);
  });
});
