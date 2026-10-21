// Хуудас бүрийн статик metadata (SDK 58 `generateMetadata`, build үед HTML-д орно).
import type { Metadata } from 'expo-router/server';

import { SITE_URL } from './config';
import { t } from './i18n-mn';

export function pageMeta(title: string, description: string, path: string): Metadata {
  const full = path === '/' ? title : `${title} · ${t.site.short}`;
  return {
    title: full,
    description,
    openGraph: {
      title: full,
      description,
      url: `${SITE_URL}${path}`,
      siteName: t.site.name,
      locale: 'mn_MN',
      type: 'website',
      images: [{ url: `${SITE_URL}/og.png`, width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', title: full, description },
  };
}
