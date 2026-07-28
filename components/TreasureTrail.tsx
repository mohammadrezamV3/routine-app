"use client";

import { useId } from "react";

/**
 * مسیر نقشه‌ی گنج — یک خط کج‌وکوله‌ی خط‌چین که خودش کم‌کم پر می‌شه و تهش
 * یک ضربدر می‌خوره، بعد محو می‌شه و از اول تکرار می‌شه.
 *
 * ترفند اجرا: خودِ خط‌چین رو نمی‌شه با stroke-dashoffset «کشید» (چون
 * dasharray داره برای الگوی خط‌چین استفاده می‌شه). به‌جاش یک ماسک با همون
 * مسیر ولی ضخیم گذاشتیم که با pathLength=1 نرمال شده — پس dashoffset از ۱
 * به ۰ بدون نیاز به getTotalLength() کار می‌کنه و ماسک، خط‌چینِ زیرش رو
 * از ابتدا تا انتها آشکار می‌کنه.
 *
 * رنگ از var(--accent) میاد، یعنی خودکار: سبز توی حالت شب، نارنجی توی روز.
 */

type Variant = "a" | "b" | "c";

const TRAILS: Record<Variant, { d: string; x: number; y: number }> = {
  a: { d: "M8 46 C 30 10, 48 58, 72 32 C 96 8, 118 54, 142 30 C 154 18, 166 22, 176 26", x: 176, y: 26 },
  b: { d: "M8 26 C 26 52, 48 10, 70 34 C 90 56, 114 14, 138 32 C 152 42, 166 34, 176 30", x: 176, y: 30 },
  c: { d: "M8 18 C 32 42, 52 12, 76 36 C 98 58, 116 22, 140 38 C 154 47, 168 40, 176 34", x: 176, y: 34 },
};

export function TreasureTrail({
  variant = "a",
  className = "",
  duration = 7,
  delay = 0,
}: {
  variant?: Variant;
  className?: string;
  duration?: number;
  delay?: number;
}) {
  // useId تضمین می‌کنه هر نمونه ماسکِ خودشو داره — وگرنه چند تا مسیر توی یک
  // صفحه همه به ماسک اولی وصل می‌شدن و با هم پر می‌شدن
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const maskId = `tt-mask-${uid}`;
  const t = TRAILS[variant];
  const r = 7;

  return (
    <svg
      className={`treasure-trail ${className}`}
      viewBox="0 0 190 60"
      fill="none"
      aria-hidden="true"
      style={{ "--tt-dur": `${duration}s`, "--tt-delay": `${delay}s` } as React.CSSProperties}
    >
      <defs>
        <mask id={maskId}>
          <path
            d={t.d}
            className="tt-reveal"
            stroke="#fff"
            strokeWidth="12"
            strokeLinecap="round"
            fill="none"
            pathLength={1}
          />
        </mask>
      </defs>

      <g mask={`url(#${maskId})`}>
        <path d={t.d} className="tt-path" strokeDasharray="2 7" strokeLinecap="round" fill="none" />
      </g>

      <g className="tt-x">
        <path d={`M${t.x - r} ${t.y - r} L${t.x + r} ${t.y + r}`} strokeLinecap="round" />
        <path d={`M${t.x + r} ${t.y - r} L${t.x - r} ${t.y + r}`} strokeLinecap="round" />
      </g>
    </svg>
  );
}
