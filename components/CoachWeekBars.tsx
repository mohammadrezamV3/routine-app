"use client";

import "./coach.css";
import type { CoachWeekDay } from "@/lib/coachTypes";
import { weekdayShort } from "@/lib/jalali";
import { tr } from "@/lib/i18n";

const dow = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();

/** نمودار هفت‌روزه با ستون‌های CSS خالص. metric: درصد روتین (پیش‌فرض) یا خواب (سقف 10 ساعت) */
export function CoachWeekBars({ days, metric = "routine", todayIso }: { days: CoachWeekDay[]; metric?: "routine" | "sleep"; todayIso?: string }) {
  const val = (d: CoachWeekDay) => (metric === "routine" ? d.routineRate : d.sleepMinutes == null ? null : (d.sleepMinutes / 600) * 100);
  const known = days.map(val).filter((v): v is number => v != null);
  const avg = known.length ? Math.round(known.reduce((a, b) => a + b, 0) / known.length) : null;
  const summary = metric === "routine"
    ? avg == null ? tr("هنوز داده‌ای نیست", "No data yet") : tr(`میانگین روتین ${avg}%`, `Routine average ${avg}%`)
    : avg == null ? tr("هنوز داده‌ای نیست", "No data yet") : tr(`میانگین خواب ${(avg * 6 / 100).toFixed(1)} ساعت`, `Sleep average ${(avg * 6 / 100).toFixed(1)} hours`);
  return (
    <div className="ch-bars" role="img" aria-label={summary}>
      {days.map((d) => {
        const v = val(d);
        const h = v == null ? 0 : Math.max(6, Math.min(100, v));
        return (
          <div key={d.date} className={`ch-bar${d.date === todayIso ? " is-today" : ""}${v == null ? " is-empty" : ""}`}>
            <span className="ch-bar-track"><span className="ch-bar-fill" style={{ height: `${h}%` }} /></span>
            <span className="ch-bar-label" aria-hidden="true">{weekdayShort(dow(d.date))}</span>
            {metric === "routine" && <span className={`ch-bar-dot${d.workout ? " is-on" : ""}`} aria-hidden="true" />}
          </div>
        );
      })}
    </div>
  );
}
