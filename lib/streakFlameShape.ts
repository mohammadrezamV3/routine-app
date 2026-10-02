// هندسه و رنگ شعله‌ی بزرگ استریک — مشترک شعله‌ی زنده (AnimatedStreakFlame،
// SVG با مورف مسیر) و کارت اشتراکی (lib/shareCard.ts، canvas). هر فریم از یک
// تابع پارامتری ساخته می‌شه، پس همه‌ی فریم‌ها دقیقا یک ساختار فرمان دارن و
// <animate attributeName="d"> بینشون نرم مورف می‌کنه (شعله واقعا «می‌سوزه»،
// نه فقط بزرگ/کوچیک شدن یه آیکون ثابت).

import { getStreakTier } from "./streakTier";

export type FlameFrame = { w: number; h: number; sway: number; lick: number; bulge: number };

/**
 * زبانه‌ی شعله: پایه‌ی گرد در (cx, by)، نوک در ارتفاع h با انحراف افقی sway،
 * و یک «لیس» کناری (lick) که شعله رو نامتقارن و زنده نشون می‌ده.
 */
export function flamePath(cx: number, by: number, f: FlameFrame): string {
  const r = f.w / 2;
  const { h, sway, lick, bulge } = f;
  const n = (v: number) => Math.round(v * 10) / 10;
  return [
    `M${n(cx)} ${n(by)}`,
    `C${n(cx - r * (1.08 + bulge))} ${n(by)} ${n(cx - r * (1.18 + bulge))} ${n(by - h * 0.44)} ${n(cx - r * 0.66)} ${n(by - h * 0.64)}`,
    `C${n(cx - r * 0.42 + lick)} ${n(by - h * 0.76)} ${n(cx - r * 0.12 + sway * 0.55)} ${n(by - h * 0.86)} ${n(cx + sway)} ${n(by - h)}`,
    `C${n(cx + r * 0.3 + sway * 0.35)} ${n(by - h * 0.82)} ${n(cx + r * (0.98 + bulge) - lick * 0.3)} ${n(by - h * 0.72)} ${n(cx + r * 0.9)} ${n(by - h * 0.46)}`,
    `C${n(cx + r * (1.14 + bulge))} ${n(by - h * 0.14)} ${n(cx + r * 0.72)} ${n(by)} ${n(cx)} ${n(by)}`,
    "Z",
  ].join(" ");
}

/** فریم‌های هر لایه (بیرونی/میانی/هسته) — ضرب در اندازه‌ی لایه */
export const FLAME_LAYERS = [
  {
    key: "outer",
    base: { w: 150, h: 200 },
    dur: 1.05,
    frames: [
      { sway: -6, lick: 6, dh: 0, bulge: 0 },
      { sway: 12, lick: -10, dh: 8, bulge: 0.04 },
      { sway: -12, lick: 12, dh: -6, bulge: -0.02 },
      { sway: 6, lick: -4, dh: 10, bulge: 0.03 },
    ],
  },
  {
    key: "mid",
    base: { w: 100, h: 138 },
    dur: 0.8,
    frames: [
      { sway: 5, lick: -5, dh: 0, bulge: 0 },
      { sway: -9, lick: 7, dh: 7, bulge: 0.05 },
      { sway: 8, lick: -8, dh: -5, bulge: -0.03 },
      { sway: -4, lick: 4, dh: 9, bulge: 0.02 },
    ],
  },
  {
    key: "core",
    base: { w: 56, h: 78 },
    dur: 0.62,
    frames: [
      { sway: -3, lick: 3, dh: 0, bulge: 0 },
      { sway: 5, lick: -4, dh: 5, bulge: 0.06 },
      { sway: -5, lick: 5, dh: -3, bulge: -0.04 },
      { sway: 2, lick: -2, dh: 6, bulge: 0.03 },
    ],
  },
] as const;

export type FlameLayerKey = (typeof FLAME_LAYERS)[number]["key"];

export function layerFrame(layer: (typeof FLAME_LAYERS)[number], i: number): FlameFrame {
  const fr = layer.frames[i % layer.frames.length];
  return { w: layer.base.w, h: layer.base.h + fr.dh, sway: fr.sway, lick: fr.lick, bulge: fr.bulge };
}

export type FlamePalette = Record<FlameLayerKey, [string, string]> & {
  glow: string;
  /** ریشه‌ی تیره‌ی لایه‌ی پشتی (عمق شعله) */
  deep: string;
  /** مرکز سفید-داغ */
  hot: string;
  /** رنگ اخگرها و تکه‌های جداشده */
  ember: string;
};

// رنگ‌ها هم‌خانواده‌ی شعله‌ی کوچیک هدر (globals.css → .streak-flame-tierN):
// نارنجی دوالینگویی تا ماهانه، بعد قرمز، بنفش، آبی و در آخر طلایی.
const PALETTES: FlamePalette[] = [
  { outer: ["#FFA41B", "#FF5A00"], mid: ["#FFD233", "#FF9600"], core: ["#FFF8D6", "#FFE27A"], glow: "255,140,0", deep: "#D2350A", hot: "#FFFFFF", ember: "#FFD27A" },
  { outer: ["#FF7A1A", "#E8231A"], mid: ["#FFC23A", "#FF6A00"], core: ["#FFF3CC", "#FFD66B"], glow: "255,80,20", deep: "#A3120E", hot: "#FFFDF2", ember: "#FFB36B" },
  { outer: ["#C77DFF", "#7B2FF7"], mid: ["#FF8BD8", "#C77DFF"], core: ["#FFEAFB", "#FFC2F0"], glow: "168,85,247", deep: "#4A12B8", hot: "#FFFFFF", ember: "#FFB8F0" },
  { outer: ["#7FA6FF", "#3346E0"], mid: ["#9BE7FF", "#6E9BFF"], core: ["#F0FBFF", "#C6F1FF"], glow: "91,124,250", deep: "#1E2A9E", hot: "#FFFFFF", ember: "#B9ECFF" },
  { outer: ["#FFD000", "#FF8A00"], mid: ["#FFF07A", "#FFD000"], core: ["#FFFFFF", "#FFF6C2"], glow: "255,196,0", deep: "#D85F00", hot: "#FFFFFF", ember: "#FFF2A6" },
];

export function flamePalette(days: number): FlamePalette {
  const { tier } = getStreakTier(days);
  if (tier >= 8) return PALETTES[4];
  if (tier === 7) return PALETTES[3];
  if (tier === 6) return PALETTES[2];
  if (tier >= 4) return PALETTES[1];
  return PALETTES[0];
}

/** کادر کامل شعله (برای viewBox و canvas) */
export const FLAME_BOX = { w: 200, h: 236, cx: 100, by: 226 };

// ── آتش رویه‌ای (procedural) — شعله‌ی زنده‌ی بزرگ ─────────────────────────
// هر لایه یک بدنه‌ی چندزبانه‌ست که نقطه‌هاش با «نویز» جمع چند سینوس با
// دوره‌های نامتوافق (2.3، 3.7، 1.31، 0.53 و 0.29 ثانیه) حرکت می‌کنن؛ ک.م.م
// این دوره‌ها عملا بی‌نهایته، پس شکل کلی هیچ‌وقت تکرار دیده‌شدنی نداره.
// همه‌چیز تابع خالص زمانه: رندر سرور و کلاینت برای t یکسان دقیقا یک خروجی
// می‌دن (بدون Math.random، بدون hydration mismatch).

const TAU = Math.PI * 2;

/** نویز نرم در بازه‌ی تقریبی [-1, 1] — seed فاز هر مولفه رو جابه‌جا می‌کنه */
export function fireNoise(t: number, seed: number): number {
  const s = seed * 1.6180339;
  return (
    Math.sin((TAU * t) / 2.3 + s * 3.1) * 0.46 +
    Math.sin((TAU * t) / 3.7 + s * 7.7) * 0.3 +
    Math.sin((TAU * t) / 1.31 + s * 5.3) * 0.22 +
    Math.sin((TAU * t) / 0.53 + s * 11.9) * 0.12 +
    Math.sin((TAU * t) / 0.29 + s * 17.3) * 0.06
  ) / 1.16;
}

export type FireLayerKey = "deep" | "outer" | "mid" | "core" | "hot";
export type FireLayer = {
  key: FireLayerKey;
  /** عرض و ارتفاع پایه‌ی لایه (واحد viewBox) */
  w: number;
  h: number;
  /** بالاتر نشستن پایه‌ی لایه نسبت به پایه‌ی کل شعله */
  lift: number;
  /** زبانه‌ها: x در [-0.5, 0.5] عرض، h کسری از ارتفاع */
  tongues: readonly { x: number; h: number }[];
  /** شدت حرکت */
  amp: number;
  seed: number;
  /** ضریب سرعت زمان این لایه */
  speed: number;
};

export const FIRE_LAYERS: readonly FireLayer[] = [
  { key: "deep", w: 156, h: 222, lift: 0, amp: 1.2, seed: 1.3, speed: 0.82, tongues: [{ x: -0.36, h: 0.62 }, { x: -0.12, h: 0.84 }, { x: 0.12, h: 1 }, { x: 0.38, h: 0.52 }] },
  { key: "outer", w: 150, h: 206, lift: 2, amp: 1, seed: 2.9, speed: 1, tongues: [{ x: -0.36, h: 0.5 }, { x: 0.05, h: 1 }, { x: 0.35, h: 0.64 }] },
  { key: "mid", w: 114, h: 162, lift: 5, amp: 0.9, seed: 4.4, speed: 1.12, tongues: [{ x: -0.26, h: 0.58 }, { x: 0.05, h: 1 }, { x: 0.3, h: 0.5 }] },
  { key: "core", w: 76, h: 114, lift: 8, amp: 0.75, seed: 6.1, speed: 1.27, tongues: [{ x: -0.16, h: 0.66 }, { x: 0.08, h: 1 }] },
  { key: "hot", w: 40, h: 66, lift: 10, amp: 0.55, seed: 7.7, speed: 1.45, tongues: [{ x: 0.02, h: 1 }] },
];

type Pt = [number, number, number]; // x, y, k (k کوچیک = گوشه‌ی تیزتر، نوک زبانه)

/** اسپلاین بسته‌ی کاردینال با کشش متغیر برای هر نقطه → مسیر bezier */
function closedSpline(pts: Pt[]): string {
  const n = (v: number) => Math.round(v * 10) / 10;
  const L = pts.length;
  let d = `M${n(pts[0][0])} ${n(pts[0][1])}`;
  for (let i = 0; i < L; i++) {
    const p0 = pts[(i - 1 + L) % L], p1 = pts[i], p2 = pts[(i + 1) % L], p3 = pts[(i + 2) % L];
    const k1 = p1[2] / 6, k2 = p2[2] / 6;
    d += `C${n(p1[0] + (p2[0] - p0[0]) * k1)} ${n(p1[1] + (p2[1] - p0[1]) * k1)} ${n(p2[0] - (p3[0] - p1[0]) * k2)} ${n(p2[1] - (p3[1] - p1[1]) * k2)} ${n(p2[0])} ${n(p2[1])}`;
  }
  return d + "Z";
}

export type FireLayerShape = { d: string; tips: [number, number][] };

/**
 * شکل یک لایه در زمان t. intensity شدت حرکت (سطح استریک) رو تنظیم می‌کنه.
 * همه‌ی لایه‌ها یک «باد» مشترک (lean) دارن با کمی تاخیر برای لایه‌های
 * داخلی‌تر، پس با هم خم می‌شن ولی نه کاملا هم‌زمان.
 */
export function fireLayerShape(cx: number, by: number, layer: FireLayer, t: number, intensity = 1): FireLayerShape {
  const W = layer.w, H = layer.h, b = by - layer.lift;
  const amp = layer.amp * intensity;
  const ts = t * layer.speed;
  const lean = fireNoise(t * 0.55 - layer.lift * 0.012, 0.37) * 0.075 * intensity;
  const pts: Pt[] = [];
  const at = (fx: number, fh: number, k: number) => {
    pts.push([cx + fx * W + lean * H * fh * fh, b - H * fh, k]);
  };
  const belly = 0.5 * (1 + 0.035 * amp * fireNoise(ts * 0.8, layer.seed + 0.5));
  at(0, 0, 1);
  at(-0.3, 0.03, 1);
  at(-belly, 0.3, 1);
  const tips: [number, number][] = [];
  let prevH = 0;
  layer.tongues.forEach((tg, i) => {
    const sd = layer.seed + i * 2.71;
    const flick = Math.max(0, fireNoise(ts * 1.6, sd + 9.1)) ** 3;
    const th = tg.h * (1 + 0.12 * amp * fireNoise(ts, sd) + 0.16 * amp * flick);
    if (i > 0) {
      const prev = layer.tongues[i - 1];
      const vh = Math.min(prevH, th) * (0.6 + 0.07 * fireNoise(ts * 1.2, sd + 4.2));
      at((prev.x + tg.x) / 2 + 0.02 * amp * fireNoise(ts * 0.9, sd + 1.7), vh, 0.95);
    }
    const tx = tg.x + 0.055 * amp * fireNoise(ts * 1.25, sd + 3.3) * th;
    at(tx, th, layer.tongues.length === 1 ? 0.55 : 0.45);
    const last = pts[pts.length - 1];
    tips.push([last[0], last[1]]);
    prevH = th;
  });
  at(belly, 0.3, 1);
  at(0.3, 0.03, 1);
  return { d: closedSpline(pts), tips };
}

/** تکه‌ی جداشده‌ی شعله (قطره‌ی رو به بالا) دور مبدا، ارتفاع حدود 20 */
export const FIRE_WISP_PATH = "M0 -12C2.6 -6.5 6 -2.6 6 2.4A6 6 0 0 1 -6 2.4C-6 -2.6 -2.6 -6.5 0 -12Z";

/** شدت حرکت بر اساس سطح استریک — سطح بالاتر، شعله‌ی وحشی‌تر */
export function fireIntensity(days: number): number {
  const { tier } = getStreakTier(days);
  return 0.85 + Math.min(tier, 8) * 0.035;
}

/** مولد شبه‌تصادفی قطعی (mulberry32) — برای اخگرها، فقط سمت کلاینت داخل effect */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let r = Math.imul(a ^ (a >>> 15), 1 | a);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
