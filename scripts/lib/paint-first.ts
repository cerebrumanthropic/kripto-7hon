// Статик HTML-ийн `<script defer src>`-ийг анхны агуулга дэлгэцэнд гарсны дараа ачаалах жижиг loader-оор солино
// (PROGRESS D57). Шалтгаан: CDN хурдан үед скрипт парс дуусахаас өмнө бэлэн болж, анхны paint-аас өмнө
// ажилладаг байсан — Lighthouse (Lantern) бүх JS-ийг render-blocking гэж тооцож FCP ≈4.5 сек болгосон.
// Preload холбоосууд `<head>`-д үлдэх тул татан авалт эрт эхэлнэ; гүйцэтгэх дараалал `async=false`-оор хадгалагдана.

const DEFER_SCRIPT = /<script defer="" src="([^"]+)"><\/script>/g;

/**
 * `first-contentful-paint` (PerformanceObserver) дэлгэцэнд гарсны дараа скриптийг оруулна — rAF-ийн дараах
 * task нь frame дэлгэцэнд гарахаас (raster) өмнө ирдэг тул хангалтгүй байсан.
 * Fallback: paint timing-гүй хөтөч — rAF + 400ms; арын таб (rAF/paint зогсдог) — 2.5 сек.
 */
export function loaderScript(srcs: string[]): string {
  return (
    '<script>(function(){var s=' +
    JSON.stringify(srcs) +
    ',d=0;function go(){if(d)return;d=1;for(var i=0;i<s.length;i++){var e=document.createElement("script");' +
    'e.src=s[i];e.async=false;document.body.appendChild(e)}}' +
    'try{new PerformanceObserver(function(l){if(l.getEntriesByName("first-contentful-paint").length)setTimeout(go,0)})' +
    '.observe({type:"paint",buffered:true})}catch(e){}' +
    'requestAnimationFrame(function(){setTimeout(go,400)});setTimeout(go,2500)})()</script>'
  );
}

/** Defer скриптгүй бол HTML-ийг өөрчлөхгүй (давтан ажиллуулахад аюулгүй). */
export function paintFirst(html: string): string {
  const srcs = [...html.matchAll(DEFER_SCRIPT)].map((m) => m[1]);
  if (srcs.length === 0) return html;
  let first = true;
  return html.replace(DEFER_SCRIPT, () => {
    if (!first) return '';
    first = false;
    return loaderScript(srcs);
  });
}
