import { View } from 'react-native';

import { T } from '@/components/ui/primitives';
import { formatDateTime, isStale } from '@/lib/dates';
import type { DataOrigin } from '@/lib/data-client';
import { t } from '@/lib/i18n-mn';
import { staleSources } from '@/lib/source-status';
import type { SourceStatus } from '@/types/schemas';
import { radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

function Banner({ text, tone }: { text: string; tone: 'info' | 'warn' }) {
  const { c } = useTheme();
  return (
    <View
      role="status"
      style={{
        backgroundColor: tone === 'warn' ? c.warnBg : c.infoBg,
        borderRadius: radius.md,
        paddingVertical: space.sm,
        paddingHorizontal: space.md,
        alignSelf: 'flex-start',
      }}>
      <T v="smallStrong" color={tone === 'warn' ? 'warnText' : 'infoText'}>
        {text}
      </T>
    </View>
  );
}

/**
 * «Сүүлд шинэчилсэн …» + шар (хоцорсон) эсвэл саарал (fallback/sample) туз (SPEC §8).
 * Эх сурвалж тус бүрийн «хоцорсон» тэмдэг (CLAUDE.md дүрэм 8).
 */
export function LiveStatus({
  updatedAt,
  origin,
  sources,
  pending,
}: {
  updatedAt?: string;
  origin?: DataOrigin;
  sources?: SourceStatus[];
  /** Build үеийн snapshot харагдаж, амьд дата хүлээгдэж байна — туз харуулахгүй (CLS) */
  pending?: boolean;
}) {
  if (!updatedAt || !origin) {
    return (
      <T v="small" color="textMuted">
        {t.live.loading}
      </T>
    );
  }
  if (pending) {
    return (
      <T v="small" color="textMuted" num>
        {t.live.updated}: {formatDateTime(updatedAt)}
      </T>
    );
  }

  const stale = staleSources(sources ?? []);

  return (
    <View style={{ gap: space.sm }} aria-live="polite">
      <T v="small" color="textMuted" num>
        {t.live.updated}: {formatDateTime(updatedAt)}
      </T>
      {origin === 'sample' ? <Banner tone="info" text={t.live.sample} /> : null}
      {origin === 'fallback' ? <Banner tone="info" text={t.live.fallback} /> : null}
      {origin === 'live' && isStale(updatedAt) ? <Banner tone="warn" text={t.live.staleWarning} /> : null}
      {stale.length > 0 ? (
        <Banner
          tone="warn"
          text={`${t.live.staleSources}: ${stale.map((s) => `${s.name} (${formatDateTime(s.fetchedAt)})`).join(', ')}`}
        />
      ) : null}
    </View>
  );
}

export function LoadError() {
  return (
    <T v="small" color="negativeText" role="alert">
      {t.live.error}
    </T>
  );
}
