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
[id] { scroll-margin-top: 84px; }
.skip { position: absolute; left: -9999px; top: 8px; z-index: 100; padding: 8px 12px; background: #2457C5; color: #fff; border-radius: 6px; font-family: system-ui, sans-serif; }
.skip:focus { left: 8px; }
@media print {
  [role="banner"], [role="contentinfo"], .skip,
  #report-actions, #copy-text, #infographic-controls, #report-nav { display: none !important; }
  html, body { background: #fff !important; }
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
