import { View } from 'react-native';

import { Band } from '@/components/layout/band';
import { BrandLockup } from '@/components/layout/header';
import { SOURCES } from '@/components/ui/attribution';
import { ExtLink, InLink, T } from '@/components/ui/primitives';
import { t } from '@/lib/i18n-mn';
import { maxWidth, space } from '@/theme/tokens';

export function Footer() {
  return (
    <Band role="contentinfo" style={{ marginTop: space.xxxl }}>
      <View
        style={{
          width: '100%',
          maxWidth,
          alignSelf: 'center',
          paddingHorizontal: space.lg,
          paddingVertical: space.xxl,
          gap: space.lg,
        }}>
        <BrandLockup />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm }}>
          <T v="label" color="textMuted">
            {t.footer.attribution}
          </T>
          {Object.values(SOURCES).map((s) => (
            <ExtLink key={s.url} href={s.url} v="small" color="textMuted">
              {s.label}
            </ExtLink>
          ))}
        </View>
        <T v="small" color="text" style={{ fontWeight: '600' }}>
          {t.footer.disclaimer}
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.lg, alignItems: 'center' }}>
          <InLink href="/arga-zui" v="small">
            {t.footer.method}
          </InLink>
          <T v="caption" color="textMuted">
            © {new Date().getFullYear()} {t.site.name}
          </T>
        </View>
      </View>
    </Band>
  );
}
