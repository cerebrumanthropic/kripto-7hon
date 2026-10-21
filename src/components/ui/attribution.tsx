// Иш татах мөрүүд (CLAUDE.md дүрэм 5, SPEC §5). Дата харуулдаг блокийн яг доор тавина.
import { View } from 'react-native';

import { t } from '@/lib/i18n-mn';
import { space } from '@/theme/tokens';

import { ExtLink, T } from './primitives';

export const SOURCES = {
  coingecko: { label: t.footer.coingecko, url: 'https://www.coingecko.com/en/api' },
  defillama: { label: t.footer.defillama, url: 'https://defillama.com' },
  alternative: {
    label: t.footer.alternative,
    url: 'https://alternative.me/crypto/fear-and-greed-index/',
  },
  // Энэ текст яг хэвээрээ байх ёстой (SPEC §5.4)
  exchangerate: { label: t.footer.exchangeRate, url: 'https://www.exchangerate-api.com' },
} as const;

export type SourceKey = keyof typeof SOURCES;

export function Attribution({ sources }: { sources: SourceKey[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: space.sm }}>
      <T v="caption" color="textMuted">
        {t.common.sourceLabel}:
      </T>
      {sources.map((k, i) => (
        <View key={k} style={{ flexDirection: 'row' }}>
          <ExtLink href={SOURCES[k].url} v="caption" color="textMuted">
            {SOURCES[k].label}
          </ExtLink>
          {i < sources.length - 1 ? (
            <T v="caption" color="textMuted">
              ,
            </T>
          ) : null}
        </View>
      ))}
    </View>
  );
}
