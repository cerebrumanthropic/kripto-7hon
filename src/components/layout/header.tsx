import { Link, usePathname, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { T, webPress } from '@/components/ui/primitives';
import { t } from '@/lib/i18n-mn';
import { fonts, maxWidth, radius, space, type } from '@/theme/tokens';
import { useLayout, useTheme } from '@/theme/use-theme';

const NAV: Array<{ href: Href; label: string; match: (p: string) => boolean }> = [
  { href: '/', label: t.nav.home, match: (p) => p === '/' },
  { href: '/zah-zeel', label: t.nav.market, match: (p) => p.startsWith('/zah-zeel') },
  { href: '/medee', label: t.nav.news, match: (p) => p.startsWith('/medee') },
  { href: '/tailan', label: t.nav.reports, match: (p) => p.startsWith('/tailan') },
  { href: '/sudalgaa', label: t.nav.research, match: (p) => p.startsWith('/sudalgaa') },
  { href: '/arga-zui', label: t.nav.method, match: (p) => p.startsWith('/arga-zui') },
];

function Logo() {
  const { c } = useTheme();
  return (
    // Нэр нь харагдах текстээс («ВХ 7 хоног») — aria-label өөр байвал label-content-name-mismatch
    <Link href="/" style={{ textDecorationLine: 'none' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <View
          aria-hidden
          style={{
            width: 34,
            height: 34,
            borderRadius: radius.sm,
            backgroundColor: c.brand,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <T style={{ fontFamily: fonts.bold, fontSize: 15, color: c.onBrand, letterSpacing: -0.5 }}>
            {t.site.monogram}
          </T>
        </View>
        <View>
          <T v="bodyStrong" style={{ lineHeight: 18 }}>
            {t.site.short}
          </T>
          <View style={{ height: 2, width: 22, backgroundColor: c.accent, marginTop: 3 }} />
        </View>
      </View>
    </Link>
  );
}

// `Link asChild` + функц style нь вэбд алга болдог тул <a> дээр шууд статик style өгнө.
function NavLink({ href, label, active, onPress }: { href: Href; label: string; active: boolean; onPress?: () => void }) {
  const { c } = useTheme();
  return (
    <Link
      href={href}
      onPress={onPress}
      aria-current={active ? 'page' : undefined}
      style={[
        type.smallStrong,
        {
          color: active ? c.brandText : c.text,
          paddingVertical: space.sm,
          paddingHorizontal: space.md,
          borderRadius: radius.md,
          backgroundColor: active ? c.surfaceAlt : 'transparent',
          borderBottomWidth: 2,
          borderBottomColor: active ? c.brand : 'transparent',
          textDecorationLine: 'none',
        },
      ]}>
      {label}
    </Link>
  );
}

export function Header() {
  const { c } = useTheme();
  const { isDesktop } = useLayout();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <View
      role="banner"
      style={{
        backgroundColor: c.surface,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
        position: 'sticky' as 'relative',
        top: 0,
        zIndex: 10,
      }}>
      <View
        style={{
          width: '100%',
          maxWidth,
          alignSelf: 'center',
          paddingHorizontal: space.lg,
          paddingVertical: space.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <Logo />
        {isDesktop ? (
          <View role="navigation" aria-label={t.nav.label} style={{ flexDirection: 'row', gap: space.xs }}>
            {NAV.map((n) => (
              <NavLink key={n.label} href={n.href} label={n.label} active={n.match(pathname)} />
            ))}
          </View>
        ) : (
          <Pressable
            onPress={() => setOpen((o) => !o)}
            role="button"
            aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
            aria-expanded={open}
            style={(s) => ({
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: c.border,
              outlineColor: c.brand,
              outlineWidth: webPress(s).focused ? 2 : 0,
              outlineStyle: 'solid',
            })}>
            <View style={{ gap: 4 }}>
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  style={{
                    width: 18,
                    height: 2,
                    backgroundColor: c.text,
                    opacity: open && i === 1 ? 0 : 1,
                    transform:
                      open && i !== 1 ? [{ translateY: i === 0 ? 6 : -6 }, { rotate: i === 0 ? '45deg' : '-45deg' }] : [],
                  }}
                />
              ))}
            </View>
          </Pressable>
        )}
      </View>
      {!isDesktop && open ? (
        <View
          role="navigation"
          aria-label={t.nav.label}
          style={{ paddingHorizontal: space.lg, paddingBottom: space.md, gap: space.xs }}>
          {NAV.map((n) => (
            <NavLink
              key={n.label}
              href={n.href}
              label={n.label}
              active={n.match(pathname)}
              onPress={() => setOpen(false)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
