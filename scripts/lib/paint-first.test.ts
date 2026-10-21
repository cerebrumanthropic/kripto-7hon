import { describe, expect, it } from 'vitest';

import { loaderScript, paintFirst } from './paint-first';

const HTML =
  '<body><div id="root">агуулга</div>' +
  '<script defer="" src="/_expo/a.js"></script><script defer="" src="/_expo/b.js"></script>' +
  '<script id="_R_">globalThis.x=1</script></body>';

describe('paintFirst', () => {
  it('defer скриптүүдийг дарааллаар нь нэг loader-оор солино', () => {
    const out = paintFirst(HTML);
    expect(out).not.toContain('<script defer');
    expect(out).toContain(loaderScript(['/_expo/a.js', '/_expo/b.js']));
    // Loader нь агуулгын дараа, `_R_` (hydration дата)-ийн өмнө байрлана
    expect(out.indexOf('агуулга')).toBeLessThan(out.indexOf('requestAnimationFrame'));
    expect(out.indexOf('requestAnimationFrame')).toBeLessThan(out.indexOf('_R_'));
  });

  it('давтан ажиллуулахад өөрчлөгдөхгүй', () => {
    const once = paintFirst(HTML);
    expect(paintFirst(once)).toBe(once);
  });
});
