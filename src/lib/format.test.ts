import { describe, expect, it } from 'vitest';

import { arrow, direction, groupDigits, int, mnt, mntCompact, pct, pctPlain, price, usdCompact } from './format';

describe('usdCompact', () => {
  it('SPEC §9-ийн жишээнүүд', () => {
    expect(usdCompact(2.45e12)).toBe('$2.45 их наяд');
    expect(usdCompact(9.53e10)).toBe('$95.3 тэрбум');
    expect(usdCompact(1.2e9)).toBe('$1.20 тэрбум');
    expect(usdCompact(3.4e8)).toBe('$340 сая');
    expect(usdCompact(123456)).toBe('$123,456');
  });
  it('сөрөг утга U+2212-оор', () => {
    expect(usdCompact(-1.47e9)).toBe('−$1.47 тэрбум');
  });
  it('нэгжийн хил дээр дараагийн нэгж рүү шилжинэ', () => {
    expect(usdCompact(999.7e9)).toBe('$1.00 их наяд');
  });
  it('null → —', () => {
    expect(usdCompact(null)).toBe('—');
    expect(usdCompact(Number.NaN)).toBe('—');
  });
});

describe('mntCompact', () => {
  it('SPEC жишээ', () => {
    expect(mntCompact(2.451e11)).toBe('245.1 тэрбум ₮');
    expect(mntCompact(3.2e6)).toBe('3.2 сая ₮');
    expect(mntCompact(1234)).toBe('1,234 ₮');
  });
});

describe('price', () => {
  it('SPEC жишээ', () => {
    expect(price(68450)).toBe('$68,450');
    expect(price(2.4712)).toBe('$2.47');
    expect(price(0.12341)).toBe('$0.1234');
  });
  it('маш бага үнэ 4 чухал оронтой', () => {
    expect(price(0.00001234)).toBe('$0.00001234');
  });
});

describe('mnt', () => {
  it('төгрөг', () => {
    expect(mnt(233512345.6)).toBe('233,512,346 ₮');
  });
});

describe('pct', () => {
  it('SPEC жишээ', () => {
    expect(pct(4.234)).toBe('+4.2%');
    expect(pct(-3.1)).toBe('−3.1%');
  });
  it('тэг ба тэгрүү бөөрөнхийлөгдөх утга тэмдэггүй', () => {
    expect(pct(0)).toBe('0.0%');
    expect(pct(-0.04)).toBe('0.0%');
  });
  it('мянгатын таслал', () => {
    expect(pct(1234.5)).toBe('+1,234.5%');
  });
  it('pctPlain', () => {
    expect(pctPlain(57.84)).toBe('57.8%');
  });
});

describe('туслах', () => {
  it('groupDigits', () => {
    expect(groupDigits(1234567.891, 2)).toBe('1,234,567.89');
  });
  it('int', () => {
    expect(int(-12345.6)).toBe('−12,346');
  });
  it('direction ба arrow', () => {
    expect(direction(0.04)).toBe('flat');
    expect(direction(0.2)).toBe('up');
    expect(arrow(-1)).toBe('▼');
    expect(arrow(null)).toBe('■');
  });
});
