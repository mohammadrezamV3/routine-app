// هندسه و رنگِ شعله‌ی بزرگِ استریک — مشترکِ شعله‌ی زنده (AnimatedStreakFlame،
// SVG با مورفِ مسیر) و کارتِ اشتراکی (lib/shareCard.ts، canvas). هر فریم از یک
// تابعِ پارامتری ساخته می‌شه، پس همه‌ی فریم‌ها دقیقا یک ساختارِ فرمان دارن و
// <animate attributeName="d"> بینشون نرم مورف می‌کنه (شعله واقعا «می‌سوزه»،
// نه فقط بزرگ/کوچیک شدنِ یه آیکونِ ثابت).

import { getStreakTier } from "./streakTier";

export type FlameFrame = { w: number; h: number; sway: number; lick: number; bulge: number };

/**
 * زبانه‌ی شعله: پایه‌ی گرد در (cx, by)، نوک در ارتفاعِ h با انحرافِ افقیِ sway،
 * و یک «لیسِ» کناری (lick) که شعله رو نامتقارن و زنده نشون می‌ده.
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

export type FlamePalette = Record<FlameLayerKey, [string, string]> & { glow: string };

// رنگ‌ها هم‌خانواده‌ی شعله‌ی کوچیکِ هدر (globals.css → .streak-flame-tierN):
// نارنجیِ دوالینگویی تا ماهانه، بعد قرمز، بنفش، آبی و در آخر طلایی.
const PALETTES: FlamePalette[] = [
  { outer: ["#FFA41B", "#FF5A00"], mid: ["#FFD233", "#FF9600"], core: ["#FFF8D6", "#FFE27A"], glow: "255,140,0" },
  { outer: ["#FF7A1A", "#E8231A"], mid: ["#FFC23A", "#FF6A00"], core: ["#FFF3CC", "#FFD66B"], glow: "255,80,20" },
  { outer: ["#C77DFF", "#7B2FF7"], mid: ["#FF8BD8", "#C77DFF"], core: ["#FFEAFB", "#FFC2F0"], glow: "168,85,247" },
  { outer: ["#7FA6FF", "#3346E0"], mid: ["#9BE7FF", "#6E9BFF"], core: ["#F0FBFF", "#C6F1FF"], glow: "91,124,250" },
  { outer: ["#FFD000", "#FF8A00"], mid: ["#FFF07A", "#FFD000"], core: ["#FFFFFF", "#FFF6C2"], glow: "255,196,0" },
];

export function flamePalette(days: number): FlamePalette {
  const { tier } = getStreakTier(days);
  if (tier >= 8) return PALETTES[4];
  if (tier === 7) return PALETTES[3];
  if (tier === 6) return PALETTES[2];
  if (tier >= 4) return PALETTES[1];
  return PALETTES[0];
}

/** کادرِ کاملِ شعله (برای viewBox و canvas) */
export const FLAME_BOX = { w: 200, h: 236, cx: 100, by: 226 };
