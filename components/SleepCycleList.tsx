"use client";

import { memo } from "react";
import { m as motion, useReducedMotion } from "framer-motion";
import { MAX_CYCLES, type CycleOption } from "@/lib/sleepCycles";
import { durationLabel } from "@/lib/sleep";
import { tr } from "@/lib/i18n";

// فهرست گزینه‌های چرخه: ساعت درشت (چپ‌به‌راست)، تعداد چرخه + مدت، و نوار ریز
// چرخه‌ها. گزینه‌ی پیشنهادی (نزدیک‌ترین به هدف) با رنگ بوردر، رنگ ساعت و نشان
// «پیشنهادی» (داخل خود ردیف) مشخص می‌شه، بدون بک‌گراند. kind می‌گه ساعت‌ها بیدارشدنه یا خوابیدن.
export const SleepCycleList = memo(function SleepCycleList({
  options, listKey, kind,
}: { options: CycleOption[]; listKey: string; kind: "wake" | "bed" }) {
  const reduce = useReducedMotion();
  return (
    <ul className="slc-list" key={listKey} aria-label={kind === "wake" ? tr("ساعت‌های پیشنهادی بیداری", "Suggested wake-up times") : tr("ساعت‌های پیشنهادی خواب", "Suggested bedtimes")}>
      {options.map((o, i) => (
        <motion.li
          key={o.cycles}
          className={`slc-row${o.best ? " is-best" : ""}`}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.32, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="slc-time">
            <b className="slc-clock" dir="ltr">{o.clock}</b>
            {o.best && <span className="slc-badge">{tr("پیشنهادی", "Suggested")}</span>}
          </span>
          <svg className="slc-pips" viewBox={`0 0 ${MAX_CYCLES * 8 - 2} 6`} aria-hidden="true">
            {Array.from({ length: MAX_CYCLES }, (_, k) => (
              <rect key={k} x={k * 8} y={0} width={6} height={6} rx={3} className={k < o.cycles ? "on" : "off"} />
            ))}
          </svg>
          <span className="slc-meta">
            {tr(`${o.cycles} چرخه کامل`, `${o.cycles} full ${o.cycles === 1 ? "cycle" : "cycles"}`)} · {durationLabel(o.sleepMin)}
          </span>
        </motion.li>
      ))}
    </ul>
  );
});
