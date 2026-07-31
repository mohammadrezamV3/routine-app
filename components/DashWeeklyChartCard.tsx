"use client";

import { motion } from "framer-motion";
import { DashCard } from "./DashCard";
import { DASH_WEEKLY_STATS } from "@/lib/dashboardMockData";

// نمودار میله‌ای آمار هفتگی — عمداً dir="ltr" مثل نوار تاریخ، چون محور
// درصد و ترتیب روزها باید چپ‌به‌راست/صعودی خونده بشه.
export function DashWeeklyChartCard({ delay }: { delay?: number }) {
  return (
    <DashCard delay={delay}>
      <h2 className="text-right text-[15px] font-bold text-dash-text">آمار هفتگی</h2>

      <div dir="ltr" className="mt-5 flex items-end gap-3">
        <div className="flex h-32 shrink-0 flex-col justify-between pb-5 text-[10.5px] text-dash-muted">
          <span>%100</span>
          <span>%50</span>
          <span>%0</span>
        </div>

        <div className="flex flex-1 items-end justify-between gap-2.5">
          {DASH_WEEKLY_STATS.map((s, i) => {
            const peak = s.pct >= 90;
            return (
              <div key={s.dayShort} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-32 w-full items-end justify-center">
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
                <span className="text-[11.5px] text-dash-muted">{s.dayShort}</span>
              </div>
            );
          })}
        </div>
      </div>
    </DashCard>
  );
}
