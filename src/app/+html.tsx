import { useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

import { t } from '@/lib/i18n-mn';

// Зөвхөн Node.js-д build үед ажиллана. ScrollViewStyleReset-ийг ашиглахгүй —
// body өөрөө гүйлгэгдэнэ (браузерийн scroll, anchor, хэвлэлт хэвийн ажиллана).
const css = `
html { background: #070B1F; color-scheme: dark; }
/* body тунгалаг — эс бөгөөс body-ийн дэвсгэр z-index:-1 бөмбөлгийг дардаг */
body { margin: 0; background: transparent; color: #EEF1FA; }
/* Glassy dashboard (PROGRESS D75): гэрэлтэх бөмбөлгүүд — fixed давхарга тул гүйлгэхэд дахин зурагдахгүй */
body::before { content: ""; position: fixed; inset: 0; z-index: -1; pointer-events: none;
  background:
    radial-gradient(760px 560px at 88% -8%, rgba(79,124,255,0.55), transparent 62%),
    radial-gradient(680px 560px at -12% 38%, rgba(139,92,246,0.42), transparent 60%),
    radial-gradient(860px 680px at 72% 108%, rgba(56,189,248,0.30), transparent 62%); }
[data-glass] { -webkit-backdrop-filter: blur(16px) saturate(140%); backdrop-filter: blur(16px) saturate(140%); }
#root { display: flex; min-height: 100vh; flex-direction: column; }
:focus-visible { outline: 2px solid #9DB2FF; outline-offset: 2px; }
[id] { scroll-margin-top: 96px; }
.skip { position: absolute; left: -9999px; top: 8px; z-index: 100; padding: 8px 12px; background: #2457C5; color: #fff; border-radius: 6px; font-family: system-ui, sans-serif; }
.skip:focus { left: 8px; }
[data-lift] { transition: transform .15s ease, box-shadow .15s ease, filter .15s ease; }
[data-lift]:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(11,26,61,.16); filter: brightness(1.04); }
[data-news] a:hover { text-decoration-line: underline; }
[data-news]:last-child { border-bottom-width: 0; }
[data-float] { animation: vh-float 4.5s ease-in-out infinite; }
@keyframes vh-float { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-14px) rotate(-2deg); } }
@media (prefers-reduced-motion: reduce) {
  [data-lift] { transition: none; }
  [data-lift]:hover { transform: none; }
  [data-float] { animation: none; }
}
@media print {
  [role="banner"], [role="contentinfo"], .skip,
  #report-actions, #copy-text, #infographic-controls, #report-nav { display: none !important; }
  html, body { background: #fff !important; color: #14161B !important; }
  body::before { display: none; }
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
        <meta name="theme-color" content="#070B1F" />
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
