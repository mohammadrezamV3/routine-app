// هندسه و رنگ شعله‌ی بزرگ استریک — مشترک شعله‌ی زنده (AnimatedStreakFlame، SVG)
// و کارت اشتراکی (lib/shareCard.ts، canvas). سبک کارتونی و فانتزی مثل شعله‌ی
// دوالینگو (درخواست صاحب محصول): بدنه‌ی گرد تخت با یک زبانه‌ی کناری، دورگیری
// سفید ضخیم، قطره‌ی زرد داخلی و یک برق براق. شکل هر فریم تابع خالص زمانه.

import { getStreakTier } from "./streakTier";

export type FlamePalette = Record<"outer" | "mid" | "core", [string, string]> & {
  /** رنگ‌های تخت شعله‌ی کارتونی: بدنه، سایه‌ی بدنه، قطره‌ی داخلی، روشنی قطره */
  toon: { body: string; shade: string; inner: string; innerHi: string };
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
  { toon: { body: "#FF9600", shade: "#FF7300", inner: "#FFC800", innerHi: "#FFE65C" }, outer: ["#FFA41B", "#FF5A00"], mid: ["#FFD233", "#FF9600"], core: ["#FFF8D6", "#FFE27A"], glow: "255,140,0", deep: "#D2350A", hot: "#FFFFFF", ember: "#FFD27A" },
  { toon: { body: "#FF5A1F", shade: "#E2301A", inner: "#FFB020", innerHi: "#FFD866" }, outer: ["#FF7A1A", "#E8231A"], mid: ["#FFC23A", "#FF6A00"], core: ["#FFF3CC", "#FFD66B"], glow: "255,80,20", deep: "#A3120E", hot: "#FFFDF2", ember: "#FFB36B" },
  { toon: { body: "#A55BFF", shade: "#7B2FF7", inner: "#FF9BE0", innerHi: "#FFD2F4" }, outer: ["#C77DFF", "#7B2FF7"], mid: ["#FF8BD8", "#C77DFF"], core: ["#FFEAFB", "#FFC2F0"], glow: "168,85,247", deep: "#4A12B8", hot: "#FFFFFF", ember: "#FFB8F0" },
  { toon: { body: "#4C7DFF", shade: "#2F45DA", inner: "#8FE3FF", innerHi: "#D2F6FF" }, outer: ["#7FA6FF", "#3346E0"], mid: ["#9BE7FF", "#6E9BFF"], core: ["#F0FBFF", "#C6F1FF"], glow: "91,124,250", deep: "#1E2A9E", hot: "#FFFFFF", ember: "#B9ECFF" },
  { toon: { body: "#FFB800", shade: "#FF8A00", inner: "#FFF07A", innerHi: "#FFFCD6" }, outer: ["#FFD000", "#FF8A00"], mid: ["#FFF07A", "#FFD000"], core: ["#FFFFFF", "#FFF6C2"], glow: "255,196,0", deep: "#D85F00", hot: "#FFFFFF", ember: "#FFF2A6" },
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

// ── شعله‌ی کارتونی ─────────────────────────────────────────────────────
// نقطه‌ها در مختصات نرمال: x کسری از عرض (مرکز 0)، h کسری از ارتفاع از پایه.
// k کشش اسپلاین: 1 = گرد، کوچیک = نوک تیزتر (ولی هنوز نرم و کارتونی).

type Pt = [number, number, number]; // x, y, k

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

export type ToonFlameShape = {
  /** بدنه (همین مسیر با stroke سفید ضخیم دورگیری هم می‌شه) */
  body: string;
  /** قطره‌ی زرد داخلی */
  inner: string;
  /** برق براق بالا-چپ بدنه */
  shine: string;
  /** نوک‌ها (برای جرقه‌ها) */
  tips: [number, number][];
};

/**
 * شعله‌ی کارتونی در زمان t، پایه در (cx, by)، عرض W و ارتفاع H.
 * حرکت آرام و «فانتزی»: کش‌اومدن و جمع‌شدن (squash & stretch)، خم‌شدن کل
 * شعله، تکون نوک و زبانه‌ی کناری، و نفس‌کشیدن جدای قطره‌ی داخلی.
 */
export function toonFlameShape(cx: number, by: number, t: number, intensity = 1, W = 150, H = 196): ToonFlameShape {
  const a = intensity;
  const st = 1 + 0.045 * a * fireNoise(t * 1.05, 2.2);
  const h = H * st, w = W / Math.sqrt(st);
  const lean = 0.06 * a * fireNoise(t * 0.55, 0.37);
  const tipX = 0.07 + 0.05 * a * fireNoise(t * 1.35, 3.1);
  const tipH = 1 + 0.03 * a * fireNoise(t * 1.7, 5.9);
  const fl = fireNoise(t * 1.8, 4.4);
  const flX = -0.4 + 0.035 * a * fl;
  const flH = 0.79 + 0.05 * a * fireNoise(t * 1.5, 8.3);
  const bx = (fx: number, fh: number) => cx + fx * w + lean * h * fh * fh;
  const by_ = (fh: number) => by - h * fh;
  const P = (fx: number, fh: number, k: number): Pt => [bx(fx, fh), by_(fh), k];

  const bodyPts: Pt[] = [
    P(0, 0, 1),
    P(-0.354, 0.112, 1),
    P(-0.5, 0.383, 1),
    P(-0.47, 0.58, 1),
    P(flX, flH, 0.42),
    P(-0.2, 0.66, 0.9),
    P(tipX, tipH, 0.42),
    P(0.37, 0.66, 1),
    P(0.5, 0.383, 1),
    P(0.354, 0.112, 1),
  ];

  // قطره‌ی داخلی: پایین‌تر و کمی هم‌جهت با خم بدنه
  const ist = 1 + 0.07 * a * fireNoise(t * 1.6, 6.6);
  const iw = w * 0.54 / Math.sqrt(ist), ih = h * 0.46 * ist, lift = h * 0.07;
  const itx = 0.06 + 0.06 * a * fireNoise(t * 1.9, 7.2);
  const ib = (fx: number, fh: number, k: number): Pt => [cx + fx * iw + lean * h * (0.07 + fh * 0.5) ** 2, by - lift - ih * fh, k];
  const innerPts: Pt[] = [
    ib(0, 0, 1),
    ib(-0.354, 0.064, 1),
    ib(-0.5, 0.24, 1),
    ib(-0.43, 0.5, 1),
    ib(-0.2 + itx * 0.4, 0.82, 1),
    ib(itx, 1, 0.6),
    ib(0.2 + itx * 0.4, 0.82, 1),
    ib(0.43, 0.5, 1),
    ib(0.5, 0.24, 1),
    ib(0.354, 0.064, 1),
  ];

  // برق: یک کپسول خمیده‌ی کوچیک روی شانه‌ی چپ
  const sp: Pt[] = [P(-0.36, 0.34, 1), P(-0.39, 0.46, 1), P(-0.33, 0.55, 0.6), P(-0.3, 0.46, 1), P(-0.29, 0.35, 0.6)];

  return {
    body: closedSpline(bodyPts),
    inner: closedSpline(innerPts),
    shine: closedSpline(sp),
    tips: [[bx(tipX, tipH), by_(tipH)], [bx(flX, flH), by_(flH)]],
  };
}

/** ستاره‌ی چهارپر جرقه دور مبدا (شعاع 10) */
export const SPARKLE_PATH = "M0 -10C1.1 -3 3 -1.1 10 0C3 1.1 1.1 3 0 10C-1.1 3 -3 1.1 -10 0C-3 -1.1 -1.1 -3 0 -10Z";

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
