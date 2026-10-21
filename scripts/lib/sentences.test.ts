import { describe, expect, it } from 'vitest';

import {
  dominanceSentence,
  fearGreedSentence,
  pctWords,
  priceSentence,
  stableSentence,
  topGainerSentence,
  totalSentence,
  tvlSentence,
  usdWords,
} from './sentences';

describe('тоо үгээр', () => {
  it('usdWords: нэгж ба тийн ялгал', () => {
    expect(usdWords(2.45e12)).toBe('2.45 их наяд ам.доллар');
    expect(usdWords(3.124e11)).toBe('312.4 тэрбум ам.доллар');
    expect(usdWords(1.182e11)).toBe('118.2 тэрбум ам.доллар');
    expect(usdWords(68450, 'dat')).toBe('68,450 ам.долларт');
    expect(usdWords(2.4712, 'dat')).toBe('2.47 ам.долларт');
    expect(usdWords(4.5e6)).toBe('4.5 сая ам.доллар');
  });
  it('pctWords тэмдэггүй', () => {
    expect(pctWords(-4.234)).toBe('4.2 хувиар');
  });
});

describe('SPEC §7.3.5-ын жишээнүүд', () => {
  it('Биткойн өсөлт/бууралт', () => {
    expect(priceSentence('Биткойн', 'Биткойны', 68450, 4.2)).toBe('Биткойн 7 хоногт 4.2 хувиар өсөж, 68,450 ам.долларт хүрлээ.');
    expect(priceSentence('Биткойн', 'Биткойны', 68450, -4.2)).toBe('Биткойн 7 хоногт 4.2 хувиар буурч, 68,450 ам.долларт хүрлээ.');
  });
  it('0.05%-иас бага → бараг өөрчлөгдөөгүй', () => {
    expect(priceSentence('Биткойн', 'Биткойны', 68450, 0.04)).toBe('Биткойны ханш 7 хоногт бараг өөрчлөгдөөгүй, 68,450 ам.доллар байна.');
    expect(totalSentence(2.45e12, -0.01, false)).toBe(
      'Криптогийн нийт зах зээлийн үнэлгээ 2.45 их наяд ам.доллар болж, 7 хоногт бараг өөрчлөгдөөгүй.',
    );
  });
  it('нийт зах зээл', () => {
    expect(totalSentence(2.45e12, 3.1, false)).toBe(
      'Криптогийн нийт зах зээлийн үнэлгээ 2.45 их наяд ам.доллар болж, 7 хоногт 3.1 хувиар нэмэгдлээ.',
    );
    expect(totalSentence(2.45e12, -3.1, true)).toBe(
      'Криптогийн нийт зах зээлийн үнэлгээ 2.45 их наяд ам.доллар болж, 7 хоногт 3.1 хувиар буурлаа (топ 100-аар тооцоолсон).',
    );
  });
  it('давамгайлал', () => {
    expect(dominanceSentence(57.8, 57.1)).toBe('Биткойны давамгайлал 57.8 хувь боллоо (өмнөх 7 хоногт 57.1 хувь).');
    expect(dominanceSentence(57.8, null)).toBe('Биткойны давамгайлал 57.8 хувь байна.');
  });
  it('стейблкойн, TVL, F&G, топ өсөлт', () => {
    expect(stableSentence(3.124e11, 0.8)).toBe('Стейблкойны нийт нийлүүлэлт 312.4 тэрбум ам.доллар, 7 хоногт 0.8 хувиар өслөө.');
    expect(tvlSentence(1.182e11, null)).toBe('DeFi-д түгжигдсэн нийт хөрөнгө (TVL) 118.2 тэрбум ам.доллар байна.');
    expect(fearGreedSentence(34, 'Айдас', 52)).toBe('Айдас ба шунахайн индекс 34 (Айдас) байна, өмнөх 7 хоногт 52 байсан.');
    expect(topGainerSentence('XYZ', 38.5)).toBe('Топ 100-аас хамгийн их өссөн нь XYZ (+38.5%).');
  });
  it('«%» эсвэл «$»-д монгол залгавар залгагдаагүй', () => {
    const all = [
      priceSentence('Биткойн', 'Биткойны', 68450, -4.2),
      totalSentence(2.45e12, 3.1, true),
      stableSentence(3.124e11, -0.8),
      tvlSentence(1.182e11, 2.5),
    ].join(' ');
    expect(all).not.toMatch(/%[а-яөү]|\$/i);
  });
});
