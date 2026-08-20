"use client";

import { motion } from "framer-motion";
import { CAL_WEEK_ORDER, FA_WEEKDAY } from "@/lib/jalali";
import type { ExerciseDay } from "@/lib/exercisePlans";
import { cn } from "@/lib/utils";

// «برنامه هفتگی» بدنسازی — یک باکسِ واحد، با پدینگِ دورش تا خطِ جداکننده‌ی
// بینِ روزها به لبه‌ی باکس نچسبه. موبایل: تک‌ستونی (زیرِ هم)، بدونِ تغییرِ
// چیدمان؛ دسکتاپ (lg+): تایتل راست‌چین، روزِ استراحت وسط‌چین، بدونِ باکسِ
// تودرتو برای امروز (فقط رنگِ متن سبز می‌شه)، و خط‌های جداکننده — روی
// سمتِ راستِ هر سلول (بینِ همون سلول و همسایه‌ی راستش، نه چپش، چون
// تویِ RTL اولین بچه‌ی DOM سمتِ راستِ گرید می‌شینه) — به‌جای کشیدنِ
// تمام‌ارتفاع، از بالا/پایین فاصله دارن (گرادیانِ محو به‌جای بوردرِ خام).
export function ExerciseWeekGrid({ planData, todayName }: { planData: ExerciseDay[]; todayName: string }) {
  const byDay = new Map(planData.map((d) => [d.day, d]));

  return (
    <section>
      <h1 className="mb-4 text-[20px] font-bold text-dash-text sm:mb-5 sm:text-[26px]">برنامه هفتگی</h1>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="rounded-dash border border-dash-border bg-dash-card p-2.5 backdrop-blur-xl sm:p-3"
      >
        <div className="grid grid-cols-1 divide-y divide-dash-border sm:grid-cols-2 sm:divide-x lg:grid-cols-7 lg:divide-x-0 lg:divide-y-0">
          {CAL_WEEK_ORDER.map((jsDay, idx) => {
            const dayName = FA_WEEKDAY[jsDay];
            const d = byDay.get(dayName);
            const isToday = dayName === todayName;

            return (
              <div
                key={dayName}
                className={cn(
                  "flex flex-col p-2.5 sm:p-3 lg:min-h-[220px]",
                  isToday && "rounded-xl bg-dash-green/[0.08] lg:rounded-none lg:bg-transparent",
                  idx > 0 && "exercise-week-cell-divider"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("text-[12px] font-bold sm:text-[13px]", isToday ? "text-dash-green" : "text-dash-text")}>
                    {dayName}
                  </span>
                  {isToday && (
                    <span className="shrink-0 rounded-full bg-dash-green px-1.5 py-0.5 text-[8px] font-bold text-dash-bg sm:text-[8.5px]">
                      امروز
                    </span>
                  )}
                </div>

                {!d ? (
                  <div className="flex flex-1 items-center py-1.5 text-[10.5px] text-dash-muted lg:justify-center lg:text-center">روزِ استراحت</div>
                ) : (
                  <>
                    <div className="mt-1 truncate text-[10px] font-semibold text-dash-green sm:text-[11px]" title={d.focus}>
                      {d.focus}
                    </div>
                    <ol className="mt-2 flex flex-1 flex-col gap-1">
                      {d.items.map((it, i) => (
                        <li key={it} className="flex items-start gap-1.5 text-[10px] leading-tight text-dash-text sm:text-[11px]" title={it}>
                          <span className="mono shrink-0 text-dash-muted">{i + 1}-</span>
                          <span className="truncate">{it}</span>
                        </li>
                      ))}
                    </ol>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}
