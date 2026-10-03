"use client";

import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import type { DayCell } from "@/lib/weeklyAnalysis/types";
import { Liquid, Num, V_WK_CARD, jalaliShort, scoreGrad, useMounted, weekdayLetter } from "./WeeklyAnalysisKit";

// ریتم هفته: هفت ستون مایع (شنبه سمت راست) با امتیاز روز. نشانگر توخالی هر
// ستون = امتیاز همون روز در هفته‌ی قبل (prevDays). امروز یک نقطه‌ی ضربان
// کوچک داره و روز آینده خط‌چینه. زدن هر ستون برگه‌ی جزئیات روز رو باز می‌کنه.
export function WeeklyAnalysisRhythm({
  days, prevDays, selected, onPick,
}: { days: DayCell[]; prevDays: (number | null)[]; selected: number | null; onPick: (i: number) => void }) {
  const ready = useMounted();
  const hasPrev = prevDays.some((v) => v !== null);

  return (
    <motion.section className="wk-card wk-rhythm" variants={V_WK_CARD} aria-label="ریتم هفته">
      <header className="wk-card-head">
        <h2 className="wk-card-title"><Activity size={16} className="wk-title-icon" />ریتم هفته</h2>
        {hasPrev && (
          <span className="wk-legend"><i className="wk-legend-ghost" />همین روز هفته‌ی قبل</span>
        )}
      </header>

      <div className="wk-rh-chart" role="group" aria-label="امتیاز روزهای هفته">
        <div className="wk-rh-grid" aria-hidden="true">
          <span style={{ ["--g" as string]: 100 }}>100</span>
          <span style={{ ["--g" as string]: 50 }}>50</span>
          <span style={{ ["--g" as string]: 0 }}>0</span>
        </div>
        <div className="wk-rh-cols">
          {days.map((d, i) => {
            const prev = prevDays[i];
            const score = d.isFuture ? null : d.score;
            const label = d.isFuture ? "هنوز نرسیده" : score === null ? "بدون داده" : String(Math.round(score));
            return (
              <button
                key={d.date}
                type="button"
                className={`wk-ghost wk-rh-col${d.isToday ? " is-today" : ""}${d.isFuture ? " is-future" : ""}${selected === i ? " is-sel" : ""}`}
                onClick={() => onPick(i)}
                aria-label={`${d.weekday} ${jalaliShort(d.date)}: ${label}`}
                aria-pressed={selected === i}
              >
                <span className="wk-rh-val">{score === null ? <span className="wk-muted-sm">—</span> : <Num value={Math.round(score)} duration={0.7} />}</span>
                <span className="wk-rh-plot">
                  <Liquid pct={score} grad={scoreGrad(score)} ready={ready} delay={i * 50} className={`wk-rh-liquid${d.isFuture ? " is-future" : ""}`} />
                  {prev !== null && prev !== undefined && (
                    <span className="wk-rh-prev" style={{ ["--p" as string]: ready ? prev : 0 }} />
                  )}
                </span>
                <span className="wk-rh-day">
                  {d.isToday && <i className="wk-pulse" aria-hidden="true" />}
                  <span className="wk-rh-day-full">{d.weekday}</span>
                  <span className="wk-rh-day-short" aria-hidden="true">{weekdayLetter(d.weekday)}</span>
                </span>
                <span className="wk-rh-date wk-num">{jalaliShort(d.date)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
