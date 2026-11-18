/**
 * Water colour by depth: surface teal → deep blue → near-black.
 * Linear blend between stops, in sRGB (good enough at these darks).
 */
const STOPS: [depth: number, hex: string][] = [
  [0, '#1f7fa6'],
  [300, '#145a84'],
  [1000, '#0c3356'],
  [3000, '#081c33'],
  [7000, '#03060c'],
];

const toRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

export function waterColour(depth: number): string {
  const d = Math.max(0, depth);
  for (let i = 1; i < STOPS.length; i++) {
    const [d1, c1] = STOPS[i];
    if (d <= d1 || i === STOPS.length - 1) {
      const [d0, c0] = STOPS[i - 1];
      const t = Math.min(1, (d - d0) / (d1 - d0));
      const a = toRgb(c0);
      const b = toRgb(c1);
      const mix = a.map((v, j) => Math.round(v + (b[j] - v) * t));
      return `rgb(${mix.join(',')})`;
    }
  }
  return STOPS[STOPS.length - 1][1];
}

/** How much drifting "marine snow" to show: 1 near the surface, fading towards 0.2. */
export function snowDensity(depth: number): number {
  return Math.max(0.2, 1 - depth / 6000);
}
