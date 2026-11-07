import { Link, usePathname, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Band } from '@/components/layout/band';
import { BrandMark } from '@/components/ui/brand-mark';
import { dataAttrs, T, webPress } from '@/components/ui/primitives';
import { t } from '@/lib/i18n-mn';
import { font, maxWidth, radius, space, type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const NAV: Array<{ href: Href; label: string; match: (p: string) => boolean }> = [
  { href: '/', label: t.nav.home, match: (p) => p === '/' },
  { href: '/zah-zeel', label: t.nav.market, match: (p) => p.startsWith('/zah-zeel') },
  { href: '/medee', label: t.nav.news, match: (p) => p.startsWith('/medee') },
  { href: '/sudalgaa', label: t.nav.research, match: (p) => p.startsWith('/sudalgaa') },
];

/**
 * Хэлтсийн нэр + «7 хоногийн мэдээ» (PROGRESS D53). Мобайлд нэр 2 мөрт орно.
 * `responsive` (толгой) — мобайлын жижиг хэмжээ, ≥1024px-д `[data-brand]` CSS-ээр томорно (D77).
 */
export function BrandLockup({ responsive }: { responsive?: boolean }) {
  const { c } = useTheme();
  const compact = !!responsive;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, flexShrink: 1 }}>
      <View {...(responsive ? dataAttrs({ brand: 'mark' }) : {})}>
        <BrandMark size={compact ? 38 : 42} />
      </View>
      <View style={{ flexShrink: 1 }}>
        <T
          {...(responsive ? dataAttrs({ brand: 'org' }) : {})}
          style={{ ...font('bold'), fontSize: compact ? 13 : 14, lineHeight: compact ? 17 : 19, color: c.text }}>
          {t.site.org}
        </T>
        <T style={{ ...font('bold'), fontSize: 13, lineHeight: 17, color: c.accent, marginTop: 2 }}>
          {t.site.edition}
        </T>
      </View>
    </View>
  );
}

function Logo() {
  return (
    // Нэр нь харагдах текстээс — aria-label өөр байвал label-content-name-mismatch
    <Link href="/" style={{ textDecorationLine: 'none', flexShrink: 1 }}>
      <BrandLockup responsive />
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
          color: active ? c.text : c.textMuted,
          paddingVertical: space.sm,
          paddingHorizontal: space.md,
          borderRadius: radius.md,
          backgroundColor: active ? c.surfaceAlt : 'transparent',
          borderBottomWidth: 2,
          borderBottomColor: active ? c.accent : 'transparent',
          textDecorationLine: 'none',
        },
      ]}>
      {label}
    </Link>
  );
}

function MenuButton({ open, onPress }: { open: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      role="button"
      aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
      aria-expanded={open}
      style={(s) => ({
        width: 44,
        height: 44,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: c.borderStrong,
        outlineColor: c.accent,
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
  );
}

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <Band
      role="banner"
      style={{
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
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
          gap: space.md,
        }}>
        <Logo />
        {/* Desktop цэс ба мобайл товч хоёулаа HTML-д байж CSS-ээр (≥1024px) сонгогдоно — статик HTML мобайл
            өргөнөөр үүсдэг тул JS-ээр сольвол desktop-д hydration-ий дараа толгой үсэрдэг (D77) */}
        <View
          role="navigation"
          aria-label={t.nav.label}
          {...dataAttrs({ desktop: 'only' })}
          style={{ flexDirection: 'row', gap: space.xs, flexShrink: 0 }}>
          {NAV.map((n) => (
            <NavLink key={n.label} href={n.href} label={n.label} active={n.match(pathname)} />
          ))}
        </View>
        <View {...dataAttrs({ desktop: 'hide' })} style={{ flexShrink: 0 }}>
          <MenuButton open={open} onPress={() => setOpen((o) => !o)} />
        </View>
      </View>
      {open ? (
        <View
          role="navigation"
          aria-label={t.nav.label}
          {...dataAttrs({ desktop: 'hide' })}
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
    </Band>
  );
}
