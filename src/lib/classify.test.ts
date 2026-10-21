import { describe, expect, it } from 'vitest';

import { classify, isMongolia } from './classify';

describe('classify', () => {
  it.each([
    ['SEC delays decision on Solana ETF', ['regulation', 'etf']],
    ['EU regulators finalize MiCA guidance', ['regulation']],
    ['Bitcoin ETFs see $1.2B inflows', ['etf']],
    ['DeFi protocol drained of $40M in exploit', ['security', 'defi']],
    ['Fed signals rate cut as CPI cools', ['macro']],
    ['Tether mints another $1B USDT', ['stablecoin']],
    ['Uniswap volume hits record on Base', ['defi']],
    ['Bitcoin hashrate climbs after halving', ['mining']],
    ['Bitcoin rallies past $70,000', ['market']],
  ])('%s', (title, tags) => {
    expect(classify(title)).toEqual(tags);
  });

  it('богино үгс бусад үгийн дотор таарахгүй', () => {
    expect(classify('The impact of a federal banner on secondary markets')).toEqual(['market']);
    expect(classify('Circle K adds bitcoin ATMs')).toEqual(['stablecoin']);
  });

  it('том жижиг үсэг үл хамаарна', () => {
    expect(classify('HACKERS STEAL FUNDS')).toEqual(['security']);
  });

  it('«Bitcoin Treasury» компани нь макро биш, АНУ-ын Treasury нь макро', () => {
    expect(classify('Bitcoin Treasury Strive Debuts New Preferred Stock')).toEqual(['market']);
    expect(classify('What Is Strategy (MSTR)? The Bitcoin Treasury Company')).toEqual(['market']);
    expect(classify('Treasury yields climb as dollar strengthens')).toEqual(['macro']);
  });

  it('монгол гарчиг (кирилл дэд мөр)', () => {
    expect(classify('СЗХ виртуал хөрөнгийн тухай хуулийн төсөл')).toEqual(['regulation']);
    expect(classify('Крипто луйврын хэрэг илэрлээ')).toEqual(['security']);
    expect(classify('Биткойны ханш өслөө')).toEqual(['market']);
  });
});

describe('isMongolia', () => {
  it('гарчиг ба эх сурвалж', () => {
    expect(isMongolia('Mongolian regulator issues VASP licences')).toBe(true);
    expect(isMongolia('Монголбанк ханш зарлалаа')).toBe(true);
    expect(isMongolia('Bitcoin rallies')).toBe(false);
    expect(isMongolia('Bitcoin rallies', true)).toBe(true);
  });
});
