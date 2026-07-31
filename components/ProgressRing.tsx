"use client";

// حلقه‌ی SVGِ عمومی برای نمایش پیشرفت به‌شکل دایره‌ای — به‌جای نوار خطی؛
// همون الگوی حلقه‌ی هدف ماهانه‌ی ژورنال ترید، فقط عمومی‌شده تا بخش کالری هم
// (کالری امروز و سهم هر وعده) از همین استفاده کنه.
export function ProgressRing({
  pct,
  size = 72,
  strokeWidth = 7,
  color = "var(--accent)",
  children,
}: {
  pct: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  children?: React.ReactNode;
}) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, pct));
  const center = size / 2;
  return (
    <div className="progress-ring-wrap" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="progress-ring">
        <circle cx={center} cy={center} r={r} fill="none" stroke="var(--line)" strokeWidth={strokeWidth} />
        <circle
          cx={center} cy={center} r={r} fill="none" strokeWidth={strokeWidth} strokeLinecap="round"
          stroke={color}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          transform={`rotate(-90 ${center} ${center})`}
          className="progress-ring-fill"
        />
      </svg>
      {children && <div className="progress-ring-center">{children}</div>}
    </div>
  );
}
