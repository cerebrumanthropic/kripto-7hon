import { describe, expect, it } from 'vitest';

import { BudgetExceededError, CallBudget } from './budget';

describe('CallBudget', () => {
  it('хязгаар хүртэл зөвшөөрч, дараа нь алдаа', () => {
    const logs: string[] = [];
    const b = new CallBudget('coingecko', 2, (m) => logs.push(m));
    b.use('global');
    b.use('markets');
    expect(() => b.use('trending')).toThrow(BudgetExceededError);
    expect(b.used).toBe(2);
    expect(logs).toEqual(['[budget] coingecko 1/2: global', '[budget] coingecko 2/2: markets']);
  });
});
