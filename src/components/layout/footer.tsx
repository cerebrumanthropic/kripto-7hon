import { View } from 'react-native';

import { SOURCES } from '@/components/ui/attribution';
import { ExtLink, InLink, T } from '@/components/ui/primitives';
import { t } from '@/lib/i18n-mn';
import { maxWidth, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export function Footer() {
  const { c } = useTheme();
  return (
    <View
      role="contentinfo"
      style={{ backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border, marginTop: space.xxxl }}>
      <View
        style={{
          width: '100%',
          maxWidth,
          alignSelf: 'center',
          paddingHorizontal: space.lg,
          paddingVertical: space.xl,
          gap: space.md,
        }}>
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
    </View>
  );
}
