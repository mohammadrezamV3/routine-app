"use client";

import { Fragment, useId } from "react";
import type { ReactNode } from "react";

// آیکون‌های دست‌طراحیِ اچیومنت‌ها — هر id یک گلیفِ منحصربه‌فرد، داخلِ قابی که
// ظاهرش از روی rarity عوض می‌شه (۱ برنزی، ۲ نقره‌ای، ۳ طلایی، ۴ افسانه‌ای).
// بدون متن، بدون بک‌گراند (بیرونِ قاب شفافه)، بدون کتابخونه‌ی بیرونی.

type Rarity = 1 | 2 | 3 | 4;
type Ink = { ink: string; acc: string };

const S = (ink: string, w = 2) => ({
  stroke: ink,
  strokeWidth: w,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

const rad = (d: number) => (d * Math.PI) / 180;
const pol = (r: number, deg: number): [number, number] => [r * Math.sin(rad(deg)), -r * Math.cos(rad(deg))];
const f = (n: number) => +n.toFixed(2);

function arcPath(r: number, a0: number, a1: number) {
  const [x0, y0] = pol(r, a0);
  const [x1, y1] = pol(r, a1);
  return `M${f(x0)} ${f(y0)} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${f(x1)} ${f(y1)}`;
}

function starPath(R: number, r: number, n: number, cx = 0, cy = 0, rot = 0) {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const [x, y] = pol(i % 2 === 0 ? R : r, rot + (i * 180) / n);
    pts.push(`${f(cx + x)} ${f(cy + y)}`);
  }
  return `M${pts.join(" L")} Z`;
}

function gearPath(R: number, r: number, teeth: number) {
  const pts: string[] = [];
  const step = 360 / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    for (const [rr, da] of [[r, -0.32], [R, -0.2], [R, 0.2], [r, 0.32]] as const) {
      const [x, y] = pol(rr, a + da * step);
      pts.push(`${f(x)} ${f(y)}`);
    }
  }
  return `M${pts.join(" L")} Z`;
}

function SegRing({ r, n, gap, ink, dimFrom = n, w = 2.4 }: { r: number; n: number; gap: number; ink: string; dimFrom?: number; w?: number }) {
  const span = 360 / n;
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <path key={i} d={arcPath(r, i * span + gap / 2, (i + 1) * span - gap / 2)} {...S(ink, w)} opacity={i >= dimFrom ? 0.3 : 1} />
      ))}
    </>
  );
}

function Flame({ x, y, s, c, dim = 1 }: { x: number; y: number; s: number; c: Ink; dim?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={dim}>
      <path d="M0 -14 C3 -8 9 -5 9 2 A9 9 0 0 1 -9 2 C-9 -3 -6 -5 -5 -9 C-2 -8 -1 -11 0 -14Z" fill={c.acc} fillOpacity={0.38} {...S(c.ink, 2 / s)} />
      <path d="M0 -2 C2 1 4 3 4 6 A4 4 0 0 1 -4 6 C-4 3 -1 2 0 -2Z" {...S(c.ink, 1.6 / s)} />
    </g>
  );
}

function Star({ x, y, R, r, c, n = 5, w = 2, fill = 0.38 }: { x: number; y: number; R: number; r: number; c: Ink; n?: number; w?: number; fill?: number }) {
  return <path d={starPath(R, r, n, x, y)} fill={c.acc} fillOpacity={fill} {...S(c.ink, w)} />;
}

function Check({ d, c, w = 2.6, o = 1 }: { d: string; c: Ink; w?: number; o?: number }) {
  return <path d={d} {...S(c.ink, w)} opacity={o} />;
}

function Foot({ x, y, rot, s = 1, c }: { x: number; y: number; rot: number; s?: number; c: Ink }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <ellipse cx="0" cy="5.5" rx="2.7" ry="3.4" fill={c.acc} fillOpacity={0.38} {...S(c.ink, 1.8 / s)} />
      <path d="M-3.4 -1 C-3.4 -4 3.4 -4 3.4 -1 C3.4 1.6 1.8 2.2 0 2.2 C-1.8 2.2 -3.4 1.6 -3.4 -1Z" fill={c.acc} fillOpacity={0.38} {...S(c.ink, 1.8 / s)} />
      {[-2.6, -0.9, 0.9, 2.6].map((tx, i) => (
        <circle key={i} cx={tx} cy={-5.2 + Math.abs(tx) * 0.5} r="0.9" fill={c.ink} />
      ))}
    </g>
  );
}

const crescent = "M8 -13 A14 14 0 1 0 13 8 A11 11 0 0 1 8 -13Z";

function Moon({ x, y, s, c }: { x: number; y: number; s: number; c: Ink }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d={crescent} fill={c.acc} fillOpacity={0.38} {...S(c.ink, 2 / s)} />
    </g>
  );
}

function Calendar({ c, children }: { c: Ink; children?: ReactNode }) {
  return (
    <>
      <rect x="-15" y="-12" width="30" height="28" rx="4" {...S(c.ink, 2)} />
      <path d="M-15 -5 H15 M-8 -16 V-9 M8 -16 V-9" {...S(c.ink, 2)} />
      {children}
    </>
  );
}

function Clock({ x, y, r, c }: { x: number; y: number; r: number; c: Ink }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} {...S(c.ink, 2)} />
      <path d={`M0 ${-r} V${-r + 2.4} M${r} 0 H${r - 2.4} M0 ${r} V${r - 2.4} M${-r} 0 H${-r + 2.4}`} {...S(c.ink, 1.6)} />
    </g>
  );
}

const spiralArm = (off: number) => {
  const pts: string[] = [];
  for (let t = 0; t <= 10; t += 0.5) {
    const r = 1.5 + t * 1.45;
    const [x, y] = pol(r, (t * 0.6 * 180) / Math.PI + off);
    pts.push(`${f(x)} ${f(y)}`);
  }
  return `M${pts.join(" L")}`;
};

const GLYPHS: Record<string, (c: Ink) => ReactNode> = {
  // ── استریک ──
  streak_1: (c) => (
    <>
      <Flame x={-2} y={4} s={0.72} c={c} />
      <Star x={9} y={-10} R={6} r={1.6} n={4} c={c} w={1.6} fill={0.6} />
    </>
  ),
  streak_3: (c) => <Flame x={0} y={2} s={1.05} c={c} />,
  streak_7: (c) => (
    <>
      <Flame x={-11} y={7} s={0.6} c={c} dim={0.85} />
      <Flame x={11} y={7} s={0.6} c={c} dim={0.85} />
      <Flame x={0} y={2} s={1} c={c} />
    </>
  ),
  streak_14: (c) => (
    <>
      <Flame x={-8} y={2} s={0.88} c={c} />
      <Flame x={8} y={2} s={0.88} c={c} />
      <path d="M-14 15 Q0 19 14 15" {...S(c.ink, 1.8)} />
    </>
  ),
  streak_30: (c) => (
    <>
      <circle r="16" {...S(c.ink, 1.8)} strokeDasharray="1 2.35" />
      <Flame x={0} y={2} s={0.8} c={c} />
    </>
  ),
  streak_60: (c) => (
    <>
      <path d="M-16 15 L-6 -2 H6 L16 15 Z" fill={c.acc} fillOpacity={0.25} {...S(c.ink, 2)} />
      <path d="M-1.5 -2 L-2.5 6 M2 -2 L3 9" {...S(c.ink, 1.4)} />
      <Flame x={0} y={-8} s={0.62} c={c} />
      <circle cx="-10" cy="-11" r="1.3" fill={c.ink} />
      <circle cx="10" cy="-8" r="1.3" fill={c.ink} />
      <circle cx="-13" cy="-3" r="0.9" fill={c.ink} />
    </>
  ),
  streak_90: (c) => (
    <>
      <SegRing r={16} n={4} gap={14} ink={c.ink} dimFrom={3} w={2.4} />
      <Flame x={0} y={2} s={0.72} c={c} />
    </>
  ),
  streak_180: (c) => (
    <>
      {[1, -1].map((m) => (
        <g key={m} transform={`scale(${m} 1)`}>
          <path d="M-5 0 C-10 -2 -15 -6 -17 -13 C-12 -10 -10 -10 -7 -9" {...S(c.ink, 1.9)} fill={c.acc} fillOpacity={0.3} />
          <path d="M-5 4 C-11 3 -15 0 -17 -4" {...S(c.ink, 1.6)} />
          <path d="M-2 12 Q-5 17 -9 16" {...S(c.ink, 1.6)} />
        </g>
      ))}
      <path d="M0 12 V18" {...S(c.ink, 1.6)} />
      <Flame x={0} y={2} s={0.78} c={c} />
    </>
  ),
  streak_365: (c) => (
    <>
      <path d="M-14 14 L-14 3 L-7 9 L0 1 L7 9 L14 3 L14 14 Z" fill={c.acc} fillOpacity={0.4} {...S(c.ink, 2)} />
      <path d="M-14 17 H14" {...S(c.ink, 1.8)} />
      <Flame x={0} y={-8} s={0.64} c={c} />
    </>
  ),

  // ── روزهای کامل ──
  perfect_1: (c) => <Star x={0} y={1} R={15} r={6.4} c={c} />,
  perfect_10: (c) => (
    <>
      {Array.from({ length: 10 }, (_, i) => {
        const [x, y] = pol(15.5, i * 36);
        return <circle key={i} cx={f(x)} cy={f(y)} r="1.1" fill={c.ink} />;
      })}
      <Star x={0} y={0.5} R={9} r={4} c={c} w={1.8} />
    </>
  ),
  perfect_50: (c) => (
    <>
      <path d="M0 -15 A15 15 0 0 0 0 15 Z" fill={c.acc} fillOpacity={0.4} stroke="none" />
      <circle r="15" {...S(c.ink, 1.8)} />
      <Star x={0} y={0.5} R={8.5} r={3.6} c={c} w={1.8} fill={0.5} />
    </>
  ),
  perfect_100: (c) => (
    <>
      <Star x={0} y={-3} R={10.5} r={4.4} c={c} />
      <Star x={-11} y={10} R={6} r={2.6} c={c} w={1.6} />
      <Star x={11} y={10} R={6} r={2.6} c={c} w={1.6} />
    </>
  ),
  perfect_250: (c) => (
    <>
      <path d={spiralArm(0)} {...S(c.ink, 1.9)} />
      <path d={spiralArm(180)} {...S(c.ink, 1.9)} opacity={0.75} />
      <circle r="2.4" fill={c.acc} stroke={c.ink} strokeWidth="1.2" />
      <circle cx="-13" cy="-11" r="1" fill={c.ink} />
      <circle cx="13" cy="11" r="1" fill={c.ink} />
      <circle cx="12" cy="-12" r="0.8" fill={c.ink} />
    </>
  ),
  week_1: (c) => (
    <>
      <SegRing r={15} n={7} gap={14} ink={c.ink} w={2.6} />
      <Check d="M-5 1 L-1 5 L6 -4" c={c} w={2.4} />
    </>
  ),
  week_4: (c) => (
    <>
      {[[-8, -8], [8, -8], [-8, 8], [8, 8]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <circle r="5.5" {...S(c.ink, 2)} strokeDasharray="3.9 1.5" />
        </g>
      ))}
    </>
  ),
  week_12: (c) => (
    <>
      <SegRing r={16} n={12} gap={7} ink={c.ink} w={2.2} />
      <SegRing r={9} n={7} gap={16} ink={c.ink} w={2.2} />
      <circle r="1.8" fill={c.ink} />
    </>
  ),
  month_1: (c) => (
    <Calendar c={c}>
      <circle cx="0" cy="5.5" r="6.5" fill={c.acc} fillOpacity={0.4} {...S(c.ink, 1.8)} />
      <circle cx="-2" cy="4" r="1.2" {...S(c.ink, 1.1)} />
      <circle cx="2.4" cy="7.4" r="0.9" {...S(c.ink, 1)} />
    </Calendar>
  ),
  friday_4: (c) => (
    <>
      <path d="M0 4 C-8 6 -14 12 -16 17 C-10 14 -6 15 -1 15 Z" fill={c.acc} fillOpacity={0.4} {...S(c.ink, 1.8)} />
      <circle cx="3" cy="-2" r="7" fill={c.acc} fillOpacity={0.38} {...S(c.ink, 2)} />
      {Array.from({ length: 8 }, (_, i) => {
        const [x0, y0] = pol(10.5, i * 45);
        const [x1, y1] = pol(14, i * 45);
        return <path key={i} d={`M${f(3 + x0)} ${f(-2 + y0)} L${f(3 + x1)} ${f(-2 + y1)}`} {...S(c.ink, 1.8)} />;
      })}
    </>
  ),

  // ── تیک‌ها ──
  ticks_10: (c) => <Check d="M-10 1 L-3 8 L11 -9" c={c} w={3.4} />,
  ticks_100: (c) => (
    <>
      <Check d="M-12 -3 L-7 2 L2 -9" c={c} w={2.8} o={0.6} />
      <Check d="M-7 7 L0 14 L13 -3" c={c} w={3} />
    </>
  ),
  ticks_500: (c) => (
    <>
      <Check d="M-11 -10 L-7 -6 L0 -14" c={c} w={2.4} o={0.45} />
      <Check d="M-9 -1 L-3 5 L8 -8" c={c} w={2.7} o={0.72} />
      <Check d="M-7 9 L-1 15 L11 1" c={c} w={3} />
    </>
  ),
  ticks_1000: (c) => (
    <>
      <circle r="10.5" fill={c.acc} fillOpacity={0.25} {...S(c.ink, 1.8)} />
      <Check d="M-5 0.5 L-1 4.5 L6 -4" c={c} w={2.6} />
      <path d={arcPath(15.5, 110, 250)} {...S(c.ink, 1.6)} />
      <path d={arcPath(15.5, -250, -110)} {...S(c.ink, 1.6)} />
      <path d="M-13 9 l-3 -1 M-15 3 l-3.4 0 M-15 -3 l-3.2 -1.2 M13 9 l3 -1 M15 3 l3.4 0 M15 -3 l3.2 -1.2" {...S(c.ink, 1.3)} />
    </>
  ),
  ticks_5000: (c) => (
    <>
      <path d={gearPath(16.5, 13, 10)} fill={c.acc} fillOpacity={0.22} {...S(c.ink, 1.8)} />
      <rect x="-8" y="-5.5" width="16" height="12" rx="3" {...S(c.ink, 1.8)} />
      <path d="M0 -5.5 V-9" {...S(c.ink, 1.6)} />
      <circle cx="0" cy="-9.6" r="1.2" fill={c.ink} />
      <circle cx="-3.3" cy="-0.6" r="1.6" fill={c.ink} />
      <circle cx="3.3" cy="-0.6" r="1.6" fill={c.ink} />
      <path d="M-3 3.4 H3" {...S(c.ink, 1.5)} />
    </>
  ),

  // ── ثبات ──
  active_7: (c) => (
    <>
      <Foot x={-6} y={3} rot={-12} c={c} />
      <Foot x={6} y={-3} rot={12} c={c} />
    </>
  ),
  active_30: (c) => (
    <Calendar c={c}>
      {[-9, -3, 3, 9].flatMap((x, i) =>
        [1, 7, 12].slice(0, 2).map((y, j) => {
          const on = (i + j) % 3 !== 2;
          return <rect key={`${i}-${j}`} x={x - 2} y={y - 1.5} width="4" height="4" rx="1" fill={on ? c.acc : "none"} fillOpacity={on ? 0.75 : 1} stroke={c.ink} strokeWidth="1.2" />;
        }),
      )}
      <rect x="-11" y="11" width="4" height="3" rx="1" fill={c.acc} fillOpacity={0.75} stroke={c.ink} strokeWidth="1.2" />
    </Calendar>
  ),
  active_100: (c) => (
    <>
      <Foot x={-9} y={7} rot={38} s={0.72} c={c} />
      <Foot x={0} y={-1} rot={38} s={0.72} c={c} />
      <Foot x={9} y={-9} rot={38} s={0.72} c={c} />
    </>
  ),
  active_365: (c) => (
    <>
      <circle r="15.5" {...S(c.ink, 1.8)} strokeDasharray="2.6 5.2" />
      <Foot x={0} y={0} rot={8} s={0.85} c={c} />
    </>
  ),
  avg30_90: (c) => (
    <>
      <Clock x={0} y={0} r={15} c={c} />
      <circle r="8" {...S(c.ink, 1.6)} />
      <circle r="3.6" fill={c.acc} fillOpacity={0.5} {...S(c.ink, 1.5)} />
      <path d="M1 -1 L13 -13 M13 -13 H9.2 M13 -13 V-9.2" {...S(c.ink, 1.9)} />
    </>
  ),
  comeback: (c) => (
    <>
      <path d="M-16 16 Q-8 11 0 14 Q8 11 16 16" fill={c.acc} fillOpacity={0.22} {...S(c.ink, 1.8)} />
      <path d="M-13 9 L-6 1 L-1 6 L11 -8" {...S(c.ink, 2.4)} />
      <path d="M4 -9 L11 -8 L10 -1" {...S(c.ink, 2.4)} />
      <circle cx="-9" cy="14" r="0.9" fill={c.ink} />
      <circle cx="9" cy="13" r="0.9" fill={c.ink} />
      <circle cx="-14" cy="-4" r="0.9" fill={c.ink} />
    </>
  ),
  early_7: (c) => (
    <>
      <path d="M-9 7 A9 9 0 0 1 9 7 Z" fill={c.acc} fillOpacity={0.42} {...S(c.ink, 2)} />
      <path d="M-17 7 H17 M-10 12 H10 M-5 16.5 H5" {...S(c.ink, 1.8)} />
      {[-72, -36, 0, 36, 72].map((a) => {
        const [x0, y0] = pol(12.5, a);
        const [x1, y1] = pol(16.5, a);
        return <path key={a} d={`M${f(x0)} ${f(7 + y0)} L${f(x1)} ${f(7 + y1)}`} {...S(c.ink, 1.8)} />;
      })}
    </>
  ),
  early_30: (c) => (
    <>
      <path d="M-8 2 C-13 10 -8 17 2 16 C11 16 15 10 12 3" {...S(c.ink, 2)} />
      <path d="M12 3 C17 0 18 -6 14 -11 M12 5 C16 6 18 2 18 -2" {...S(c.ink, 1.6)} />
      <path d="M-6 -7 Q-8 -14 -4.5 -12 Q-3 -16.5 0 -12 Q3 -15 3.5 -9" fill={c.acc} fillOpacity={0.5} {...S(c.ink, 1.8)} />
      <circle cx="-2" cy="-2" r="7" {...S(c.ink, 2)} />
      <path d="M5 -4 L12 -1.5 L5 1 Z" fill={c.acc} fillOpacity={0.6} {...S(c.ink, 1.6)} />
      <path d="M3.5 4 Q6.5 8 3 9.5" {...S(c.ink, 1.6)} />
      <circle cx="0.6" cy="-4" r="1.1" fill={c.ink} />
    </>
  ),

  // ── خواب ──
  sleep_1: (c) => <Moon x={-2} y={0} s={1.05} c={c} />,
  sleep_7: (c) => (
    <>
      <Moon x={-4} y={1} s={0.85} c={c} />
      <Star x={10} y={-10} R={4} r={1.5} n={4} c={c} w={1.4} fill={0.6} />
      <Star x={13} y={0} R={3} r={1.1} n={4} c={c} w={1.3} fill={0.6} />
      <Star x={7} y={10} R={3.4} r={1.2} n={4} c={c} w={1.3} fill={0.6} />
    </>
  ),
  sleep_30: (c) => (
    <>
      <rect x="-10" y="-15" width="24" height="30" rx="3" {...S(c.ink, 2)} />
      {[-9, -1.5, 6].map((y) => (
        <circle key={y} cx="-10" cy={y} r="2" fill={c.acc} stroke={c.ink} strokeWidth="1.4" />
      ))}
      <Moon x={3} y={-2} s={0.5} c={c} />
      <path d="M-2 9 H9" {...S(c.ink, 1.6)} />
    </>
  ),
  sleep_goal_7: (c) => (
    <>
      <path d="M-15 -10 V13 M-15 5 H16 M16 5 V13" {...S(c.ink, 2)} />
      <rect x="-13" y="-3" width="9" height="6" rx="2.5" {...S(c.ink, 1.8)} />
      <path d="M-2 -3 H12 Q16 -3 16 1 V5 H-2 Z" fill={c.acc} fillOpacity={0.4} {...S(c.ink, 1.8)} />
    </>
  ),
  sleep_goal_30: (c) => (
    <>
      <Moon x={-3} y={-4} s={0.72} c={c} />
      <Star x={10} y={-10} R={4.4} r={1.7} n={4} c={c} w={1.4} fill={0.6} />
      <Check d="M-8 11 L-3 15.5 L9 6" c={c} w={2.6} />
    </>
  ),
  sleep_steady_7: (c) => (
    <>
      <Clock x={-2} y={3} r={12.5} c={c} />
      <path d="M-2 3 V-4 M-2 3 L3 6" {...S(c.ink, 2)} />
      <Moon x={10} y={-10} s={0.48} c={c} />
    </>
  ),

  // ── ویژه ──
  planner_10: (c) => (
    <>
      <path d="M-16 -7 H16 M-16 3 H16 M-16 13 H16 M-9 -16 V16 M1 -16 V16 M11 -16 V16" {...S(c.ink, 0.9)} opacity={0.4} />
      <circle cx="0" cy="-11" r="2.4" fill={c.acc} fillOpacity={0.6} {...S(c.ink, 1.8)} />
      <path d="M-1 -9 L-9 14 M1 -9 L9 14" {...S(c.ink, 2.2)} />
      <path d="M-5 4 Q0 7 5 4" {...S(c.ink, 1.6)} />
      <path d="M9 14 L10.5 17" {...S(c.ink, 1.6)} />
    </>
  ),
  member_30: (c) => (
    <>
      <path d="M-17 -4 H-12 V7 H-17 Z M17 -4 H12 V7 H17 Z" fill={c.acc} fillOpacity={0.4} {...S(c.ink, 1.8)} />
      <path d="M-12 -1 L-6 -5 H2 L5 -2 M12 -1 L6 -5 H2" {...S(c.ink, 1.9)} />
      <path d="M-12 4 L-6.5 9.5 C-4.5 11.5 -2 11 -1 9.5 M12 4 L9 1 L1 9 C-1 11 -3.5 10 -4 8.5" {...S(c.ink, 1.9)} />
      <path d="M-1 2 L2 5 M3 -1 L6 2" {...S(c.ink, 1.5)} />
    </>
  ),
  member_365: (c) => (
    <>
      <circle cx="-7" cy="-2" r="6" fill={c.acc} fillOpacity={0.3} {...S(c.ink, 1.8)} />
      <circle cx="7" cy="-2" r="6" fill={c.acc} fillOpacity={0.3} {...S(c.ink, 1.8)} />
      <circle cx="0" cy="-8" r="7" fill={c.acc} fillOpacity={0.3} {...S(c.ink, 1.8)} />
      <path d="M0 16 V3 M0 9 L-5 5 M0 7 L5 3" {...S(c.ink, 2.2)} />
      <path d="M0 16 Q-4 16.5 -9 16 M0 16 Q4 16.5 9 16" {...S(c.ink, 1.8)} />
    </>
  ),
};

const FALLBACK_GLYPH = (c: Ink) => (
  <>
    <path d="M-12 -4 L-6 -12 H6 L12 -4 L0 14 Z" fill={c.acc} fillOpacity={0.35} {...S(c.ink, 2)} />
    <path d="M-12 -4 H12 M-3 -4 L0 14 M3 -4 L0 14 M-6 -12 L-3 -4 L0 -12 L3 -4 L6 -12" {...S(c.ink, 1.4)} />
  </>
);

export const ACHIEVEMENT_GLYPH_IDS: string[] = Object.keys(GLYPHS);

// ── پالت‌ها ──
type Palette = { frame: [string, string, string]; face: [string, string]; ink: [string, string]; acc: [string, string] };

const PALETTES: Record<Rarity, Palette> = {
  1: { frame: ["#f6cfa6", "#c9803f", "#6f3d14"], face: ["#4a2e18", "#26160a"], ink: ["#fff0dc", "#f0a866"], acc: ["#ffc58a", "#e0843a"] },
  2: { frame: ["#fbfdff", "#aab5c4", "#566173"], face: ["#323d4f", "#192131"], ink: ["#ffffff", "#b5c4da"], acc: ["#dfe8f6", "#8ea3c2"] },
  3: { frame: ["#fff3b0", "#f0b429", "#8f5a06"], face: ["#46330c", "#221703"], ink: ["#fffbe0", "#ffc83d"], acc: ["#ffe27a", "#f29b12"] },
  4: { frame: ["#c4a4ff", "#5fe3ff", "#ffd86a"], face: ["#2a1d63", "#0d0a26"], ink: ["#ffffff", "#c9b8ff"], acc: ["#67e8ff", "#a77bff"] },
};

const LOCKED: Palette = { frame: ["#a9aeb5", "#757a82", "#44484f"], face: ["#2a2d32", "#17191c"], ink: ["#b7bcc3", "#8b9098"], acc: ["#9aa0a8", "#6e737b"] };

function framePath(rarity: Rarity) {
  switch (rarity) {
    case 1:
      return "M3 32 A29 29 0 1 0 61 32 A29 29 0 1 0 3 32 Z";
    case 2:
      return "M32 3 L56 11 V32 C56 46 45 56 32 61 C19 56 8 46 8 32 V11 Z";
    case 3:
      return "M32 3 L57 17.5 V46.5 L32 61 L7 46.5 V17.5 Z";
    default: {
      const pts: string[] = [];
      for (let i = 0; i < 24; i++) {
        const [x, y] = pol(i % 2 === 0 ? 30 : 26.5, i * 15);
        pts.push(`${f(32 + x)} ${f(32 + y)}`);
      }
      return `M${pts.join(" L")} Z`;
    }
  }
}

export type AchievementIconProps = {
  id: string;
  unlocked: boolean;
  rarity: Rarity;
  size?: number;
  className?: string;
  /** کاربر prefers-reduced-motion رو بهش می‌ده؛ true یعنی انیمیشنِ درخشش خاموش */
  reduced?: boolean;
};

export function AchievementIcon({ id, unlocked, rarity, size = 56, className, reduced = false }: AchievementIconProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const p = unlocked ? PALETTES[rarity] ?? PALETTES[1] : LOCKED;
  const legendary = unlocked && rarity === 4;
  const animate = legendary && !reduced;
  const c: Ink = { ink: `url(#${uid}-ink)`, acc: `url(#${uid}-acc)` };
  const glyph = (GLYPHS[id] ?? FALLBACK_GLYPH)(c);
  const d = framePath(rarity);
  const cls = [className, legendary ? "ach-shimmer" : ""].filter(Boolean).join(" ") || undefined;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={cls}
      role="img"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block", overflow: "visible", opacity: unlocked ? 1 : 0.62 }}
    >
      <defs>
        <linearGradient id={`${uid}-frame`} x1="8" y1="3" x2="56" y2="61" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={p.frame[0]}>
            {animate && <animate attributeName="stop-color" values={`${p.frame[0]};${p.frame[1]};${p.frame[2]};${p.frame[0]}`} dur="6s" repeatCount="indefinite" />}
          </stop>
          <stop offset="0.52" stopColor={p.frame[1]}>
            {animate && <animate attributeName="stop-color" values={`${p.frame[1]};${p.frame[2]};${p.frame[0]};${p.frame[1]}`} dur="6s" repeatCount="indefinite" />}
          </stop>
          <stop offset="1" stopColor={p.frame[2]}>
            {animate && <animate attributeName="stop-color" values={`${p.frame[2]};${p.frame[0]};${p.frame[1]};${p.frame[2]}`} dur="6s" repeatCount="indefinite" />}
          </stop>
        </linearGradient>
        <radialGradient id={`${uid}-face`} cx="32" cy="26" r="34" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={p.face[0]} />
          <stop offset="1" stopColor={p.face[1]} />
        </radialGradient>
        <linearGradient id={`${uid}-ink`} x1="0" y1="-17" x2="0" y2="17" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={p.ink[0]} />
          <stop offset="1" stopColor={p.ink[1]} />
        </linearGradient>
        <linearGradient id={`${uid}-acc`} x1="-17" y1="-17" x2="17" y2="17" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={p.acc[0]} />
          <stop offset="1" stopColor={p.acc[1]} />
        </linearGradient>
        {legendary && (
          <>
            <clipPath id={`${uid}-clip`}>
              <path d={d} />
            </clipPath>
            <linearGradient id={`${uid}-sheen`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0.55" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </>
        )}
      </defs>

      <path d={d} fill={`url(#${uid}-frame)`} stroke={p.frame[2]} strokeWidth="1" strokeLinejoin="round" />
      <g transform="translate(32 32) scale(0.84) translate(-32 -32)">
        <path d={d} fill={`url(#${uid}-face)`} stroke={p.frame[0]} strokeOpacity="0.55" strokeWidth="1.2" strokeLinejoin="round" />
      </g>
      <path d="M14 14 Q32 4 50 14" fill="none" stroke="#fff" strokeOpacity={unlocked ? 0.28 : 0.12} strokeWidth="1.6" strokeLinecap="round" />

      <g transform="translate(32 32.5)" fill="none" opacity={unlocked ? 1 : 0.85}>
        {glyph}
      </g>

      {legendary && (
        <Fragment>
          <g clipPath={`url(#${uid}-clip)`}>
            <g transform="rotate(25 32 32)">
              <rect x="-14" y="-10" width="12" height="84" fill={`url(#${uid}-sheen)`}>
                {animate && <animate attributeName="x" values="-14;76;76" keyTimes="0;0.45;1" dur="4.2s" repeatCount="indefinite" />}
              </rect>
            </g>
          </g>
          <path d={starPath(3.4, 0.9, 4, 50, 12)} fill="#fff" opacity="0.9">
            {animate && <animate attributeName="opacity" values="0.15;1;0.15" dur="2.4s" repeatCount="indefinite" />}
          </path>
          <path d={starPath(2.4, 0.7, 4, 13, 50)} fill="#fff" opacity="0.8">
            {animate && <animate attributeName="opacity" values="1;0.15;1" dur="3s" repeatCount="indefinite" />}
          </path>
        </Fragment>
      )}
    </svg>
  );
}

export default AchievementIcon;
