"use client";

import { memo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { MAX_CYCLES, type CycleOption } from "@/lib/sleepCycles";
import { durationLabel } from "@/lib/sleep";

// فهرست گزینه‌های چرخه: ساعت درشت (چپ‌به‌راست)، تعداد چرخه + مدت، و نوار ریز
// چرخه‌ها. گزینه‌ی پیشنهادی (نزدیک‌ترین به هدف) فقط با رنگ بوردر و نشان
// «پیشنهاد» مشخص می‌شه، بدون بک‌گراند.
export const SleepCycleList = memo(function SleepCycleList({ options, listKey }: { options: CycleOption[]; listKey: string }) {
  const reduce = useReducedMotion();
  return (
    <ul className="slc-list" key={listKey}>
      {options.map((o, i) => (
        <motion.li
          key={o.cycles}
          className={`slc-row${o.best ? " is-best" : ""}`}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.32, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
        >
          <b className="slc-clock" dir="ltr">{o.clock}</b>
          <span className="slc-meta">
            <span className="slc-cyc">{o.cycles} چرخه</span>
            <small>{durationLabel(o.sleepMin)}</small>
          </span>
          <svg className="slc-pips" viewBox={`0 0 ${MAX_CYCLES * 8 - 2} 6`} aria-hidden="true">
            {Array.from({ length: MAX_CYCLES }, (_, k) => (
              <rect key={k} x={k * 8} y={0} width={6} height={6} rx={3} className={k < o.cycles ? "on" : "off"} />
            ))}
          </svg>
          {o.best && <span className="slc-badge">پیشنهاد</span>}
        </motion.li>
      ))}
    </ul>
  );
});
