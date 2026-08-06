"use client";

import { useState } from "react";
import { CAL_WEEK_ORDER, FA_WEEKDAY } from "@/lib/jalali";
import { ExerciseDay } from "@/lib/exercisePlans";

// «برنامه هفتگی» بدنسازی — عیناً همون آکاردئونِ week-day/week-day-head/
// week-day-body که توی app/weekly/page.tsx برای برنامه‌های روتین استفاده
// می‌شه؛ این‌جا به‌جای نوارِ زمانی، لیستِ حرکاتِ همون روز رو نشون می‌ده چون
// حرکات ساعتِ مشخص ندارن، فقط ترتیب.
export function ExerciseWeekAccordion({ planData, todayName }: { planData: ExerciseDay[]; todayName: string }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const byDay = new Map(planData.map((d) => [d.day, d]));

  return (
    <section className="dash-breakout">
      <div className="weekly-align-end">
        <div className="weekly-head-row">
          <h1>برنامه هفتگی</h1>
        </div>

        <div className="weekly-glass">
          <div className="weekly-glass-content">
            {CAL_WEEK_ORDER.map((jsDay, idx) => {
              const dayName = FA_WEEKDAY[jsDay];
              const d = byDay.get(dayName);
              const isOpen = openIdx === idx;
              const isToday = dayName === todayName;

              return (
                <div key={dayName} className={`week-day${isOpen ? " open" : ""}`}>
                  <div className="week-day-head" onClick={() => setOpenIdx(isOpen ? null : idx)}>
                    <span className={`week-day-name${isToday ? " today" : ""}`}>{dayName}</span>
                    <span className="week-day-chevron" />
                  </div>
                  <div className="week-day-body" style={{ maxHeight: isOpen ? "none" : "0px", overflow: "hidden" }}>
                    {!d ? (
                      <div className="week-day-empty">این روز برنامه‌ای ثبت نشده — روزِ استراحته</div>
                    ) : (
                      <div className="exercise-week-day-list">
                        <div className="exercise-week-day-focus">{d.focus}</div>
                        <ol>
                          {d.items.map((it, i) => (
                            <li key={it}>
                              <span className="mono">{i + 1}-</span>
                              <span>{it}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
