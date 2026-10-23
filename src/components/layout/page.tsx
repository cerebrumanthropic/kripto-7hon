import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Band } from '@/components/layout/band';
import { T } from '@/components/ui/primitives';
import { maxWidth, space, type } from '@/theme/tokens';
import { useLayout } from '@/theme/use-theme';

/**
 * Хуудасны контейнер: бараан хөх тууз (kicker, гарчиг, оршил, meta, `band`) + max-width 1200 агуулга.
 * `size="hero"` — нүүрний том гарчиг. `titleAccent` — гарчгийн алтан өнгөөр тодрох хэсэг.
 */
export function Page({
  title,
  titleAccent,
  lead,
  kicker,
  meta,
  band,
  aside,
  size = 'page',
  children,
}: {
  title: string;
  titleAccent?: string;
  lead?: string;
  kicker?: ReactNode;
  meta?: ReactNode;
  /** Туузны доод хэсэгт (гарчгийн блокоос өргөн) — нүүрний KPI */
  band?: ReactNode;
  /** Гарчгийн блокийн баруун талд (нүүрний хөдөлгөөнт зураг) */
  aside?: ReactNode;
  size?: 'hero' | 'page';
  children: ReactNode;
}) {
  const { isDesktop } = useLayout();
  const big = size === 'hero';
  const titleStyle = big ? (isDesktop ? type.heroLg : type.hero) : isDesktop ? type.display : type.h1;
  const at = titleAccent ? title.lastIndexOf(titleAccent) : -1;

  return (
    <View role="main" nativeID="main" style={{ width: '100%' }}>
      <Band pattern style={{ paddingTop: big ? space.xxxl : space.xxl, paddingBottom: big ? space.xxxl : space.xxl }}>
        <View style={{ width: '100%', maxWidth, alignSelf: 'center', paddingHorizontal: space.lg, gap: space.xxl }}>
          <View style={aside ? { flexDirection: 'row', alignItems: 'center', gap: space.xl } : undefined}>
            <View style={{ gap: space.md, maxWidth: 860, flex: aside ? 1 : undefined, minWidth: 0 }}>
              {typeof kicker === 'string' ? (
                <T v="label" color="accent">
                  {kicker}
                </T>
              ) : (
                kicker
              )}
              <T role="heading" aria-level={1} style={titleStyle}>
                {at > 0 && titleAccent ? (
                  <>
                    {title.slice(0, at)}
                    <T color="accent" style={titleStyle}>
                      {titleAccent}
                    </T>
                    {title.slice(at + titleAccent.length)}
                  </>
                ) : (
                  title
                )}
              </T>
              {lead ? (
                <T v={big ? 'lead' : 'body'} color="textMuted">
                  {lead}
                </T>
              ) : null}
              {meta}
            </View>
            {aside}
          </View>
          {band}
        </View>
      </Band>
      <View
        style={{
          width: '100%',
          maxWidth,
          alignSelf: 'center',
          paddingHorizontal: space.lg,
          paddingTop: space.xxl,
          gap: space.xxl,
        }}>
        {children}
      </View>
    </View>
  );
}

export function Section({ children, gap = space.md }: { children: ReactNode; gap?: number }) {
  return <View style={{ gap }}>{children}</View>;
}
