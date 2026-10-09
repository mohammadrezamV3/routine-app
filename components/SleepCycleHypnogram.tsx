"use client";

import { memo, useId, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { tr } from "@/lib/i18n";
import { CYCLE_MIN, stageLabel, hypnogram, type Stage } from "@/lib/sleepCycles";

// نمودار پله‌ای تخمینی مراحل خواب (hypnogram). الگو از lib/sleepCycles.ts می‌آد
// و اندازه‌گیری واقعی نیست؛ برچسب «تخمینی» کنارش می‌شینه. محور زمان چپ به راست.
const W = 320;
const H = 112;
const PAD_X = 6;
const Y: Record<Stage, number> = { awake: 12, rem: 38, light: 64, deep: 92 };

export const SleepCycleHypnogram = memo(function SleepCycleHypnogram({
  totalMin, latency, startClock, endClock,
}: { totalMin: number; latency: number; startClock: string; endClock: string }) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const { d, bounds } = useMemo(() => {
    const segs = hypnogram(totalMin, latency);
    const x = (m: number) => PAD_X + (m / Math.max(1, totalMin)) * (W - PAD_X * 2);
    let path = "";
    segs.forEach((s, i) => {
      const y = Y[s.stage];
      path += i === 0 ? `M${x(s.from).toFixed(1)} ${y}` : `L${x(s.from).toFixed(1)} ${y}`;
      path += `L${x(s.to).toFixed(1)} ${y}`;
    });
    const bs: number[] = [];
    for (let t = latency + CYCLE_MIN; t < totalMin; t += CYCLE_MIN) bs.push(x(t));
    return { d: path, bounds: bs };
  }, [totalMin, latency]);

  return (
    <div className="slc-hypno" dir="ltr">
      <div className="slc-hypno-body">
        <div className="slc-hypno-labels" aria-hidden="true">
          {(["awake", "rem", "light", "deep"] as Stage[]).map((s) => (
            <span key={s} style={{ top: `${(Y[s] / H) * 100}%` }}>{stageLabel(s)}</span>
          ))}
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="slc-hypno-svg" role="img" aria-label={tr("نمودار تخمینی مراحل خواب دیشب", "Estimated chart of last night's sleep stages")}>
          <defs>
            <linearGradient id={`slch${uid}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" style={{ stopColor: "var(--slp-ink)" }} />
              <stop offset="100%" style={{ stopColor: "var(--slp-ink-2)" }} />
            </linearGradient>
          </defs>
          {(["awake", "rem", "light", "deep"] as Stage[]).map((s) => (
            <line key={s} x1={PAD_X} x2={W - PAD_X} y1={Y[s]} y2={Y[s]} className="slc-hypno-grid" />
          ))}
          {bounds.map((bx, i) => (
            <line key={i} x1={bx} x2={bx} y1={4} y2={H - 4} className="slc-hypno-cut" />
          ))}
          <motion.path
            d={d}
            className="slc-hypno-line"
            stroke={`url(#slch${uid})`}
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={reduce ? { duration: 0 } : { duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
      </div>
      <div className="slc-hypno-axis">
        <span>{startClock}</span>
        <span>{endClock}</span>
      </div>
    </div>
  );
});
