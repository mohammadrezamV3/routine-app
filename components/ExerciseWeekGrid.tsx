"use client";

import { motion } from "framer-motion";
import { CalendarDays } from "lucide-react";
import { CAL_WEEK_ORDER, FA_WEEKDAY } from "@/lib/jalali";
import type { ExerciseDay } from "@/lib/exercisePlans";
import { toEnDigits } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { TickButton } from "./TickButton";
import { tr } from "@/lib/i18n";
import { dayNameDisplay, exerciseDisplayName, focusDisplay } from "@/lib/exerciseI18n";

// «برنامه هفتگی» بدنسازی — یک باکس واحد، با پدینگ دورش تا خط جداکننده‌ی
// بین روزها به لبه‌ی باکس نچسبه. موبایل: تک‌ستونی (زیر هم)، بدون تغییر
// چیدمان؛ دسکتاپ (lg+): تایتل راست‌چین، روز استراحت وسط‌چین، بدون باکس
// تودرتو برای امروز (فقط رنگ متن سبز می‌شه)، و خط‌های جداکننده — روی
// سمت راست هر سلول (بین همون سلول و همسایه‌ی راستش، نه چپش، چون
// توی RTL اولین بچه‌ی DOM سمت راست گرید می‌شینه) — به‌جای کشیدن
// تمام‌ارتفاع، از بالا/پایین فاصله دارن (گرادیان محو به‌جای بوردر خام).
export function ExerciseWeekGrid({
  planData,
  todayName,
  dayStatus,
}: {
  planData: ExerciseDay[];
  todayName: string;
  /** وضعیت روزهای *همین هفته* (اسم روز → done/missed از لاگ واقعی؛ rest =
   *  روز استراحتی که رسیده و خودکار تیک می‌خوره) */
  dayStatus?: Record<string, "done" | "missed" | "rest">;
}) {
  const byDay = new Map(planData.map((d) => [d.day, d]));

  return (
    <section>
      {/* طبق درخواست صریح: آیکون کنار تایتل — و flex با justify-start
          (نه چیزی که فرزندها را به دو سر سطر پرت کند)، وگرنه تایتل
          چپ‌چین می‌شود. */}
      <h1 className="mb-4 flex items-center justify-start gap-2 text-[20px] font-bold text-dash-text sm:mb-5 sm:text-[26px]">
        <CalendarDays className="h-[19px] w-[19px] text-dash-green sm:h-6 sm:w-6" />
        {tr("برنامه هفتگی", "Weekly plan")}
      </h1>

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
                    {dayNameDisplay(dayName)}
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {d && dayStatus?.[dayName] && dayStatus[dayName] !== "rest" && (
                      <span
                        className="shrink-0 text-[9.5px] font-semibold sm:text-[10.5px]"
                        style={{ color: dayStatus[dayName] === "done" ? "var(--accent)" : "#E05252" }}
                      >
                        {dayStatus[dayName] === "done" ? tr("انجام دادی", "Done") : tr("وقتش گذشته", "Overdue")}
                      </span>
                    )}
                    {isToday && (
                      <span className="shrink-0 rounded-full bg-dash-green px-1.5 py-0.5 text-[8px] font-bold text-dash-bg sm:text-[8.5px]">
                        {tr("امروز", "Today")}
                      </span>
                    )}
                  </div>
                </div>

                {!d ? (
                  // روز استراحت خودکار «انجام‌شده»ست: همون تیک سایت، ولی فقط
                  // نمایشی (disabled، بدون کلیک) — تا خود روز نرسیده تیک نمی‌خوره.
                  <div className="flex flex-1 items-center gap-1.5 py-1.5 text-[10.5px] text-dash-muted lg:flex-col lg:justify-center lg:text-center">
                    <TickButton as="span" size={20} disabled checked={dayStatus?.[dayName] === "rest"} />
                    <span>{tr("استراحت", "Rest")}</span>
                  </div>
                ) : (
                  <>
                    <div className="mt-1 truncate text-[10px] font-semibold text-dash-green sm:text-[11px]" title={focusDisplay(d.focus)}>
                      {focusDisplay(d.focus)}
                    </div>
                    <ol className="mt-2 flex flex-1 flex-col gap-1">
                      {d.items.map((it, i) => (
                        <li key={it} className="flex items-start gap-1.5 text-[10px] leading-tight text-dash-text sm:text-[11px]" title={toEnDigits(exerciseDisplayName(it))}>
                          <span className="mono shrink-0 text-dash-muted">{i + 1}-</span>
                          <span className="truncate">{toEnDigits(exerciseDisplayName(it))}</span>
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
