import { useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

import { t } from '@/lib/i18n-mn';

// Зөвхөн Node.js-д build үед ажиллана. ScrollViewStyleReset-ийг ашиглахгүй —
// body өөрөө гүйлгэгдэнэ (браузерийн scroll, anchor, хэвлэлт хэвийн ажиллана).
const css = `
html { background: #000; color-scheme: dark; }
/* body тунгалаг — эс бөгөөс body-ийн дэвсгэр z-index:-1 тэнгэрийг (Sky) дардаг */
body { margin: 0; background: transparent; color: #EEF1FA; }
/* Дэвсгэр: одот тэнгэр + гаригийн ягаан хүрээ (src/components/layout/sky.web.tsx) */
#root { display: flex; min-height: 100vh; flex-direction: column; }
:focus-visible { outline: 2px solid #9DB2FF; outline-offset: 2px; }
[id] { scroll-margin-top: 96px; }
.skip { position: absolute; left: -9999px; top: 8px; z-index: 100; padding: 8px 12px; background: #2457C5; color: #fff; border-radius: 6px; font-family: system-ui, sans-serif; }
.skip:focus { left: 8px; }
[data-lift] { transition: transform .15s ease, box-shadow .15s ease, filter .15s ease; }
[data-lift]:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(11,26,61,.16); filter: brightness(1.04); }
[data-news] a:hover { text-decoration-line: underline; }
[data-news]:last-child { border-bottom-width: 0; }
/* Desktop (≥1024px) хэмжээг CSS-ээр: статик HTML мобайл өргөнөөр үүсдэг тул JS breakpoint-оор сольвол desktop-д
   hydration-ий дараа агуулга үсэрдэг (CLS, PROGRESS D77). Утгууд нь tokens.ts-ийн heroLg/display/small-тай ижил. */
@media (max-width: 1023.98px) { [data-desktop="only"] { display: none !important; } }
@media (min-width: 1024px) {
  [data-desktop="hide"] { display: none !important; }
  [data-title="hero"] { font-size: 54px !important; line-height: 60px !important; letter-spacing: -1.2px !important; }
  [data-title="page"] { font-size: 40px !important; line-height: 46px !important; letter-spacing: -0.6px !important; }
  [data-grid-desktop="2"] > * { flex-basis: 48% !important; }
  [data-grid-desktop="3"] > * { flex-basis: 31.3333% !important; }
  [data-grid-desktop="4"] > * { flex-basis: 23% !important; }
  [data-kpi="label"] { font-size: 14px !important; line-height: 20px !important; }
  [data-kpi="value"] { font-size: 28px !important; line-height: 34px !important; }
  [data-brand="mark"] { zoom: 1.10526; }
  [data-brand="org"] { font-size: 14px !important; line-height: 19px !important; }
}
@media (prefers-reduced-motion: reduce) {
  [data-lift] { transition: none; }
  [data-lift]:hover { transform: none; }
}
@media print {
  [role="banner"], [role="contentinfo"], .skip,
  #report-actions, #copy-text, #infographic-controls, #report-nav { display: none !important; }
  html, body { background: #fff !important; color: #14161B !important; }
  [data-sky] { display: none !important; }
  [data-band] { background: none !important; }
  [data-band] * { color: #14161B !important; }
  [role="img"], [role="table"] { break-inside: avoid; }
  @page { margin: 14mm; }
}
`;

export default function Root({ children }: PropsWithChildren) {
  const { htmlAttributes, bodyAttributes, headNodes, bodyNodes } = useServerDocumentContext();
  return (
    <html lang="mn" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="color-scheme" content="dark" />
        <meta name="theme-color" content="#000000" />
        <style dangerouslySetInnerHTML={{ __html: css }} />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        <a className="skip" href="#main">
          {t.nav.skip}
        </a>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
