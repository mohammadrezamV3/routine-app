"use client";

// حلقه‌ی پیشرفت مشترک کل اپ — عین حلقه‌ی داشبورد: قوس گرادیانی شبه‌conic،
// سر درخشان، سر گرد قوس و انیمیشن ورود. رنگ‌ها از توکن‌های --ring-* میان.
import { ReactNode, useEffect, useId } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

export type RingGrad = [string, string];
export const RING_GREEN: RingGrad = ["var(--ring-1a)", "var(--ring-1b)"];
export const RING_BLUE: RingGrad = ["var(--ring-2a)", "var(--ring-2b)"];
export const RING_AMBER: RingGrad = ["var(--ring-3a)", "var(--ring-3b)"];
export const RING_OVER: RingGrad = ["var(--ring-over)", "var(--ring-over)"];

/**
 * قوس گرادیانی: دو نیم‌دایره با گرادیان خودشون (from→mid و mid→to) که با یک
 * motion value پر می‌شن؛ سر قوس دایره‌ی درخشانی با رنگ همون نقطه‌ست.
 */
export function GradientArc({ c, r, stroke, value, from, to, delay = 0, trackOpacity = 16 }: { c: number; r: number; stroke: number; value: number; from: string; to: string; delay?: number; trackOpacity?: number }) {
  const uid = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  useEffect(() => {
    const v = Math.max(0, Math.min(1, value));
    if (reduce) { mv.set(v); return; }
    const ctrl = animate(mv, v, { duration: 1.4, ease: EASE as any, delay });
    return () => ctrl.stop();
  }, [value, reduce, delay, mv]);
  const a = useTransform(mv, (p) => Math.min(1, p * 2));
  const b = useTransform(mv, (p) => Math.max(0, p * 2 - 1));
  const aOp = useTransform(mv, (p) => (p > 0.004 ? 1 : 0));
  const bOp = useTransform(mv, (p) => (p > 0.5 ? 1 : 0));
  const capX = useTransform(mv, (p) => c + r * Math.sin(p * 2 * Math.PI));
  const capY = useTransform(mv, (p) => c - r * Math.cos(p * 2 * Math.PI));
  const capFill = useTransform(mv, (p) => `color-mix(in srgb, ${to} ${Math.round(p * 100)}%, ${from})`);
  const mid = `color-mix(in srgb, ${to} 50%, ${from})`;
  const top = c - r, bottom = c + r;
  return (
    <g>
      <defs>
        <linearGradient id={`ga${uid}`} gradientUnits="userSpaceOnUse" x1={c} y1={top} x2={c} y2={bottom}>
          <stop offset="0%" style={{ stopColor: from }} />
          <stop offset="100%" style={{ stopColor: mid }} />
        </linearGradient>
        <linearGradient id={`gb${uid}`} gradientUnits="userSpaceOnUse" x1={c} y1={bottom} x2={c} y2={top}>
          <stop offset="0%" style={{ stopColor: mid }} />
          <stop offset="100%" style={{ stopColor: to }} />
        </linearGradient>
      </defs>
      <circle cx={c} cy={c} r={r} fill="none" strokeWidth={stroke} style={{ stroke: `color-mix(in srgb, ${from} ${trackOpacity}%, transparent)` }} />
      <motion.path d={`M${c} ${top} A${r} ${r} 0 0 1 ${c} ${bottom}`} fill="none" stroke={`url(#ga${uid})`} strokeWidth={stroke} strokeLinecap="round" style={{ pathLength: a, opacity: aOp }} />
      <motion.path d={`M${c} ${bottom} A${r} ${r} 0 0 1 ${c} ${top}`} fill="none" stroke={`url(#gb${uid})`} strokeWidth={stroke} strokeLinecap="round" style={{ pathLength: b, opacity: bOp }} />
      <motion.circle r={stroke / 2} className="gring-cap" style={{ cx: capX, cy: capY, fill: capFill, opacity: aOp }} />
    </g>
  );
}

/** value بین 0 تا 1. */
export function GradientRing({ value, size = 64, stroke = 6, grad = RING_GREEN, delay = 0, className, children }: { value: number; size?: number; stroke?: number; grad?: RingGrad; delay?: number; className?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const v = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <span className={className ? `gring ${className}` : "gring"} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ overflow: "visible" }} aria-hidden="true">
        <GradientArc c={size / 2} r={r} stroke={stroke} value={v} from={grad[0]} to={grad[1]} delay={delay} />
      </svg>
      {children && <span className="gring-center">{children}</span>}
    </span>
  );
}
