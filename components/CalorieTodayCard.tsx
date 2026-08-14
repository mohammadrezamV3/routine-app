"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { faNum } from "@/lib/jalali";
import type { Target } from "./CaloriePanel";

// «کالری امروز/فلان‌روز» — عمداً کارت/باکس نیست، طبقِ طرحِ کاربر: فقط
// تایتل + عددِ مصرف‌شده/هدف + یک خطِ نازکِ افقی که با انیمیشن پر می‌شه.
// بدونِ درصد، بدونِ بوردر/بک‌گراند دورش.
export function CalorieTodayCard({
  target,
  totalToday,
  pct,
  dayLabel,
  isToday,
  onEditGoal,
}: {
  target: Target;
  totalToday: number;
  pct: number;
  dayLabel: string;
  isToday: boolean;
  onEditGoal: () => void;
}) {
  const overGoal = pct > 100;
  const barColor = overGoal ? "#E05252" : "var(--accent)";

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-[13px] font-bold text-dash-text sm:text-[15px]">
          <Flame className="h-4 w-4 text-dash-green sm:h-[18px] sm:w-[18px]" />
          {isToday ? "کالری امروز" : `کالری ${dayLabel}`}
        </h2>
        <button type="button" onClick={onEditGoal} className="text-[11px] font-semibold text-dash-green transition hover:brightness-110 sm:text-[12.5px]">
          تغییر برنامه
        </button>
      </div>

      <div className="mt-2.5 mono text-[15px] font-extrabold sm:text-[18px]" style={{ color: barColor }}>
        {faNum(totalToday)}
        <span className="mx-1 text-dash-muted">/</span>
        {faNum(target.dailyTargetKcal)}
        <span className="mr-1.5 text-[10.5px] font-semibold text-dash-muted sm:text-[12px]">کالری</span>
      </div>

      <div className="mt-2.5" style={{ height: 2, background: "rgba(255,255,255,.08)" }}>
        <motion.div
          className="h-full"
          style={{ background: barColor }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, pct)}%` }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
