"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
import { useTheme } from "./ThemeProvider";

// آواتارِ پیش‌فرضِ پروفایل — کامپوننتِ agent-avatar از smoothui، عیناً پورت
// شده (کدِ منبع رو خودِ کاربر داد چون شبکه‌ی این سندباکس به smoothui.dev و
// ui.shadcn.com دسترسی نداره). یه گریدِ ۶×۶ پیکسلِ رنگی که رویِ canvas با
// یه seedِ قطعی (اینجا اسمِ کاربر) رسم می‌شه — هر کاربر همیشه دقیقاً همون
// الگو/پالتِ رنگی رو می‌گیره، با چهار لایه‌ی انیمیشنِ هم‌زمان (pulse تکی‌تکِ
// پیکسل‌ها، breathe سراسری، موجِ مورب، و جرقه‌های تصادفی) — به‌جای حرفِ اولِ
// ثابتِ نسخه‌ی قبلی. با آپلودِ عکسِ واقعی (AccountPanel) این آواتار به‌طور
// کامل جایگزین می‌شه.
export type AgentAvatarProps = Omit<
  React.CanvasHTMLAttributes<HTMLCanvasElement>,
  "children"
> & {
  /** رشته‌ی seed برای تولیدِ الگویِ قطعیِ آواتار (اینجا: اسم/یوزرنیمِ کاربر) */
  seed: string;
  /** قطر به پیکسل */
  size?: number;
  /** فعال/غیرفعال‌کردنِ انیمیشنِ پیکسلی (به prefers-reduced-motion احترام می‌ذاره) */
  animated?: boolean;
};

const GRID_SIZE = 6;

/** Pulse: هر پیکسل روشنیِ خودش رو مستقل نوسان می‌ده */
const PULSE_SPEED = 0.002;
const PULSE_AMPLITUDE = 22;

/** Breathe: نوسانِ کلیِ مقیاس، سراسری و آروم */
const BREATHE_SPEED = 0.001;
const BREATHE_AMPLITUDE = 10;

/** Wave: یه موجِ مورب که رویِ کلِ گرید می‌گذره */
const WAVE_SPEED = 0.0015;
const WAVE_AMPLITUDE = 15;
const WAVE_LENGTH = 3;

/** Sparkle: جرقه‌های روشنِ تصادفی */
const SPARKLE_SPEED = 0.004;
const SPARKLE_THRESHOLD = 0.92;
const SPARKLE_BOOST = 25;

/** Scale pulse: کلِ آواتار توی اندازه نفس می‌کشه */
const SCALE_PULSE_SPEED = 0.0008;
const SCALE_PULSE_AMOUNT = 0.03;

/** بیشینه‌ی پخشِ hue از رنگِ پایه — هرچی بیشتر، تنوعِ رنگیِ غنی‌تر */
const HUE_SPREAD = 45;

const GLOW_RADIUS_RATIO = 0.25;

// عمداً دیگه hueِ پایه از seed تصادفی نمی‌شه — رنگِ آواتار باید با تمِ فعلی
// هماهنگ باشه، نه یوزربه‌یوزر فرق کنه: سبز برای تمِ تاریک، قرمزنارنجی برای
// تمِ روشن — دقیقاً همون hueِ رنگِ accentِ خودِ تم (--accent در globals.css:
// #00A86B تاریک ≈ hue 158، #B85C1F روشن ≈ hue 24) تا با بقیه‌ی UI یکدست بمونه.
const THEME_BASE_HUE: Record<"dark" | "light", number> = { dark: 158, light: 24 };

/** هشِ قطعیِ ساده از یه رشته */
const hashSeed = (str: string): number => {
  let hash = 0;
  for (const char of str) {
    hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  }
  return Math.abs(hash);
};

/** PRNGِ seed‌دار (mulberry32) */
const createRng = (seed: number) => {
  let state = seed;
  return () => {
    state = (state + 0x6d_2b_79_f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
};

type HSL = [hue: number, saturation: number, lightness: number];

/** ساختِ پالتِ ۳رنگی توی یه خانواده‌ی هیوِ واحد، بر پایه‌ی hueِ تمِ فعلی */
const generatePalette = (hash: number, baseHue: number): [HSL, HSL, HSL] => {
  const rng = createRng(hash);
  const sat = 75 + rng() * 20; // 75-95%

  return [
    [baseHue, sat, 55 + rng() * 10],
    [
      (baseHue - HUE_SPREAD + rng() * HUE_SPREAD * 2) % 360,
      sat - 5 + rng() * 10,
      40 + rng() * 15,
    ],
    [
      (baseHue - HUE_SPREAD + rng() * HUE_SPREAD * 2) % 360,
      sat - 10 + rng() * 15,
      60 + rng() * 15,
    ],
  ];
};

type Cell = {
  colorIndex: number;
  phase: number;
  brightness: number;
  sparklePhase: number;
};

/** ساختِ گرید با متادیتای هر سلول */
const generateGrid = (hash: number): Cell[][] => {
  const rng = createRng(hash + 1);
  const grid: Cell[][] = [];

  for (let y = 0; y < GRID_SIZE; y++) {
    grid[y] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      grid[y][x] = {
        brightness: 0.3 + rng() * 0.7,
        colorIndex: Math.floor(rng() * 3),
        phase: rng() * Math.PI * 2,
        sparklePhase: rng() * Math.PI * 2,
      };
    }
  }

  return grid;
};

export function AgentAvatar({
  seed,
  size = 64,
  animated = true,
  className,
  ...props
}: AgentAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const hash = hashSeed(seed || "؟");
    const palette = generatePalette(hash, THEME_BASE_HUE[theme]);
    const grid = generateGrid(hash);
    const cellSize = size / GRID_SIZE;
    const half = size / 2;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let shouldAnimate = animated && !motionQuery.matches;

    const draw = (time: number) => {
      ctx.clearRect(0, 0, size, size);

      // Scale pulse — کلِ آواتار نفس می‌کشه
      const scale = shouldAnimate
        ? 1 + Math.sin(time * SCALE_PULSE_SPEED) * SCALE_PULSE_AMOUNT
        : 1;

      ctx.save();
      ctx.translate(half, half);
      ctx.scale(scale, scale);
      ctx.translate(-half, -half);

      // کلیپ به دایره
      ctx.beginPath();
      ctx.arc(half, half, half, 0, Math.PI * 2);
      ctx.clip();

      // پس‌زمینه‌ی تیره
      ctx.fillStyle = "#08080f";
      ctx.fillRect(0, 0, size, size);

      // آفستِ breathe سراسری برای روشنی
      const breatheOffset = shouldAnimate
        ? Math.sin(time * BREATHE_SPEED) * BREATHE_AMPLITUDE
        : 0;

      // رسمِ گریدِ پیکسلی
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const cell = grid[y][x];
          const [h, s, l] = palette[cell.colorIndex];

          // pulseِ تک‌پیکسلی
          const pulse = shouldAnimate
            ? Math.sin(time * PULSE_SPEED + cell.phase) * PULSE_AMPLITUDE
            : 0;

          // موجِ موربِ عبوری
          const waveDist = (x + y) / WAVE_LENGTH;
          const wave = shouldAnimate
            ? Math.sin(time * WAVE_SPEED + waveDist) * WAVE_AMPLITUDE
            : 0;

          // sparkle — جرقه‌ی روشنِ گاه‌به‌گاه
          const sparkleVal = shouldAnimate
            ? Math.sin(time * SPARKLE_SPEED + cell.sparklePhase)
            : 0;
          const sparkle =
            sparkleVal > SPARKLE_THRESHOLD
              ? ((sparkleVal - SPARKLE_THRESHOLD) / (1 - SPARKLE_THRESHOLD)) *
                SPARKLE_BOOST
              : 0;

          const finalLight = Math.min(
            90,
            Math.max(
              20,
              (l + pulse + breatheOffset + wave + sparkle) * cell.brightness
            )
          );
          const finalSat = Math.min(100, s + 5);

          // glowِ هر پیکسل — یه سایه‌ی ظریف
          ctx.shadowColor = `hsl(${h}, ${finalSat}%, ${finalLight}%)`;
          ctx.shadowBlur = cellSize * 0.45;

          ctx.fillStyle = `hsl(${h}, ${finalSat}%, ${finalLight}%)`;
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }

      // ریست‌کردنِ سایه قبل از restore
      ctx.shadowBlur = 0;
      ctx.restore();

      // حلقه‌ی glowِ بیرونی
      const [gh, gs, gl] = palette[0];
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.shadowColor = `hsla(${gh}, ${gs}%, ${gl}%, 0.6)`;
      ctx.shadowBlur = size * GLOW_RADIUS_RATIO;
      ctx.beginPath();
      ctx.arc(half, half, half - 1, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${gh}, ${gs}%, ${gl}%, 0.15)`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      if (shouldAnimate) {
        rafRef.current = requestAnimationFrame(draw);
      }
    };

    const handleMotionChange = () => {
      cancelAnimationFrame(rafRef.current);
      shouldAnimate = animated && !motionQuery.matches;
      if (shouldAnimate) {
        rafRef.current = requestAnimationFrame(draw);
      } else {
        draw(0);
      }
    };

    motionQuery.addEventListener("change", handleMotionChange);

    if (shouldAnimate) {
      rafRef.current = requestAnimationFrame(draw);
    } else {
      draw(0);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      motionQuery.removeEventListener("change", handleMotionChange);
    };
  }, [seed, size, animated, theme]);

  return (
    <canvas
      aria-label={`آواتار ${seed}`}
      className={cn("agent-avatar rounded-full", className)}
      ref={canvasRef}
      role="img"
      style={{ height: size, width: size }}
      {...props}
    />
  );
}
