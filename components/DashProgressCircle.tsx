"use client";

import { GradientRing, type RingGrad } from "./GradientRing";

// حلقه‌ی پیشرفت دایره‌ای عمومی — روی GradientRing (همون حلقه‌ی داشبورد).
export function DashProgressCircle({
  value,
  size = 64,
  strokeWidth = 6,
  grad,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  grad?: RingGrad;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <GradientRing value={clamped / 100} size={size} stroke={strokeWidth} grad={grad} />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-bold text-dash-text" style={{ fontSize: Math.max(11, size * 0.26) }}>
          {clamped}٪
        </span>
      </div>
    </div>
  );
}
