"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DashCard } from "./DashCard";
import { DASH_WEEKLY_STATS } from "@/lib/dashboardMockData";

// نمودار میله‌ای آمار هفتگی — قبلاً عمداً dir="ltr" بود (مثل نوار تاریخ)،
// ولی برای روزهای هفته این برعکسِ خوانشِ طبیعیِ فارسی از آب در اومد؛ حالا
// راست‌چینِ معمولیه: شنبه (اولِ هفته) سمتِ راست، جمعه سمتِ چپ. درصدِ هر
// روز هم بالای میله‌ش نوشته می‌شه، نه فقط توی محورِ کناری.
export function DashWeeklyChartCard({ delay }: { delay?: number }) {
  return (
    <DashCard delay={delay}>
      <h2 className="text-right text-[15px] font-bold text-dash-text">آمار هفتگی</h2>

      <div className="mt-5 flex items-end gap-3">
        <div className="flex flex-1 items-end justify-between gap-2">
          {DASH_WEEKLY_STATS.map((s, i) => {
            const peak = s.pct >= 90;
            return (
              <div key={s.dayShort} className="flex flex-1 flex-col items-center gap-1.5">
                <span className={cn("text-[10px] font-semibold", peak ? "text-dash-green" : "text-dash-muted")}>{s.pct}٪</span>
                <div className="flex h-28 w-full items-end justify-center">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(4, s.pct)}%` }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 + i * 0.05 }}
                    className="w-2.5 rounded-full"
                    style={{
                      background: peak ? "#2EE66B" : "rgba(46,230,107,.45)",
                      boxShadow: peak ? "0 0 12px rgba(46,230,107,.6)" : "none",
                    }}
                  />
                </div>
                <span className="text-[11px] text-dash-muted sm:text-[11.5px]">{s.dayShort}</span>
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
    </DashCard>
  );
}
