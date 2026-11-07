// Сайтын дэвсгэр «Royal Violet» (хэрэглэгчийн prompt, PROGRESS D76): хар одот тэнгэр + дээд талд гаригийн ягаан
// гэрэлтэх хүрээ. Хэвлэхэд нуугдана (`[data-sky]`, +html.tsx).
// - Одод: canvas дээр нэг удаа зурна (seed-тэй тул ачаалал бүрд ижил). Өндөр нь дэлгэцийн өндөр тул мобайлын URL мөр
//   нуугдах/гарахад дахин зурж «үсрэхгүй» — зөвхөн өргөн өөрчлөгдөх эсвэл цонх өндөрсөхөд дахин зурна.
// - Хүрээ: эхлээд CSS градиент (мобайл, reduced-motion, видео ачаалагдах хүртэл); desktop-д видео
//   `mix-blend-mode: screen`-ээр (хар хэсэг нь тунгалаг) 0.8с-д гарч ирнэ. Тэнгэрийг кодоор хөдөлгөхгүй.
import { useEffect, useRef, useState } from 'react';

const RIM_VIDEO =
  'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/e859f229-8ebd-43fb-a5a0-58006ba75327.mp4';

// Гаригийн дээд хүрээ (видеоны оронд): төв нь доор, том хавтгай эллипсийн дээд ирмэг дагуух нимгэн гэрэл.
// Ирмэг нь дээд талаас ≈6%-д, хоёр тал руугаа зөөлөн буудаг тул гарчигтай давхцахгүй.
const RIM_FALLBACK = [
  'radial-gradient(ellipse 140% 94% at 50% 100%, transparent 0 97.2%, rgba(236,190,255,0.95) 98.3%, rgba(160,32,255,0.65) 99.2%, rgba(122,28,248,0.28) 101.5%, transparent 107%)',
  'radial-gradient(ellipse 60% 30% at 50% 0%, rgba(147,18,255,0.16), transparent 75%)',
].join(', ');

// Canvas-ын хамгийн их пикселийн тоо (≈16 MB): том HiDPI дэлгэцэд санах ой хэмнэнэ (одод жижиг тул ялгаагүй)
const MAX_PIXELS = 4_000_000;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** w×h (CSS px) хэмжээтэй, зүүн дээд буланд бэхлэгдсэн canvas-д одод зурна. */
function drawStars(canvas: HTMLCanvasElement, w: number, h: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(MAX_PIXELS / (w * h)));
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  const rand = mulberry32(7);
  const count = Math.round((w * h) / 2600);
  for (let i = 0; i < count; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const big = rand() > 0.94;
    const r = big ? 0.9 + rand() * 0.7 : 0.25 + rand() * 0.55;
    ctx.globalAlpha = big ? 0.75 + rand() * 0.25 : 0.25 + rand() * 0.5;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function Sky() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [video, setVideo] = useState(false); // desktop, landscape, motion зөвшөөрөгдсөн
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let drawn = { w: 0, h: 0 };
    const update = () => {
      // Нуугдмал/0 өргөнтэй цонхонд ч зурагдана (дараагийн resize-д бодит хэмжээгээр дахин)
      const w = window.innerWidth || document.documentElement.clientWidth || 1280;
      const h = Math.max(window.innerHeight || 800, window.screen.height || 0);
      if (w !== drawn.w || h > drawn.h) {
        drawStars(c, w, h);
        drawn = { w, h };
      }
      const v = !reduce && window.innerWidth >= 900 && window.innerWidth > window.innerHeight;
      setVideo(v);
      if (!v) setReady(false); // видео хасагдвал градиент хүрээ буцаж харагдана
    };
    update();
    let t: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(update, 150);
    };
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div
      aria-hidden
      data-sky=""
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        overflow: 'hidden',
        background: '#000',
      }}
    >
      <canvas ref={canvas} style={{ position: 'absolute', top: 0, left: 0 }} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: RIM_FALLBACK,
          opacity: ready ? 0 : 1,
          transition: 'opacity .8s ease',
        }}
      />
      {video ? (
        <video
          src={RIM_VIDEO}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onCanPlay={() => setReady(true)}
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            // Цонхны өргөнөөр — хүрээ үргэлж гарчгийн дээд талд (томруулбал гэрэлт төв гарчгийн ард ордог)
            width: '100vw',
            mixBlendMode: 'screen',
            opacity: ready ? 1 : 0,
            transition: 'opacity .8s ease',
          }}
        />
      ) : null}
    </div>
  );
}
