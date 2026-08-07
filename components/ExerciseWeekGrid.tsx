"use client";

import { motion } from "framer-motion";
import { CAL_WEEK_ORDER, FA_WEEKDAY } from "@/lib/jalali";
import { ExerciseDay } from "@/lib/exercisePlans";
import { cn } from "@/lib/utils";

// «برنامه هفتگی» بدنسازی — یک باکسِ واحد (نه ۷ کارتِ جدا)، با یه گریدِ
// داخلی که هر روز فقط با یه خطِ نازک از بقیه جدا می‌شه؛ همه‌ی روزها از
// همون اول باز/دیده‌شون (بدونِ تاگل/آکاردئون). موبایل: دو ستون با فونتِ
// کوچیک‌تر تا هم‌زمان چندتا روز دیده بشه، نه یک ستونِ تک‌روز-در-صفحه.
export function ExerciseWeekGrid({ planData, todayName }: { planData: ExerciseDay[]; todayName: string }) {
  const byDay = new Map(planData.map((d) => [d.day, d]));

  return (
    <section>
      <h1 className="mb-4 text-[20px] font-bold text-dash-text sm:mb-5 sm:text-[26px]">برنامه هفتگی</h1>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="overflow-hidden rounded-dash border border-dash-border bg-dash-card backdrop-blur-xl"
      >
        <div className="grid grid-cols-2 divide-x divide-y divide-dash-border sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {CAL_WEEK_ORDER.map((jsDay) => {
            const dayName = FA_WEEKDAY[jsDay];
            const d = byDay.get(dayName);
            const isToday = dayName === todayName;

            return (
              <div
                key={dayName}
                className={cn(
                  "flex min-h-[130px] flex-col p-2.5 sm:min-h-[220px] sm:p-3.5",
                  isToday && "bg-dash-green/[0.08]"
                )}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className={cn("text-[10px] font-bold sm:text-[13px]", isToday ? "text-dash-green" : "text-dash-text")}>
                    {dayName}
                  </span>
                  {isToday && (
                    <span className="shrink-0 rounded-full bg-dash-green px-1 py-0.5 text-[7px] font-bold text-dash-bg sm:px-1.5 sm:text-[8.5px]">
                      امروز
                    </span>
                  )}
                </div>

                {!d ? (
                  <div className="flex flex-1 items-center justify-center text-center text-[9px] text-dash-muted sm:text-[10.5px]">
                    روزِ استراحت
                  </div>
                ) : (
                  <>
                    <div className="mt-0.5 truncate text-[8.5px] font-semibold text-dash-green sm:mt-1 sm:text-[11px]" title={d.focus}>
                      {d.focus}
                    </div>
                    <ol className="mt-1.5 flex flex-1 flex-col gap-1 sm:mt-2.5 sm:gap-1.5">
                      {d.items.map((it, i) => (
                        <li key={it} className="flex items-start gap-1 text-[8.5px] leading-tight text-dash-text sm:gap-1.5 sm:text-[11px]" title={it}>
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
