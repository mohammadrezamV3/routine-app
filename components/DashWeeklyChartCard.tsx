"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DashCard } from "./DashCard";
import { getWeekStats, WeekDayStat } from "@/lib/routineStats";

// نمودار میله‌ای آمار هفتگی — درصدِ واقعیِ هرروز (از DailyEntry.completedItems
// نسبت به تعداد برنامه‌های همون روز)، راست‌چینِ طبیعی: شنبه راست، جمعه چپ.
export function DashWeeklyChartCard({ delay }: { delay?: number }) {
  const [stats, setStats] = useState<WeekDayStat[] | null>(null);

  useEffect(() => { getWeekStats().then(setStats); }, []);

  const rows = stats ?? [];
  const maxPct = Math.max(1, ...rows.map((s) => s.pct));

  return (
    <DashCard delay={delay}>
      <h2 className="text-right text-[15px] font-bold text-dash-text">آمار هفتگی</h2>

      {stats === null ? (
        <div className="mt-4 text-[12px] text-dash-muted">در حال بارگذاری…</div>
      ) : (
        <div className="mt-5 flex items-end gap-3">
          <div className="flex flex-1 items-end justify-between gap-2">
            {rows.map((s, i) => {
              const peak = s.pct > 0 && s.pct === maxPct;
              return (
                <div key={s.iso} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className={cn("text-[10px] font-semibold", peak ? "text-dash-green" : "text-dash-muted")}>{s.pct}٪</span>
                  <div className="flex h-28 w-full items-end justify-center">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(s.pct > 0 ? 4 : 1, s.pct)}%` }}
                      transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 + i * 0.05 }}
                      className="w-2.5 rounded-full"
                      style={{
                        background: peak ? "var(--accent)" : "rgba(var(--accent-rgb),.45)",
                        boxShadow: peak ? "0 0 12px rgba(var(--accent-rgb),.6)" : "none",
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-dash-muted sm:text-[11.5px]">{s.short}</span>
                </div>
              );
            })}
          </div>

          <div className="flex h-28 shrink-0 flex-col justify-between pb-4 text-[10px] text-dash-muted sm:text-[10.5px]">
            <span>٪۱۰۰</span>
            <span>٪۵۰</span>
            <span>٪۰</span>
          </div>
        </div>
      )}
    </DashCard>
  );
}
