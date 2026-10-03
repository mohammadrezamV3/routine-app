"use client";

import "./sleep-dial.css";
import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FA_WEEKDAY_SHORT, faNum } from "@/lib/jalali";
import { addDaysIso, scoreBand, sleepMinutes, type SleepInsights, type SleepRecord } from "@/lib/sleep";

// هفت شب آخر به‌صورت هفت ستون ساده: ارتفاع ستون = مدت خواب (سقف 10 ساعت)،
// رنگ = امتیاز، خط‌چین = هدف. زدن هر ستون همون شب رو برای ثبت/ویرایش باز
// می‌کنه. ستون‌ها SVG‌ان (fill، نه بک‌گراند CSS). تاریخچه‌ی بلندتر و نمودارها
// در آنالیز هفتگی‌ان.

const MAX_MIN = 10 * 60;
const BAR_H = 96;
const BAR_W = 14;

function hm(min: number): string {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}

export function SleepWeek({
  entries,
  insights,
  todayIso,
  onPick,
}: {
  entries: SleepRecord[];
  insights: SleepInsights;
  todayIso: string;
  onPick: (dateIso: string) => void;
}) {
  const reduce = useReducedMotion();
  const byDate = useMemo(() => new Map(entries.map((e) => [e.date, e])), [entries]);
  const scoreBy = useMemo(() => new Map(insights.scores.map((s) => [s.date, s.score])), [insights.scores]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysIso(todayIso, i - 6)), [todayIso]);
  const goalY = BAR_H - Math.min(1, insights.goalMin / MAX_MIN) * BAR_H;

  return (
    <section className="sl-card slw">
      <h3 className="sl-card-title">هفت شب اخیر</h3>
      <div className="slw-grid">
        <span className="slw-goal" style={{ top: `calc(var(--slw-top) + ${goalY}px)` }} aria-hidden="true" />
        {days.map((iso, i) => {
          const rec = byDate.get(iso);
          const min = rec ? sleepMinutes(rec) : 0;
          const score = scoreBy.get(iso);
          const band = score != null ? scoreBand(score) : null;
          const h = rec ? Math.max(BAR_W, Math.min(1, min / MAX_MIN) * BAR_H) : 0;
          const [y, m, d] = iso.split("-").map(Number);
          const wd = FA_WEEKDAY_SHORT[new Date(y, m - 1, d).getDay()];
          const isToday = iso === todayIso;
          return (
            <button
              key={iso}
              type="button"
              className={`slw-col${isToday ? " is-today" : ""}${rec ? "" : " is-empty"}`}
              onClick={() => onPick(iso)}
              aria-label={rec ? `${wd}: ${hm(min)} خواب${score != null ? `، امتیاز ${score}` : ""}` : `${wd}: ثبت نشده`}
            >
              <span className="slw-val">{rec ? faNum(hm(min)) : "+"}</span>
              <svg className="slw-bar" width={BAR_W} height={BAR_H} viewBox={`0 0 ${BAR_W} ${BAR_H}`} aria-hidden="true">
                <rect x={0} y={0} width={BAR_W} height={BAR_H} rx={BAR_W / 2} className="slw-slot" />
                {rec && (
                  <motion.rect
                    x={0}
                    width={BAR_W}
                    rx={BAR_W / 2}
                    className={`slw-fill${band ? ` slp-c-${band}` : ""}`}
                    initial={reduce ? false : { y: BAR_H, height: 0 }}
                    animate={{ y: BAR_H - h, height: h }}
                    transition={{ duration: 0.7, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
              </svg>
              <span className="slw-day">{wd}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
