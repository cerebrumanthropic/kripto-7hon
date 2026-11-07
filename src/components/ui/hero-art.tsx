// Нүүрний hero-ийн баруун талын зураг (робот, PROGRESS D73). Зөвхөн ≥1024px-д харагдана: хайрцаг нь статик HTML-д
// үргэлж байж `[data-desktop="only"]` CSS-ээр гарна — hydration-ий дараа агуулга үсрэхгүй (D77). Зургийг зөвхөн
// desktop-д ачаална (мобайлд татахгүй). Зураг хөдөлгөөнгүй тул `+html.tsx`-ийн `[data-float]` CSS-ээр зөөлөн дээш
// доош хөвнө; `prefers-reduced-motion` үед зогсоно. 640px WebP (≈30 KB, тунгалаг дэвсгэртэй).
import { Image, View } from 'react-native';

import { dataAttrs } from '@/components/ui/primitives';
import { useDesktopMedia } from '@/theme/use-theme';

export function HeroArt({ width = 320 }: { width?: number }) {
  const desktop = useDesktopMedia();
  return (
    <View aria-hidden {...dataAttrs({ desktop: 'only' })} style={{ width, height: width, flexShrink: 0 }}>
      {desktop ? (
        <Image
          {...dataAttrs({ float: '' })}
          source={{ uri: '/hero/robot.webp' }}
          style={{ width, height: width }}
          resizeMode="contain"
        />
      ) : null}
    </View>
  );
}
