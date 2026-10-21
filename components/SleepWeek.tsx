"use client";

import "./sleep-dial.css";
import { useId, useMemo } from "react";
import { Plus } from "lucide-react";
import { m as motion, useReducedMotion } from "framer-motion";
import { weekdayShort, faNum } from "@/lib/jalali";
import { tr } from "@/lib/i18n";
import { addDaysIso, circularMeanMinutes, durationLabel, minuteOfDay, scoreBand, sleepMinutes, type SleepInsights, type SleepRecord } from "@/lib/sleep";

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

const BANDS = ["great", "good", "fair", "poor"] as const;

/** پراکندگی ساعت خواب (دقیقه، بیشینه منهای کمینه نسبت به میانگین دایره‌ای) */
function bedSpread(recs: SleepRecord[]): number | null {
  if (recs.length < 3) return null;
  const mins = recs.map((r) => minuteOfDay(r.sleptAt));
  const mean = circularMeanMinutes(mins);
  if (mean === null) return null;
  const dev = mins.map((m) => ((m - mean + 1440 + 720) % 1440) - 720);
  return Math.round(Math.max(...dev) - Math.min(...dev));
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
  const uid = useId().replace(/:/g, "");
  const byDate = useMemo(() => new Map(entries.map((e) => [e.date, e])), [entries]);
  const scoreBy = useMemo(() => new Map(insights.scores.map((s) => [s.date, s.score])), [insights.scores]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysIso(todayIso, i - 6)), [todayIso]);
  const week = useMemo(() => days.map((d) => byDate.get(d)).filter((r): r is SleepRecord => !!r && sleepMinutes(r) > 0), [days, byDate]);
  const avg = week.length ? Math.round(week.reduce((a, r) => a + sleepMinutes(r), 0) / week.length) : null;
  const spread = useMemo(() => bedSpread(week), [week]);
  const goalY = BAR_H - Math.min(1, insights.goalMin / MAX_MIN) * BAR_H;

  return (
    <section className="sl-card slw m-rise" style={{ "--i": 1 } as React.CSSProperties}>
      <h3 className="sl-card-title">{tr("هفت شب اخیر", "Last 7 nights")}</h3>
      <div className="slw-grid">
        <svg width="0" height="0" className="slw-defs" aria-hidden="true" focusable="false">
          <defs>
            {BANDS.map((b) => (
              <linearGradient key={b} id={`slwg-${b}-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" style={{ stopColor: `var(--slp-${b})`, stopOpacity: 0.78 }} />
                <stop offset="100%" style={{ stopColor: `var(--slp-${b})` }} />
              </linearGradient>
            ))}
          </defs>
        </svg>
        <span className="slw-goal" style={{ top: `calc(var(--slw-top) + ${goalY}px)` }} aria-hidden="true" />
        {days.map((iso, i) => {
          const rec = byDate.get(iso);
          const min = rec ? sleepMinutes(rec) : 0;
          const score = scoreBy.get(iso);
          const band = score != null ? scoreBand(score) : null;
          const h = rec ? Math.max(BAR_W, Math.min(1, min / MAX_MIN) * BAR_H) : 0;
          const [y, m, d] = iso.split("-").map(Number);
          const wd = weekdayShort(new Date(y, m - 1, d).getDay());
          const isToday = iso === todayIso;
          return (
            <button
              key={iso}
              type="button"
              className={`slw-col${isToday ? " is-today" : ""}${rec ? "" : " is-empty"}`}
              onClick={() => onPick(iso)}
              aria-label={rec ? tr(`${wd}: ${hm(min)} خواب${score != null ? `، امتیاز ${score}` : ""}`, `${wd}: ${hm(min)} asleep${score != null ? `, score ${score}` : ""}`) : tr(`${wd}: ثبت نشده`, `${wd}: not logged`)}
            >
              <span className="slw-val">{rec ? faNum(hm(min)) : <Plus aria-hidden />}</span>
              <svg className="slw-bar" width={BAR_W} height={BAR_H} viewBox={`0 0 ${BAR_W} ${BAR_H}`} aria-hidden="true">
                <rect x={0} y={0} width={BAR_W} height={BAR_H} rx={BAR_W / 2} className="slw-slot" />
                {rec && (
                  <motion.rect
                    x={0}
                    width={BAR_W}
                    rx={BAR_W / 2}
                    className={`slw-fill${band ? ` slp-c-${band}` : ""}`}
                    style={{ fill: `url(#slwg-${band ?? "good"}-${uid})` }}
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
      {avg === null ? (
        <p className="slw-foot is-empty">{tr("هنوز شبی این هفته ثبت نشده. یک ستون رو بزن و خوابت رو ثبت کن.", "No nights logged this week yet. Tap a column to log your sleep.")}</p>
      ) : (
        <p className="slw-foot">
          <span>{tr("میانگین", "Avg")} <b dir="ltr">{faNum(hm(avg))}</b></span>
          <span className={insights.debt7Min > 0 ? "is-debt" : "is-ok"}>
            {insights.debt7Min > 0
              ? <>{tr("بدهی خواب", "Sleep debt")} <b>{durationLabel(insights.debt7Min)}</b></>
              : tr("بدون بدهی خواب", "No sleep debt")}
          </span>
          {spread !== null && <span>{tr("نوسان ساعت خواب", "Bedtime range")} <b>{durationLabel(spread)}</b></span>}
        </p>
      )}
    </section>
  );
}
