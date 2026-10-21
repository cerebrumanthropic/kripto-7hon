import { useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

import { t } from '@/lib/i18n-mn';

// Зөвхөн Node.js-д build үед ажиллана. ScrollViewStyleReset-ийг ашиглахгүй —
// body өөрөө гүйлгэгдэнэ (браузерийн scroll, anchor, хэвлэлт хэвийн ажиллана).
const css = `
html, body { margin: 0; background: #F6F4EF; color: #14161B; }
@media (prefers-color-scheme: dark) { html, body { background: #0B1220; color: #E8ECF4; } }
#root { display: flex; min-height: 100vh; flex-direction: column; }
:focus-visible { outline: 2px solid #2457C5; outline-offset: 2px; }
[data-band] :focus-visible { outline-color: #F2C46B; }
[id] { scroll-margin-top: 96px; }
.skip { position: absolute; left: -9999px; top: 8px; z-index: 100; padding: 8px 12px; background: #2457C5; color: #fff; border-radius: 6px; font-family: system-ui, sans-serif; }
.skip:focus { left: 8px; }
[data-lift] { transition: transform .15s ease, box-shadow .15s ease, filter .15s ease; }
[data-lift]:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(11,26,61,.16); filter: brightness(1.04); }
[data-news] a:hover { text-decoration-line: underline; }
[data-news]:last-child { border-bottom-width: 0; }
#live-dot::after { content: ""; position: absolute; inset: 0; border-radius: 50%; background: #4ADE80; animation: vh-ping 1.8s cubic-bezier(0,0,.2,1) infinite; }
@keyframes vh-ping { 75%, 100% { transform: scale(2.6); opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  [data-lift] { transition: none; }
  [data-lift]:hover { transform: none; }
  #live-dot::after { animation: none; display: none; }
}
@media print {
  [role="banner"], [role="contentinfo"], .skip,
  #report-actions, #copy-text, #infographic-controls, #report-nav { display: none !important; }
  html, body { background: #fff !important; }
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
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" content="#0B1A3D" />
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
