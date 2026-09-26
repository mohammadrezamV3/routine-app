import { ReactNode } from "react";

// حلقه‌ی SVG عمومی برای نمایش پیشرفت — پورت از components/ProgressRing.tsx وب.
export default function ProgressRing({
  pct,
  size = 72,
  strokeWidth = 7,
  color = "var(--accent)",
  children,
}: {
  pct: number; // 0..1
  size?: number;
  strokeWidth?: number;
  color?: string;
  children?: ReactNode;
}) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, pct));
  const center = size / 2;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
        <circle cx={center} cy={center} r={r} fill="none" stroke="var(--surface-line)" strokeWidth={strokeWidth} />
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          stroke={color}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: "stroke-dashoffset .4s ease" }}
        />
      </svg>
      {children && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {children}
        </div>
      )}
    </div>
  );
}
