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

// مسیرها عمودی‌ان: از بالا شروع می‌شن، چپ‌وراست می‌پیچن و پایین به ضربدر می‌رسن
const TRAILS: Record<Variant, { d: string; x: number; y: number }> = {
  a: { d: "M46 8 C 10 30, 58 48, 32 72 C 8 96, 54 118, 30 142 C 18 154, 22 166, 26 176", x: 26, y: 176 },
  b: { d: "M26 8 C 52 26, 10 48, 34 70 C 56 90, 14 114, 32 138 C 42 152, 34 166, 30 176", x: 30, y: 176 },
  c: { d: "M18 8 C 42 32, 12 52, 36 76 C 58 98, 22 116, 38 140 C 47 154, 40 168, 34 176", x: 34, y: 176 },
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
      viewBox="0 0 60 190"
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
