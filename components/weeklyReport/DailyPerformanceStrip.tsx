"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DOMAIN_LABELS_FA, Domain } from "@/lib/weeklyReport/metrics";
import { DailyBreakdownDay } from "@/lib/weeklyReport/analysis";

function overallOf(day: DailyBreakdownDay): number | null {
  const vals = Object.values(day.domains).filter((v): v is number => v != null);
  if (vals.length === 0) return null;
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
}

function barColorClass(v: number | null): string {
  if (v == null) return "empty";
  if (v >= 70) return "good";
  if (v >= 40) return "mid";
  return "low";
}

// تایم‌لاین ۷روزه‌ی هفته — هر روز قابل‌کلیکه و جزئیات همون روز رو زیرش باز می‌کنه.
export function DailyPerformanceStrip({ days }: { days: DailyBreakdownDay[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const selected = openIdx != null ? days[openIdx] : null;

  return (
    <div className="wr-daily-strip-wrap">
      <div className="wr-daily-strip">
        {days.map((d, i) => {
          const v = overallOf(d);
          return (
            <button
              key={d.date}
              type="button"
              className={`wr-daily-bar${openIdx === i ? " open" : ""}`}
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
            >
              <span className={`wr-daily-bar-fill ${barColorClass(v)}`} style={{ height: v != null ? `${Math.max(6, v)}%` : "6%" }} />
              <span className="wr-daily-bar-value">{v != null ? v : "—"}</span>
              <span className="wr-daily-bar-label">{d.weekday.slice(0, 1)}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div className="wr-daily-detail" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
            <div className="wr-daily-detail-title">{selected.weekday}</div>
            {Object.keys(selected.domains).length === 0 ? (
              <div className="wr-daily-detail-empty">داده‌ای برای این روز ثبت نشده</div>
            ) : (
              <div className="wr-daily-detail-rows">
                {(Object.entries(selected.domains) as [Domain, number | null][]).map(([dom, val]) => (
                  <div key={dom} className="wr-daily-detail-row">
                    <span>{DOMAIN_LABELS_FA[dom]}</span>
                    <span>{val != null ? `${val}٪` : "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
