"use client";

// نشانگر «حال این هفته» بدون چهره: پنج فرم انتزاعی که از طوفانی (1) تا درخشان (5) می‌رن.
// 1 خط‌های تیز و شکسته، 2 موج‌های بلند، 3 خط‌های آرام و تقریبا صاف،
// 4 طلوع (نیم‌دایره روی افق)، 5 خورشید با پرتوهای کامل.
// رنگ‌ها نشانه‌ی کیفیت‌اند (بد تا عالی)، نه بک‌گراند.
import type { CSSProperties } from "react";

export const MOOD_COLORS = ["", "#E5566B", "#F0894A", "#7FA3D9", "#4FC79A", "#F4BE3A"] as const;

const RAYS = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4;
  const [c, s] = [Math.cos(a), Math.sin(a)];
  return `M${(20 + c * 10.5).toFixed(2)} ${(20 + s * 10.5).toFixed(2)} L${(20 + c * 15).toFixed(2)} ${(20 + s * 15).toFixed(2)}`;
}).join(" ");

export function WeeklyMoodFace({ level, size = 34, className, style }: { level: 1 | 2 | 3 | 4 | 5; size?: number; className?: string; style?: CSSProperties }) {
  const color = MOOD_COLORS[level];
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  let art;
  if (level === 1) {
    art = [11, 20, 29].map((y, i) => (
      <path key={y} {...common} opacity={1 - i * 0.22} d={`M5 ${y} L11 ${y - 6} L17 ${y + 3} L23 ${y - 6} L29 ${y + 3} L35 ${y - 3}`} />
    ));
  } else if (level === 2) {
    art = [11, 20, 29].map((y, i) => (
      <path key={y} {...common} opacity={1 - i * 0.22} d={`M5 ${y} q3.75 -8 7.5 0 t7.5 0 t7.5 0 t7.5 0`} />
    ));
  } else if (level === 3) {
    art = [13, 20, 27].map((y, i) => (
      <path key={y} {...common} opacity={1 - i * 0.22} d={`M5 ${y} q7.5 -2.4 15 0 t15 0`} />
    ));
  } else if (level === 4) {
    art = (
      <>
        <path d="M11 27 a9 9 0 0 1 18 0 Z" fill="currentColor" fillOpacity="0.22" stroke="none" />
        <path {...common} d="M11 27 a9 9 0 0 1 18 0" />
        <path {...common} d="M5 27 H35" />
        <path {...common} opacity="0.55" d="M11 33 H29" />
        <path {...common} d="M20 9 V12 M9.5 14 L11.6 16.1 M30.5 14 L28.4 16.1" />
      </>
    );
  } else {
    art = (
      <>
        <circle cx="20" cy="20" r="6.2" fill="currentColor" stroke="none" />
        <path {...common} d={RAYS} />
      </>
    );
  }
  return (
    <svg className={className} style={{ color, ...style }} width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      {art}
    </svg>
  );
}
