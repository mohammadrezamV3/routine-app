"use client";

import "./wa-viz.css";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Crown } from "lucide-react";
import type { DayCell } from "@/lib/weeklyAnalysis/types";
import { Num, WK_EASE, jalaliShort, useCalmMotion, useSeen, weekdayLetter } from "./WeeklyAnalysisKit";

// ریتم هفته (پنل داخل «الگوهای هفته»): هفت ستون، شنبه سمت راست. میله‌ی پر =
// امتیاز روز، میله‌ی خط‌چین پشتش = همون روز هفته‌ی قبل. میله‌ها پله‌پله بالا
// می‌آن، هاور/فوکوس یه ستون مقدار و مقایسه‌ش رو نشون می‌ده. بهترین روز تاج
// داره، امروز نقطه‌ی accent و روز آینده خط‌چینه. زدن ستون = برگه‌ی جزئیات روز.
export function WeeklyAnalysisRhythm({
  days, prevDays, selected, onPick,
}: { days: DayCell[]; prevDays: (number | null)[]; selected: number | null; onPick: (i: number) => void }) {
  const [seenRef, ready] = useSeen<HTMLDivElement>();
  const calm = useCalmMotion();
  const [hov, setHov] = useState<number | null>(null);
  const hasPrev = prevDays.some((v) => v !== null);
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
    <div className="wkv-rh">
      {hasPrev && (
        <div className="wkv-rh-legend">
          <span className="wk-legend"><i className="wk-legend-fill" />این هفته</span>
          <span className="wk-legend"><i className="wk-legend-ghost" />همین روز هفته‌ی قبل</span>
        </div>
      )}
      <div ref={seenRef} className="wkv-rh-chart" role="group" aria-label="امتیاز روزهای هفته">
        <div className="wkv-rh-grid" aria-hidden="true">
          {[100, 50, 0].map((g) => (
            <span key={g} style={{ ["--g" as string]: g }}>{g}</span>
          ))}
        </div>
        <div className="wkv-rh-cols">
          {days.map((d, i) => {
            const prev = prevDays[i];
            const score = d.isFuture ? null : d.score;
            const label = d.isFuture ? "هنوز نرسیده" : score === null ? "بدون داده" : String(Math.round(score));
            const h = score === null ? 0 : Math.max(2, score);
            const delta = score !== null && prev !== null && prev !== undefined ? Math.round(score - prev) : null;
            const show = hov === i;
            return (
              <button
                key={d.date}
                type="button"
                className={`wk-ghost wkv-rh-col${bestIdx === i ? " is-best" : ""}${d.isToday ? " is-today" : ""}${d.isFuture ? " is-future" : ""}${selected === i ? " is-sel" : ""}${show ? " is-hov" : ""}`}
                onClick={() => onPick(i)}
                onPointerEnter={(e) => { if (e.pointerType === "mouse") setHov(i); }}
                onPointerLeave={(e) => { if (e.pointerType === "mouse") setHov((v) => (v === i ? null : v)); }}
                onFocus={() => setHov(i)}
                onBlur={() => setHov((v) => (v === i ? null : v))}
                aria-label={`${d.weekday} ${jalaliShort(d.date)}: ${label}`}
                aria-pressed={selected === i}
              >
                {show && (
                  <span className="wkv-rh-tip" dir="rtl" aria-hidden="true">
                    <b className="wk-num">{label}</b>
                    {prev !== null && prev !== undefined && <span>هفته‌ی قبل <span className="wk-num">{Math.round(prev)}</span></span>}
                    {delta !== null && delta !== 0 && <span className={`wkv-rh-tip-d ${delta > 0 ? "up" : "down"} wk-num`} dir="ltr">{delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`}</span>}
                  </span>
                )}
                <span className="wkv-rh-val">
                  {bestIdx === i && <Crown size={13} className="wkv-rh-crown" aria-label="بهترین روز" role="img" />}
                  {score === null ? <span className="wk-muted-sm">—</span> : <Num value={Math.round(score)} duration={0.7} delay={i * 0.06} />}
                </span>
                <span className="wkv-rh-plot">
                  {prev !== null && prev !== undefined && !d.isFuture && (
                    <motion.i
                      className="wkv-rh-ghost"
                      initial={{ height: calm ? `${prev}%` : "0%" }}
                      animate={{ height: ready || calm ? `${Math.max(1, prev)}%` : "0%" }}
                      transition={{ duration: 0.7, delay: calm ? 0 : i * 0.06 + 0.1, ease: WK_EASE }}
                    />
                  )}
                  {score === null ? (
                    <i className={`wkv-rh-none${d.isFuture ? " is-future" : ""}`} />
                  ) : (
                    <motion.i
                      className="wkv-rh-bar"
                      initial={{ height: calm ? `${h}%` : "0%" }}
                      animate={{ height: ready || calm ? `${h}%` : "0%" }}
                      transition={{ duration: 0.8, delay: calm ? 0 : i * 0.06, ease: WK_EASE }}
                      style={{ ["--bi" as string]: Math.max(0.35, score / 100) }}
                    />
                  )}
                </span>
                <span className="wkv-rh-day">
                  <span className="wkv-rh-day-full">{d.weekday}</span>
                  <span className="wkv-rh-day-short" aria-hidden="true">{weekdayLetter(d.weekday)}</span>
                </span>
                <i className={`wkv-rh-today${d.isToday ? " is-on" : ""}`} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
