// Нүүрний hero-ийн баруун талын хөдөлгөөнт зураг (олон хэлтэй voicebot, PROGRESS D71).
// Эх GIF 47.7 MB байсныг ffmpeg-ээр 560px animated WebP болгосон (тунгалаг дэвсгэр хадгалагдана).
// Зөвхөн desktop-д (дуудагч нь `isDesktop` үед л render хийнэ) — мобайл болон Lighthouse-д татагдахгүй.
// `prefers-reduced-motion` үед хөдөлгөөнгүй нэг кадр.
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Image } from 'react-native';

const ANIMATED = '/hero/voicebot.webp';
const STILL = '/hero/voicebot-still.webp';
const RATIO = 1310 / 1440; // эх зургийн өргөн/өндөр

export function HeroArt({ width = 340 }: { width?: number }) {
  const [still, setStill] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setStill)
      .catch(() => {});
  }, []);
  return (
    <Image
      aria-hidden
      source={{ uri: still ? STILL : ANIMATED }}
      style={{ width, height: Math.round(width / RATIO), flexShrink: 0 }}
      resizeMode="contain"
    />
  );
}
