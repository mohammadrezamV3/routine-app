"use client";

import { motion } from "framer-motion";
import type { DayCell } from "@/lib/weeklyAnalysis/types";
import { V_WK_CARD, jalaliShort, useMounted, weekdayLetter } from "./WeeklyAnalysisKit";
import "./wa-days.css";

type Tag = "best" | "worst" | "today" | "future" | "none";

const TAG_LABEL: Record<Tag, string> = {
  best: "بهترین روز", worst: "ضعیف‌ترین", today: "امروز", future: "آینده", none: "",
};

// بهترین/ضعیف‌ترین روز فقط وقتی معنا داره که حداقل سه روز امتیاز داشته باشیم
// و بیشینه و کمینه برابر نباشن
function pickExtremes(days: DayCell[]): { best: number; worst: number } | null {
  const scored = days.map((d, i) => ({ i, s: d.isFuture ? null : d.score })).filter((x): x is { i: number; s: number } => x.s !== null);
  if (scored.length < 3) return null;
  const best = scored.reduce((a, b) => (b.s > a.s ? b : a));
  const worst = scored.reduce((a, b) => (b.s < a.s ? b : a));
  return best.s === worst.s ? null : { best: best.i, worst: worst.i };
}

// «روزهای هفته»: هفت ستون، هر کدوم یک دکمه که برگه‌ی همون روز رو باز می‌کنه
export function WeeklyAnalysisDays({ days, onPickDay }: { days: DayCell[]; onPickDay: (i: number) => void }) {
  const ready = useMounted();
  if (!Array.isArray(days) || days.length < 7) return null;
  const ext = pickExtremes(days);

  return (
    <motion.section className="wa-days7" variants={V_WK_CARD} aria-label="روزهای هفته" data-noswipe>
      {days.slice(0, 7).map((d, i) => {
        const has = !d.isFuture && d.score !== null;
        const tag: Tag = ext?.best === i ? "best" : ext?.worst === i ? "worst" : d.isToday ? "today" : d.isFuture ? "future" : "none";
        const score = has ? Math.round(d.score as number) : null;
        const cls = `wk-ghost wa-d7${d.isToday ? " is-today" : ""}${d.isFuture ? " is-future" : ""}${has ? "" : " is-empty"} wa-tg-${tag}`;
        return (
          <button
            key={d.date}
            type="button"
            className={cls}
            disabled={d.isFuture}
            onClick={() => onPickDay(i)}
            aria-label={`${d.weekday} ${jalaliShort(d.date)}: ${score === null ? "بدون داده" : score}`}
          >
            <span className="wa-d7-name"><span className="wa-d7-full">{d.weekday}</span><span className="wa-d7-short">{weekdayLetter(d.weekday)}</span></span>
            <span className="wa-d7-date">{jalaliShort(d.date)}</span>
            <span className="wa-d7-track" aria-hidden="true">
              <i className="wa-d7-fill" style={{ ["--h" as string]: ready && has ? `${Math.max(3, score as number)}%` : "0%", transitionDelay: `${0.25 + i * 0.05}s` }} />
            </span>
            <strong className="wa-d7-score wk-num">{score === null ? "—" : score}</strong>
            <span className="wa-d7-tag">{TAG_LABEL[tag]}</span>
          </button>
        );
      })}
    </motion.section>
  );
}
