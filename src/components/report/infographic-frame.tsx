import type { Ref } from 'react';
import { View } from 'react-native';

import { useWidth } from '@/components/charts/use-width';
import { t } from '@/lib/i18n-mn';
import type { MergedReport } from '@/types/schemas';

import { INFOGRAPHIC_H, INFOGRAPHIC_W, Infographic, type InfographicVariant, type ViewRef } from './infographic';

/** 1080×1350-ийг контейнерийн өргөнд CSS transform: scale()-ээр багасгаж харуулна (SPEC §8.8). */
export function InfographicFrame({
  r,
  variant,
  siteUrl,
  nodeRef,
}: {
  r: MergedReport;
  variant: InfographicVariant;
  siteUrl: string;
  nodeRef?: Ref<ViewRef>;
}) {
  const [width, onLayout] = useWidth();
  const scale = width > 0 ? Math.min(1, width / INFOGRAPHIC_W) : 0;
  return (
    <View onLayout={onLayout} style={{ width: '100%', maxWidth: INFOGRAPHIC_W }} role="img" aria-label={t.infographic.label}>
      {scale > 0 ? (
        <View style={{ height: INFOGRAPHIC_H * scale, overflow: 'hidden', borderRadius: 12 }}>
          <View style={{ width: INFOGRAPHIC_W, height: INFOGRAPHIC_H, transform: [{ scale }], transformOrigin: 'top left' }}>
            <Infographic r={r} variant={variant} siteUrl={siteUrl} ref={nodeRef} />
          </View>
        </View>
      ) : (
        <View style={{ width: '100%', aspectRatio: INFOGRAPHIC_W / INFOGRAPHIC_H }} />
      )}
    </View>
  );
}
