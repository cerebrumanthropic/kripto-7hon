import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

/** Контейнерийн өргөнийг хэмжинэ (SSR-д 0 → график hydration-ий дараа зурагдана). */
export function useWidth(): [number, (e: LayoutChangeEvent) => void] {
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    setWidth((prev) => (prev === w ? prev : w));
  }, []);
  return [width, onLayout];
}
