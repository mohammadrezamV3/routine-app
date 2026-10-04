"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import { Activity, Crown } from "lucide-react";
import type { DayCell } from "@/lib/weeklyAnalysis/types";
import { MeterColumn } from "./WeeklyMeter";
import { Num, SectionHead, V_WK_CARD, jalaliShort, useSeen, weekdayLetter } from "./WeeklyAnalysisKit";

// ریتم هفته: هفت ستون اکولایزری (MeterColumn، شنبه سمت راست) با امتیاز روز.
// خط نازک روی هر ستون = امتیاز همون روز در هفته‌ی قبل (prevDays). بهترین
// روز تاج خنثی و خانه‌ی بالایی درخشان داره، امروز یک نقطه‌ی accent زیر اسم
// روز و روز آینده خط‌چینه. ستون‌ها با دیده‌شدن کارت از پایین پله‌پله روشن
// می‌شن. زدن هر ستون برگه‌ی جزئیات روز رو باز می‌کنه.
export function WeeklyAnalysisRhythm({
  days, prevDays, selected, onPick,
}: { days: DayCell[]; prevDays: (number | null)[]; selected: number | null; onPick: (i: number) => void }) {
  const [seenRef, ready] = useSeen<HTMLDivElement>();
  const hasPrev = prevDays.some((v) => v !== null);
  // بهترین روز (تاج بالای عددش): فقط وقتی حداقل دو روز امتیاز دارن و برنده یکتاست
  const bestIdx = useMemo(() => {
    let best = -1;
    let count = 0;
    days.forEach((d, i) => {
      if (d.isFuture || d.score === null) return;
      count++;
      if (best < 0 || d.score > (days[best].score as number)) best = i;
    });
    if (count < 2 || best < 0) return -1;
    const top = days[best].score as number;
    return days.filter((d) => !d.isFuture && d.score === top).length === 1 ? best : -1;
  }, [days]);

  return (
    <motion.section className="wk-card wk-rhythm" variants={V_WK_CARD} aria-label="ریتم هفته">
      <SectionHead
        icon={<Activity size={15} />}
        title="ریتم هفته"
        aside={hasPrev ? <span className="wk-legend"><i className="wk-legend-ghost" />همین روز هفته‌ی قبل</span> : undefined}
      />

      <div ref={seenRef} className="wk-rh-chart" role="group" aria-label="امتیاز روزهای هفته">
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
                className={`wk-ghost wk-rh-col${bestIdx === i ? " is-best" : ""}${d.isToday ? " is-today" : ""}${d.isFuture ? " is-future" : ""}${selected === i ? " is-sel" : ""}`}
                onClick={() => onPick(i)}
                aria-label={`${d.weekday} ${jalaliShort(d.date)}: ${label}`}
                aria-pressed={selected === i}
              >
                {bestIdx === i && <Crown size={14} className="wk-rh-crown" aria-label="بهترین روز" role="img" />}
                <span className="wk-rh-val">{score === null ? <span className="wk-muted-sm">—</span> : <Num value={Math.round(score)} duration={0.7} />}</span>
                <span className="wk-rh-plot">
                  <MeterColumn
                    size="lg"
                    value={score}
                    prev={prev ?? null}
                    on={ready}
                    delay={i * 60}
                    future={d.isFuture}
                    highlight={bestIdx === i}
                  />
                </span>
                <span className="wk-rh-day">
                  <span className="wk-rh-day-full">{d.weekday}</span>
                  <span className="wk-rh-day-short" aria-hidden="true">{weekdayLetter(d.weekday)}</span>
                </span>
                <i className={`wk-rh-today${d.isToday ? " is-on" : ""}`} aria-hidden="true" />
                <span className="wk-rh-date wk-num">{jalaliShort(d.date)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
