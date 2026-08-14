"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { faNum } from "@/lib/jalali";
import { DashCard } from "./DashCard";
import type { Target } from "./CaloriePanel";

// «کالری امروز/فلان‌روز» — دیگه حلقه نیست، یه نوارِ افقیه که با انیمیشنِ
// پرشدن (عرض از صفر تا درصدِ واقعی) پر می‌شه، دقیقاً طبقِ طرحِ کاربر.
// سهمِ هر وعده از این کارت جدا شده و کارتِ خودش رو داره (CalorieMealBreakdownCard).
export function CalorieTodayCard({
  target,
  totalToday,
  pct,
  dayLabel,
  isToday,
  onEditGoal,
  delay,
}: {
  target: Target;
  totalToday: number;
  pct: number;
  dayLabel: string;
  isToday: boolean;
  onEditGoal: () => void;
  delay?: number;
}) {
  const overGoal = pct > 100;
  const barColor = overGoal ? "#E05252" : "var(--accent)";

  return (
    <DashCard delay={delay}>
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-[13px] font-bold text-dash-text sm:text-[15px]">
          <Flame className="h-4 w-4 text-dash-green sm:h-[18px] sm:w-[18px]" />
          {isToday ? "کالری امروز" : `کالری ${dayLabel}`}
        </h2>
        <button type="button" onClick={onEditGoal} className="text-[11px] font-semibold text-dash-green transition hover:brightness-110 sm:text-[12.5px]">
          تغییر برنامه
        </button>
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <div className="mono text-[19px] font-extrabold sm:text-[25px]" style={{ color: barColor }}>
          {faNum(totalToday)}
          <span className="mr-1.5 text-[10.5px] font-semibold text-dash-muted sm:text-[12.5px]"> / {faNum(target.dailyTargetKcal)} کالری</span>
        </div>
        <span className="mono text-[13px] font-bold sm:text-[15px]" style={{ color: barColor }}>{faNum(pct)}٪</span>
      </div>

      <div className="relative mt-3 h-3 overflow-hidden rounded-full sm:h-3.5" style={{ background: "rgba(255,255,255,.06)" }}>
        <motion.div
          className="relative h-full overflow-hidden rounded-full"
          style={{ background: barColor, boxShadow: `0 0 10px rgba(var(--accent-rgb),.5)` }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, pct)}%` }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        >
          {/* هایلایتِ نرمِ متحرک روی نوار — همون حسِ «پرشدنِ نوارِ ویندوز» که خواسته شده */}
          <motion.div
            className="absolute inset-y-0 w-1/3"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent)" }}
            animate={{ x: ["-100%", "220%"] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "linear", repeatDelay: 0.4 }}
          />
        </motion.div>
      </div>
    </DashCard>
  );
}
