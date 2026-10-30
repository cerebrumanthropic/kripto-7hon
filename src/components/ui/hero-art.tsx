// Нүүрний hero-ийн баруун талын зураг (робот, PROGRESS D73). Зөвхөн desktop-д (дуудагч нь `isDesktop`
// үед л render хийнэ). Зураг хөдөлгөөнгүй тул `+html.tsx`-ийн `[data-float]` CSS-ээр зөөлөн дээш доош
// хөвнө; `prefers-reduced-motion` үед зогсоно. 640px WebP (≈30 KB, тунгалаг дэвсгэртэй).
import { Image } from 'react-native';

import { dataAttrs } from '@/components/ui/primitives';

export function HeroArt({ width = 320 }: { width?: number }) {
  return (
    <Image
      aria-hidden
      {...dataAttrs({ float: '' })}
      source={{ uri: '/hero/robot.webp' }}
      style={{ width, height: width, flexShrink: 0 }}
      resizeMode="contain"
    />
  );
}
