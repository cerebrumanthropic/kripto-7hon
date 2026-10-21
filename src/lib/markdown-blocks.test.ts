import { describe, expect, it } from 'vitest';

import { markdownToBlocks } from './markdown-blocks';

describe('markdownToBlocks', () => {
  it('догол мөр, жагсаалт, дэд гарчиг', () => {
    const md = [
      'Эхний мөр',
      'үргэлжлэл **тод**.',
      '',
      '### Гарчиг',
      '- нэг',
      '* хоёр',
      '',
      'Сүүлийн догол.',
    ].join('\n');
    expect(markdownToBlocks(md)).toEqual([
      { type: 'p', text: 'Эхний мөр үргэлжлэл тод.' },
      { type: 'h3', text: 'Гарчиг' },
      { type: 'li', text: 'нэг' },
      { type: 'li', text: 'хоёр' },
      { type: 'p', text: 'Сүүлийн догол.' },
    ]);
  });

  it('auto-suggestions коммент сайтад гарахгүй', () => {
    const md = 'Текст\n\n<!-- auto-suggestions\nНууц өгүүлбэр\n-->\n';
    expect(markdownToBlocks(md)).toEqual([{ type: 'p', text: 'Текст' }]);
  });

  it('CRLF', () => {
    expect(markdownToBlocks('- a\r\n- b\r\n')).toHaveLength(2);
  });
});
