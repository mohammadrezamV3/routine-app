"use client";

import { motion } from "framer-motion";
import { CAL_WEEK_ORDER, FA_WEEKDAY } from "@/lib/jalali";
import { ExerciseDay } from "@/lib/exercisePlans";
import { cn } from "@/lib/utils";

// «برنامه هفتگی» بدنسازی — یک گرید از ۷ کارت، همه از همون اول باز/دیده‌شون
// (بدونِ تاگل/آکاردئون)؛ الگویی که اپ‌های واقعیِ فیتنس (Hevy، FitnessGrid،
// Fitbod) برای نمایشِ برنامه‌ی هفتگی استفاده می‌کنن — همه‌ی روزها هم‌زمان
// قابلِ مقایسه، به‌جای کلیک روی هرکدوم برای بازشدن. موبایل: یک ستونِ
// تمام‌عرض (نه دو ستونِ فشرده) تا اسمِ حرکات بریده نشه؛ روزِ استراحت یک
// ردیفِ کم‌ارتفاعه (نه یه باکسِ خالیِ هم‌قدِ روزهای واقعی) تا اسکرول کمتر شه.
export function ExerciseWeekGrid({ planData, todayName }: { planData: ExerciseDay[]; todayName: string }) {
  const byDay = new Map(planData.map((d) => [d.day, d]));

  return (
    <section>
      <h1 className="mb-4 text-[20px] font-bold text-dash-text sm:mb-5 sm:text-[26px]">برنامه هفتگی</h1>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {CAL_WEEK_ORDER.map((jsDay, idx) => {
          const dayName = FA_WEEKDAY[jsDay];
          const d = byDay.get(dayName);
          const isToday = dayName === todayName;

          return (
            <motion.div
              key={dayName}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut", delay: idx * 0.04 }}
              className={cn(
                "flex flex-col rounded-dash border p-3.5 backdrop-blur-xl sm:p-4",
                d ? "sm:min-h-[190px]" : "sm:min-h-0",
                isToday ? "border-dash-green bg-dash-green/[0.08]" : "border-dash-border bg-dash-card"
              )}
            >
              {d ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("text-[12.5px] font-bold sm:text-[13.5px]", isToday ? "text-dash-green" : "text-dash-text")}>
                      {dayName}
                    </span>
                    {isToday && (
                      <span className="shrink-0 rounded-full bg-dash-green px-1.5 py-0.5 text-[8.5px] font-bold text-dash-bg">
                        امروز
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[11px] font-semibold text-dash-green sm:truncate sm:text-[11.5px]" title={d.focus}>
                    {d.focus}
                  </div>
                  <ol className="mt-2.5 flex flex-1 flex-col gap-1.5">
                    {d.items.map((it, i) => (
                      <li key={it} className="flex items-start gap-1.5 text-[11px] leading-snug text-dash-text sm:text-[11.5px] sm:leading-tight" title={it}>
                        <span className="mono shrink-0 text-dash-muted">{i + 1}-</span>
                        <span className="sm:truncate">{it}</span>
                      </li>
                    ))}
                  </ol>
                </>
              ) : (
                <div className="flex items-center justify-between gap-2 sm:flex-1 sm:flex-col sm:items-center sm:justify-center sm:gap-1">
                  <span className="text-[12.5px] font-bold text-dash-text sm:text-[13.5px]">{dayName}</span>
                  <span className="text-[10.5px] text-dash-muted">روزِ استراحت</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
