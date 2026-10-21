// Графикийн цэвэр тооцоолол (тесттэй).

export function extent(values: number[]): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!Number.isFinite(min)) return [0, 1];
  if (min === max) return [min - 1, max + 1];
  return [min, max];
}

/** Утгуудыг SVG polyline-ийн «x,y x,y» цэгүүд болгоно. */
export function linePoints(
  values: number[],
  width: number,
  height: number,
  pad = 2,
  domain: [number, number] = extent(values),
): string {
  if (values.length === 0 || width <= 0) return '';
  const [min, max] = domain;
  const span = max - min || 1;
  const stepX = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
  return values
    .map((v, i) => {
      const x = pad + i * stepX;
      const y = pad + (1 - (v - min) / span) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

/** Хувийн өөрчлөлт (эхний → сүүлийн). */
export function changePct(values: number[]): number | null {
  if (values.length < 2 || values[0] === 0) return null;
  return (values[values.length - 1] / values[0] - 1) * 100;
}

/** F&G 0–100-г хагас тойргийн өнцөг (радиан, π→0) болгоно. */
export function gaugeAngle(value: number): number {
  const v = Math.min(100, Math.max(0, value));
  return Math.PI * (1 - v / 100);
}

/** Heatmap-ийн өнгөний эрч 0–1 (|%| / cap). */
export function heatIntensity(changePctValue: number, cap = 20): number {
  return Math.min(1, Math.abs(changePctValue) / cap);
}
