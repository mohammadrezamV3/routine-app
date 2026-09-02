"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DashCard } from "./DashCard";
import { getWeekStats, WeekDayStat } from "@/lib/routineStats";
import { BarChart3 } from "lucide-react";

// نمودار میله‌ای آمار هفتگی — درصد واقعی هرروز (از DailyEntry.completedItems
// نسبت به تعداد برنامه‌های همون روز)، راست‌چین طبیعی: شنبه راست، جمعه چپ.
export function DashWeeklyChartCard({ delay, refreshKey }: { delay?: number; refreshKey?: number }) {
  const [stats, setStats] = useState<WeekDayStat[] | null>(null);

  useEffect(() => { getWeekStats().then(setStats); }, [refreshKey]);

  const rows = stats ?? [];
  const maxPct = Math.max(1, ...rows.map((s) => s.pct));

  return (
    <DashCard delay={delay}>
      <h2 className="flex items-center gap-1.5 text-right text-[14px] font-bold text-dash-text sm:text-[15px]">
        <BarChart3 className="h-4 w-4 text-dash-green sm:h-[18px] sm:w-[18px]" />
        آمار هفتگی
      </h2>

      {stats === null ? (
        <div className="mt-4 text-[11px] text-dash-muted sm:text-[12px]">در حال بارگذاری…</div>
      ) : (
        <div className="mt-5 flex items-end gap-3">
          <div className="flex flex-1 items-end justify-between gap-1.5 sm:gap-2">
            {rows.map((s, i) => {
              const peak = s.pct > 0 && s.pct === maxPct;
              return (
                <div key={s.iso} className="flex flex-1 flex-col items-center gap-1 sm:gap-1.5">
                  <span className={cn("text-[9px] font-semibold sm:text-[10px]", peak ? "text-dash-green" : "text-dash-muted")}>{s.pct}٪</span>
                  <div className="flex h-24 w-full items-end justify-center sm:h-28">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(s.pct > 0 ? 4 : 1, s.pct)}%` }}
                      transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 + i * 0.05 }}
                      className="w-2 rounded-full sm:w-2.5"
                      style={{
                        background: peak ? "var(--accent)" : "rgba(var(--accent-rgb),.45)",
                        boxShadow: peak ? "0 0 12px rgba(var(--accent-rgb),.6)" : "none",
                      }}
                    />
                  </div>
                  <span className="text-[9.5px] text-dash-muted sm:text-[11.5px]">{s.short}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </DashCard>
  );
}
