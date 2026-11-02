import { describe, expect, it } from 'vitest';

import { sentiment, splitBySentiment } from './sentiment';

describe('sentiment', () => {
  it.each([
    ['Bitcoin rallies past $70,000', 'positive'],
    ['Institutions embrace crypto staking despite shrinking yields', 'positive'],
    ['Jupiter Lend’s withdrawal liquidity rebounds from near zero to 29 million USDC', 'positive'],
    ['Binance says 90% of stolen assets replenished, targets Sunday withdrawals', 'neutral'],
    ['FBI blames North Korea for record $6.3B Binance hack', 'negative'],
    ['Bitcoin ETFs lose $643 million in a day, wiping out the week’s inflows', 'negative'],
    ['Texas brothers sentenced to 15 years in prison for armed crypto robbery, kidnapping', 'negative'],
    ['Crypto scammers used SEC’s website to lure investors into alleged $130 million fraud', 'negative'],
    ['The key races to watch for the 2026 election', 'neutral'],
    ['Биткойны ханш өслөө', 'positive'],
    ['Луйврын хэрэгт баривчилжээ', 'negative'],
  ])('%s → %s', (title, expected) => {
    expect(sentiment(title)).toBe(expected);
  });

  it('үгийн дотор таарахгүй (\\b)', () => {
    // «banner», «finest», «bugle» нь сөрөг «ban», «fine», «bug» биш
    expect(sentiment('Exchange unveils new banner at finest bugle show')).toBe('neutral');
  });

  it('бүлэгт хуваахдаа дарааллыг хадгална', () => {
    const items = [{ title: 'Bitcoin surges' }, { title: 'Exchange hacked' }, { title: 'Bitcoin rallies' }, { title: 'Weekly recap' }];
    const s = splitBySentiment(items);
    expect(s.positive.map((x) => x.title)).toEqual(['Bitcoin surges', 'Bitcoin rallies']);
    expect(s.negative.map((x) => x.title)).toEqual(['Exchange hacked']);
    expect(s.neutral.map((x) => x.title)).toEqual(['Weekly recap']);
  });
});
