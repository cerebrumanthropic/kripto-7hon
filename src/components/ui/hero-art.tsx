// Нүүрний hero-ийн баруун талын хөдөлгөөнт зураг: эргэлдэх зоос (хэрэглэгчийн өгсөн GIF, PROGRESS D78 — D73-ын
// роботыг сольсон). GIF-ийн хөх дэвсгэрийг тунгалаг болгож 640px animated WebP (≈430 KB) болгосон.
// Зөвхөн ≥1024px-д харагдана: хайрцаг нь статик HTML-д үргэлж байж `[data-desktop="only"]` CSS-ээр гарна —
// hydration-ий дараа агуулга үсрэхгүй (D77). Зургийг зөвхөн desktop-д ачаална (мобайлд татахгүй).
// `prefers-reduced-motion` үед хөдөлгөөнгүй нэг кадр (coin-still.webp, 12 KB) харуулна.
import { Image, View } from 'react-native';

import { dataAttrs } from '@/components/ui/primitives';
import { useDesktopMedia, useReducedMotion } from '@/theme/use-theme';

export function HeroArt({ width = 320 }: { width?: number }) {
  const desktop = useDesktopMedia();
  const still = useReducedMotion();
  return (
    <View aria-hidden {...dataAttrs({ desktop: 'only' })} style={{ width, height: width, flexShrink: 0 }}>
      {desktop ? (
        <Image
          source={{ uri: still ? '/hero/coin-still.webp' : '/hero/coin.webp' }}
          style={{ width, height: width }}
          resizeMode="contain"
        />
      ) : null}
    </View>
  );
}
