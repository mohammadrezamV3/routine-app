"use client";

import { GradientRing, RING_GREEN, RING_OVER, type RingGrad } from "./GradientRing";

// حلقه‌ی پیشرفتِ عمومی — حالا روی GradientRing (همون حلقه‌ی داشبورد).
// color فقط معنا رو مشخص می‌کنه: رنگِ خطر (قرمز) → --ring-over، بقیه → سبزِ پیش‌فرض.
export function ProgressRing({
  pct,
  size = 72,
  strokeWidth = 7,
  color,
  grad,
  children,
}: {
  pct: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  grad?: RingGrad;
  children?: React.ReactNode;
}) {
  const g = grad ?? (color && color !== "var(--accent)" ? RING_OVER : RING_GREEN);
  return (
    <div className="progress-ring-wrap" style={{ width: size, height: size }}>
      <GradientRing value={pct} size={size} stroke={strokeWidth} grad={g} />
      {children && <div className="progress-ring-center">{children}</div>}
    </div>
  );
}
