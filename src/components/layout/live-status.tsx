import { View } from 'react-native';

import { T } from '@/components/ui/primitives';
import { formatDateTime, isStale } from '@/lib/dates';
import type { DataOrigin } from '@/lib/data-client';
import { t } from '@/lib/i18n-mn';
import { radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** «Сүүлд шинэчилсэн …» + шар (хоцорсон) эсвэл саарал (fallback/sample) туз (SPEC §8). */
export function LiveStatus({ updatedAt, origin }: { updatedAt?: string; origin?: DataOrigin }) {
  const { c } = useTheme();
  if (!updatedAt || !origin) {
    return (
      <T v="small" color="textMuted">
        {t.live.loading}
      </T>
    );
  }

  const banner =
    origin === 'sample'
      ? { text: t.live.sample, bg: c.infoBg, fg: 'infoText' as const }
      : origin === 'fallback'
        ? { text: t.live.fallback, bg: c.infoBg, fg: 'infoText' as const }
        : isStale(updatedAt)
          ? { text: t.live.staleWarning, bg: c.warnBg, fg: 'warnText' as const }
          : null;

  return (
    <View style={{ gap: space.sm }} aria-live="polite">
      <T v="small" color="textMuted" num>
        {t.live.updated}: {formatDateTime(updatedAt)}
      </T>
      {banner ? (
        <View
          role="status"
          style={{
            backgroundColor: banner.bg,
            borderRadius: radius.md,
            paddingVertical: space.sm,
            paddingHorizontal: space.md,
            alignSelf: 'flex-start',
          }}>
          <T v="smallStrong" color={banner.fg}>
            {banner.text}
          </T>
        </View>
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
