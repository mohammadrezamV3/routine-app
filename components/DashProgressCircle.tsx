"use client";

import { useId } from "react";
import { motion } from "framer-motion";

// حلقه‌ی پیشرفتِ دایره‌ای عمومیِ داشبورد — هم توی هدر (بزرگ، ۷۵٪) هم کنارِ
// هر عضوِ تیم (کوچیک) استفاده می‌شه. مقدار با یک انیمیشنِ نرم از صفر پر می‌شه.
export function DashProgressCircle({
  value,
  size = 64,
  strokeWidth = 6,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
}) {
  const gradId = `dash-progress-grad-${useId()}`;
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, value));
  const center = size / 2;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="-rotate-90 overflow-visible">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-hover)" />
            <stop offset="100%" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="rgba(var(--accent-rgb),.16)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - clamped / 100) }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ filter: "drop-shadow(0 0 3px rgba(var(--accent-rgb),.3))" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-bold text-dash-text" style={{ fontSize: Math.max(11, size * 0.26) }}>
          {clamped}٪
        </span>
      </div>
    </div>
  );
}
