// Pure-JS palette extraction. Uses k-means in OKLab space for
// perceptually meaningful clusters, then converts back to sRGB hex.
// No external deps. Runs on a downsampled <canvas> for speed.

export interface Swatch {
  hex: string;
  rgb: [number, number, number];
  oklch: [number, number, number]; // L, C, h(deg)
  population: number; // 0..1 share of sampled pixels
  name: string;
}

// ---------- color space conversions ----------

const srgbToLinear = (c: number) => {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
};
const linearToSrgb = (c: number) => {
  const x = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(1, x)) * 255);
};

// sRGB -> OKLab (Björn Ottosson)
function rgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  return [
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  ];
}

function oklabToRgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return [linearToSrgb(lr), linearToSrgb(lg), linearToSrgb(lb)];
}

function oklabToOklch(L: number, a: number, b: number): [number, number, number] {
  const C = Math.sqrt(a * a + b * b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return [L, C, h];
}

function oklchToOklab(L: number, C: number, h: number): [number, number, number] {
  const r = (h * Math.PI) / 180;
  return [L, C * Math.cos(r), C * Math.sin(r)];
}

export function oklchToHex(L: number, C: number, h: number): string {
  const [a, b, c] = oklchToOklab(L, C, h);
  return rgbToHex(...oklabToRgb(a, b, c));
}

export function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

export function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  const v = parseInt(m, 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

// ---------- naming (rough perceptual buckets) ----------

// Hue buckets tuned for OKLCH hue angles (perceptually uniform, so ranges
// differ from HSL). Brown/tan emerges from low-L + low-C orange/red, handled below.
const HUE_NAMES: { max: number; name: string }[] = [
  { max: 20, name: "Red" },
  { max: 50, name: "Orange" },
  { max: 75, name: "Amber" },
  { max: 105, name: "Yellow" },
  { max: 165, name: "Green" },
  { max: 210, name: "Teal" },
  { max: 255, name: "Blue" },
  { max: 295, name: "Indigo" },
  { max: 330, name: "Magenta" },
  { max: 355, name: "Pink" },
  { max: 360, name: "Red" },
];

export function nameColor(L: number, C: number, h: number): string {
  // Achromatic (true grays)
  if (C < 0.025) {
    if (L < 0.18) return "Black";
    if (L < 0.4) return "Charcoal";
    if (L < 0.65) return "Gray";
    if (L < 0.88) return "Silver";
    return "White";
  }

  const hue = HUE_NAMES.find((b) => h <= b.max)?.name ?? "Color";

  // Earth tones: low-chroma warm hues at mid lightness are "tan/beige/brown",
  // not "light orange". Catches things like #A67467 (dusty pink) and #D0B5A6 (beige).
  const isWarm = hue === "Red" || hue === "Orange" || hue === "Amber" || hue === "Yellow";
  if (C < 0.06 && isWarm) {
    if (L < 0.35) return "Brown";
    if (L < 0.55) return "Taupe";
    if (L < 0.75) return "Tan";
    return "Beige";
  }
  // Cool low-chroma → slate family
  if (C < 0.05 && !isWarm) {
    if (L < 0.4) return "Slate";
    if (L < 0.7) return "Stone";
    return "Mist";
  }

  // Saturation qualifier for muted-but-not-gray colors
  const muted = C < 0.1 ? "Muted " : C < 0.16 ? "Dusty " : "";
  // Lightness qualifier
  const tone = L < 0.3 ? "Deep " : L < 0.5 ? "Dark " : L < 0.7 ? "" : L < 0.85 ? "Light " : "Pale ";
  return `${tone}${muted}${hue}`.trim().replace(/\s+/g, " ");
}

// ---------- contrast ----------

function relativeLuminance(r: number, g: number, b: number) {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}
export function contrastRatio(hexA: string, hexB: string) {
  const a = relativeLuminance(...hexToRgb(hexA));
  const b = relativeLuminance(...hexToRgb(hexB));
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}
export function bestForeground(hex: string): "#FFFFFF" | "#0A0A0A" {
  return contrastRatio(hex, "#FFFFFF") >= contrastRatio(hex, "#0A0A0A") ? "#FFFFFF" : "#0A0A0A";
}

// ---------- k-means in OKLab ----------

interface Pixel {
  L: number;
  a: number;
  b: number;
}

function sampleImage(img: HTMLImageElement, maxDim = 160): Pixel[] {
  const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * ratio));
  const h = Math.max(1, Math.round(img.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const pixels: Pixel[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 200) continue; // skip transparent
    const [L, a, b] = rgbToOklab(data[i], data[i + 1], data[i + 2]);
    pixels.push({ L, a, b });
  }
  return pixels;
}

// Mulberry32: tiny seeded PRNG. Deterministic results for the same seed.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Hash the pixel buffer so identical images produce identical seeds.
function hashPixels(pixels: Pixel[]): number {
  let h = 2166136261 >>> 0;
  // Sample every Nth pixel for speed; still stable for the same input.
  const stride = Math.max(1, Math.floor(pixels.length / 2048));
  for (let i = 0; i < pixels.length; i += stride) {
    const p = pixels[i];
    h ^= Math.round(p.L * 1000);
    h = Math.imul(h, 16777619);
    h ^= Math.round(p.a * 1000);
    h = Math.imul(h, 16777619);
    h ^= Math.round(p.b * 1000);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function kmeans(pixels: Pixel[], k: number, iterations = 25) {
  if (pixels.length === 0) return [];
  const rand = mulberry32(hashPixels(pixels) ^ (k * 0x9e3779b1));

  // k-means++ init with seeded PRNG
  const centers: Pixel[] = [pixels[Math.floor(rand() * pixels.length)]];
  while (centers.length < k) {
    const dists = pixels.map((p) => {
      let min = Infinity;
      for (const c of centers) {
        const d = (p.L - c.L) ** 2 + (p.a - c.a) ** 2 + (p.b - c.b) ** 2;
        if (d < min) min = d;
      }
      return min;
    });
    const total = dists.reduce((a, b) => a + b, 0);
    let r = rand() * total;
    let idx = 0;
    for (let i = 0; i < dists.length; i++) {
      r -= dists[i];
      if (r <= 0) {
        idx = i;
        break;
      }
    }
    centers.push(pixels[idx]);
  }

  const assign = new Int32Array(pixels.length);
  let prevShift = Infinity;
  for (let iter = 0; iter < iterations; iter++) {
    // assign
    for (let i = 0; i < pixels.length; i++) {
      const p = pixels[i];
      let best = 0;
      let bestD = Infinity;
      for (let j = 0; j < centers.length; j++) {
        const c = centers[j];
        const d = (p.L - c.L) ** 2 + (p.a - c.a) ** 2 + (p.b - c.b) ** 2;
        if (d < bestD) {
          bestD = d;
          best = j;
        }
      }
      assign[i] = best;
    }
    // update + measure shift for early termination
    const sums = centers.map(() => ({ L: 0, a: 0, b: 0, n: 0 }));
    for (let i = 0; i < pixels.length; i++) {
      const s = sums[assign[i]];
      const p = pixels[i];
      s.L += p.L;
      s.a += p.a;
      s.b += p.b;
      s.n++;
    }
    let shift = 0;
    for (let j = 0; j < centers.length; j++) {
      const s = sums[j];
      if (s.n > 0) {
        const nL = s.L / s.n;
        const na = s.a / s.n;
        const nb = s.b / s.n;
        shift += (centers[j].L - nL) ** 2 + (centers[j].a - na) ** 2 + (centers[j].b - nb) ** 2;
        centers[j] = { L: nL, a: na, b: nb };
      }
    }
    if (shift < 1e-7 || Math.abs(prevShift - shift) < 1e-9) break;
    prevShift = shift;
  }

  // populations
  const pops = new Array(centers.length).fill(0);
  for (let i = 0; i < assign.length; i++) pops[assign[i]]++;
  return centers.map((c, i) => ({ center: c, count: pops[i] }));
}

export async function extractSwatches(file: File, k = 6): Promise<Swatch[]> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.crossOrigin = "anonymous";
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Could not load image"));
      i.src = url;
    });
    const pixels = sampleImage(img);
    if (pixels.length === 0) throw new Error("Image has no opaque pixels");
    const clusters = kmeans(pixels, k);
    const total = clusters.reduce((a, c) => a + c.count, 0) || 1;
    return clusters
      .map(({ center, count }) => {
        const [r, g, b] = oklabToRgb(center.L, center.a, center.b);
        const [L, C, h] = oklabToOklch(center.L, center.a, center.b);
        return {
          hex: rgbToHex(r, g, b),
          rgb: [r, g, b] as [number, number, number],
          oklch: [L, C, h] as [number, number, number],
          population: count / total,
          name: nameColor(L, C, h),
        };
      })
      .sort((a, b) => b.population - a.population);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---------- brand palette generation ----------

export type PaletteScheme =
  | "complementary"
  | "analogous"
  | "triadic"
  | "split-complementary"
  | "monochrome";

export interface BrandPalette {
  scheme: PaletteScheme;
  description: string;
  primary: string;
  secondary: string;
  accent: string;
  neutralDark: string;
  neutralLight: string;
}

const SCHEME_DESC: Record<PaletteScheme, string> = {
  complementary: "Bold, high-contrast. Primary + its opposite hue.",
  analogous: "Calm, harmonious. Hues sitting next to each other.",
  triadic: "Vibrant, balanced. Three hues evenly spaced.",
  "split-complementary": "Striking but softer than complementary.",
  monochrome: "Refined, single-hue with tonal variation.",
};

const wrap = (h: number) => ((h % 360) + 360) % 360;

// Adjust chroma so derived colors aren't muddy (gray seed -> small chroma).
function tone(L: number, C: number, h: number, dL: number, dC: number): string {
  return oklchToHex(
    Math.max(0.05, Math.min(0.97, L + dL)),
    Math.max(0, Math.min(0.4, C + dC)),
    h,
  );
}

export function buildPalettes(seed: Swatch): BrandPalette[] {
  const [L, C, h] = seed.oklch;
  // Ensure usable chroma for very desaturated seeds
  const baseC = Math.max(C, 0.08);
  const baseL = L < 0.25 ? 0.45 : L > 0.85 ? 0.65 : L;
  const primary = oklchToHex(baseL, baseC, h);

  const neutralDark = oklchToHex(0.18, Math.min(0.02, C * 0.2), h);
  const neutralLight = oklchToHex(0.96, Math.min(0.02, C * 0.2), h);

  return [
    {
      scheme: "complementary",
      description: SCHEME_DESC.complementary,
      primary,
      secondary: oklchToHex(baseL, baseC * 0.9, wrap(h + 180)),
      accent: oklchToHex(Math.min(0.85, baseL + 0.15), baseC, wrap(h + 180)),
      neutralDark,
      neutralLight,
    },
    {
      scheme: "analogous",
      description: SCHEME_DESC.analogous,
      primary,
      secondary: oklchToHex(baseL, baseC, wrap(h + 30)),
      accent: oklchToHex(baseL, baseC, wrap(h - 30)),
      neutralDark,
      neutralLight,
    },
    {
      scheme: "triadic",
      description: SCHEME_DESC.triadic,
      primary,
      secondary: oklchToHex(baseL, baseC, wrap(h + 120)),
      accent: oklchToHex(baseL, baseC, wrap(h + 240)),
      neutralDark,
      neutralLight,
    },
    {
      scheme: "split-complementary",
      description: SCHEME_DESC["split-complementary"],
      primary,
      secondary: oklchToHex(baseL, baseC, wrap(h + 150)),
      accent: oklchToHex(baseL, baseC, wrap(h + 210)),
      neutralDark,
      neutralLight,
    },
    {
      scheme: "monochrome",
      description: SCHEME_DESC.monochrome,
      primary,
      secondary: tone(baseL, baseC, h, -0.2, -0.02),
      accent: tone(baseL, baseC, h, 0.2, -0.04),
      neutralDark,
      neutralLight,
    },
  ];
}
