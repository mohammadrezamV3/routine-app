"use client";

import { memo, useMemo } from "react";
import { m as motion, useReducedMotion } from "framer-motion";
import { tr } from "@/lib/i18n";
import { durationLabel } from "@/lib/sleep";
import { hourTicks, stageTotals } from "@/lib/sleepSheetHelpers";
import { CYCLE_MIN, stageLabel, hypnogram, type Stage } from "@/lib/sleepCycles";

// نمودار پله‌ای تخمینی مراحل خواب (hypnogram). الگو از lib/sleepCycles.ts می‌آد
// و اندازه‌گیری واقعی نیست؛ برچسب «تخمینی» کنارش می‌شینه. محور زمان چپ به راست.
// هر مرحله یه نوار رنگی روی ردیف خودشه؛ زیرش محور ساعت و راهنمای رنگ با مجموع دقیقه.
const W = 320;
const H = 92;
const PAD_X = 6;
const BAR = 8;
const STAGES: Stage[] = ["awake", "rem", "light", "deep"];
const Y: Record<Stage, number> = { awake: 12, rem: 33, light: 54, deep: 75 };
const COLOR: Record<Stage, string> = {
  awake: "var(--slp-fair)", rem: "var(--slp-ink-2)", light: "var(--slp-good)", deep: "var(--slp-ink)",
};

export const SleepCycleHypnogram = memo(function SleepCycleHypnogram({
  totalMin, latency, startClock, endClock,
}: { totalMin: number; latency: number; startClock: string; endClock: string }) {
  const reduce = useReducedMotion();
  const x = (m: number) => PAD_X + (m / Math.max(1, totalMin)) * (W - PAD_X * 2);
  const { segs, links, bounds, totals, ticks } = useMemo(() => {
    const sg = hypnogram(totalMin, latency);
    const lk: { x: number; y1: number; y2: number }[] = [];
    sg.forEach((s, i) => { if (i > 0) lk.push({ x: PAD_X + (s.from / Math.max(1, totalMin)) * (W - PAD_X * 2), y1: Y[sg[i - 1].stage], y2: Y[s.stage] }); });
    const bs: number[] = [];
    for (let t = latency + CYCLE_MIN; t < totalMin; t += CYCLE_MIN) bs.push(PAD_X + (t / Math.max(1, totalMin)) * (W - PAD_X * 2));
    return { segs: sg, links: lk, bounds: bs, totals: stageTotals(sg), ticks: hourTicks(startClock, totalMin) };
  }, [totalMin, latency, startClock]);

  return (
    <div className="slc-hypno">
      <div className="slc-hypno-body" dir="ltr">
        <div className="slc-hypno-labels" aria-hidden="true">
          {STAGES.map((s) => (
            <span key={s} style={{ top: `${(Y[s] / H) * 100}%` }}>{stageLabel(s)}</span>
          ))}
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="slc-hypno-svg" role="img" aria-label={tr("نمودار تخمینی مراحل خواب دیشب", "Estimated chart of last night's sleep stages")}>
          {STAGES.map((s) => (
            <line key={s} x1={PAD_X} x2={W - PAD_X} y1={Y[s]} y2={Y[s]} className="slc-hypno-grid" />
          ))}
          {bounds.map((bx, i) => (
            <line key={i} x1={bx} x2={bx} y1={4} y2={H - 4} className="slc-hypno-cut" />
          ))}
          <motion.g
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={reduce ? { duration: 0 } : { duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {links.map((l, i) => (
              <line key={i} x1={l.x} x2={l.x} y1={l.y1} y2={l.y2} className="slc-hypno-link" />
            ))}
            {segs.map((s, i) => (
              <rect key={i} x={x(s.from)} y={Y[s.stage] - BAR / 2} width={Math.max(1.5, x(s.to) - x(s.from))} height={BAR} rx={BAR / 2} style={{ fill: COLOR[s.stage] }} />
            ))}
          </motion.g>
        </svg>
      </div>
      <div className="slc-hypno-axis" dir="ltr" aria-hidden="true">
        <div className="slc-hypno-track">
          <span className="slc-ax-end" style={{ insetInlineStart: 0 }}>{startClock}</span>
          {ticks.map((t) => (
            <span key={t.label} className="slc-ax-tick" style={{ left: `${t.at * 100}%` }}>{t.label}</span>
          ))}
          <span className="slc-ax-end" style={{ insetInlineEnd: 0 }}>{endClock}</span>
        </div>
      </div>
      <ul className="slc-hlegend">
        {STAGES.map((s) => (
          <li key={s}>
            <i style={{ background: COLOR[s] }} aria-hidden="true" />
            <span>{stageLabel(s)}</span>
            <small>{durationLabel(Math.round(totals[s] ?? 0))}</small>
          </li>
        ))}
      </ul>
    </div>
  );
});
