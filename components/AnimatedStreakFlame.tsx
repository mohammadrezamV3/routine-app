"use client";

import { useEffect, useId, useState } from "react";
import { FLAME_BOX, FLAME_LAYERS, flamePalette, flamePath, layerFrame } from "@/lib/streakFlameShape";

// شعله‌ی بزرگ و زنده‌ی استریک (پاپ‌آپ جشن) — سه زبانه‌ی تو‌در‌تو که هرکدوم
// با ریتم خودش بین چهار فریم مورف می‌شه (SMIL روی `d`)، به‌علاوه‌ی جرقه‌هایی
// که از پایه بالا می‌رن و هاله‌ای که نفس می‌کشه. «حرکت‌کاهی»  سیستم → فقط
// فریم اول، ساکن.
const EMBERS = [
  { x: 62, d: 0, s: 5, dur: 1.9 },
  { x: 128, d: 0.5, s: 4, dur: 1.6 },
  { x: 92, d: 0.9, s: 3.5, dur: 2.2 },
  { x: 142, d: 1.3, s: 3, dur: 1.8 },
  { x: 72, d: 1.6, s: 4.5, dur: 2 },
  { x: 110, d: 0.2, s: 3, dur: 1.7 },
];

export function AnimatedStreakFlame({ days, size = 180, className }: { days: number; size?: number; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const pal = flamePalette(days);
  const [still, setStill] = useState(false);
  useEffect(() => {
    try { setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch { /* قدیمی */ }
  }, []);

  const { w, h, cx, by } = FLAME_BOX;
  return (
    <svg
      className={`streak-bigflame${still ? " is-still" : ""}${className ? ` ${className}` : ""}`}
      viewBox={`0 0 ${w} ${h}`}
      width={size}
      height={(size * h) / w}
      aria-hidden="true"
    >
      <defs>
        {FLAME_LAYERS.map((l) => (
          <linearGradient key={l.key} id={`${uid}-${l.key}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={pal[l.key][1]} />
            <stop offset="1" stopColor={pal[l.key][0]} />
          </linearGradient>
        ))}
        <radialGradient id={`${uid}-glow`} cx="0.5" cy="0.62" r="0.5">
          <stop offset="0" stopColor={`rgb(${pal.glow})`} stopOpacity=".55" />
          <stop offset="1" stopColor={`rgb(${pal.glow})`} stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse className="streak-bigflame-glow" cx={cx} cy={by - 90} rx={98} ry={110} fill={`url(#${uid}-glow)`} />

      <g className="streak-bigflame-body">
        {FLAME_LAYERS.map((l, li) => {
          const lb = by - li * 6;
          const frames = [0, 1, 2, 3, 0].map((i) => flamePath(cx, lb, layerFrame(l, i)));
          return (
            <path key={l.key} className={`streak-bigflame-${l.key}`} d={frames[0]} fill={`url(#${uid}-${l.key})`}>
              {!still && (
                <animate
                  attributeName="d"
                  dur={`${l.dur}s`}
                  repeatCount="indefinite"
                  values={frames.join(";")}
                  keyTimes="0;0.25;0.5;0.75;1"
                  calcMode="spline"
                  keySplines=".45 0 .55 1;.45 0 .55 1;.45 0 .55 1;.45 0 .55 1"
                />
              )}
            </path>
          );
        })}
      </g>

      {!still && (
        <g className="streak-bigflame-embers">
          {EMBERS.map((e, i) => (
            <circle
              key={i}
              cx={e.x}
              cy={by - 40}
              r={e.s}
              fill={pal.mid[0]}
              style={{ animationDelay: `${e.d}s`, animationDuration: `${e.dur}s` }}
            />
          ))}
        </g>
      )}
    </svg>
  );
}
