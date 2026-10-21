import type { ReactNode } from 'react';
import { View } from 'react-native';

import { T } from '@/components/ui/primitives';
import { maxWidth, space } from '@/theme/tokens';

/** Хуудасны контейнер: max-width 1200, гарчиг + оршил. */
export function Page({
  title,
  lead,
  kicker,
  meta,
  children,
}: {
  title: string;
  lead?: string;
  kicker?: string;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View
      role="main"
      nativeID="main"
      style={{
        width: '100%',
        maxWidth,
        alignSelf: 'center',
        paddingHorizontal: space.lg,
        paddingTop: space.xl,
        gap: space.xxl,
      }}>
      <View style={{ gap: space.sm, maxWidth: 820 }}>
        {kicker ? (
          <T v="label" color="accent">
            {kicker}
          </T>
        ) : null}
        <T v="h1" role="heading" aria-level={1}>
          {title}
        </T>
        {lead ? (
          <T v="body" color="textMuted">
            {lead}
          </T>
        ) : null}
        {meta}
      </View>
      {children}
    </View>
  );
}

export function Section({ children, gap = space.md }: { children: ReactNode; gap?: number }) {
  return <View style={{ gap }}>{children}</View>;
}
