"use client";

import "./sleep-dial.css";
import "./sleep-charts.css";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { SleepNightDetail, longDate } from "./SleepNightDetail";
import { weekdayShort, faNum } from "@/lib/jalali";
import { tr } from "@/lib/i18n";
import { scoreBandLabel, type SleepInsights, type SleepRecord } from "@/lib/sleep";
import { barHeight, bestNight, buildWeekNights, lastLogged, weekAverage } from "@/lib/sleepWeekStats";

// هفت شب آخر به‌صورت هفت ستون ساده: ارتفاع ستون = مدت خواب (سقف 10 ساعت)،
// رنگ = امتیاز، خط‌چین = هدف. زدن ستون یک شب ثبت‌شده، جزئیاتش رو همون‌جا
// نشون می‌ده (با دکمه‌ی ویرایش)؛ زدن شب خالی مستقیم ثبت رو باز می‌کنه.
// ستون‌ها SVG‌ان (fill، نه بک‌گراند CSS). تاریخچه‌ی بلندتر در آنالیز هفتگیه.

const MAX_MIN = 10 * 60;
const BAR_H = 124;
const BAR_W = 14;

function hm(min: number): string {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}

export function SleepWeek({
  entries,
  insights,
  todayIso,
  target,
  onPick,
}: {
  entries: SleepRecord[];
  insights: SleepInsights;
  todayIso: string;
  target?: { wake: string; sleep: string } | null;
  onPick: (dateIso: string) => void;
}) {
  const [sel, setSel] = useState<string | null>(null);
  const nights = useMemo(() => buildWeekNights(todayIso, entries, insights.scores, insights.goalMin), [todayIso, entries, insights.scores, insights.goalMin]);
  const avg = useMemo(() => weekAverage(nights), [nights]);
  const best = useMemo(() => bestNight(nights), [nights]);
  const latest = useMemo(() => lastLogged(nights), [nights]);
  const goalY = BAR_H - Math.min(1, insights.goalMin / MAX_MIN) * BAR_H;

  const activeIso = sel && nights.some((n) => n.iso === sel && n.rec) ? sel : latest?.iso ?? null;
  const active = nights.find((n) => n.iso === activeIso) ?? null;
  const streak = insights.goalStreak;
  const bestDay = best ? weekdayShort(new Date(Number(best.iso.slice(0, 4)), Number(best.iso.slice(5, 7)) - 1, Number(best.iso.slice(8, 10))).getDay()) : "";

  return (
    <section className="sl-card slw m-rise" style={{ "--i": 1 } as React.CSSProperties}>
      <div className="sl-head-row">
        <h3 className="sl-card-title">{tr("هفت شب اخیر", "Last 7 nights")}</h3>
      </div>
      <div className="slw-grid">
        <span className="slw-goal" style={{ top: `calc(var(--slw-top) + ${goalY}px)` }} aria-hidden="true">
          <em>{tr("هدف", "Goal")} <bdi dir="ltr">{faNum(hm(insights.goalMin))}</bdi></em><i />
        </span>
        {nights.map((n, i) => {
          const [y, m, d] = n.iso.split("-").map(Number);
          const wd = weekdayShort(new Date(y, m - 1, d).getDay());
          const isToday = n.iso === todayIso;
          const h = barHeight(n.min, MAX_MIN, BAR_H, BAR_W);
          const isSel = n.iso === activeIso;
          return (
            <button
              key={n.iso}
              type="button"
              className={`slw-col${isToday ? " is-today" : ""}${n.rec ? "" : " is-empty"}${isSel ? " is-sel" : ""}`}
              onClick={() => (n.rec ? setSel(n.iso) : onPick(n.iso))}
              aria-pressed={n.rec ? isSel : undefined}
              aria-label={n.rec ? tr(`${wd}: ${hm(n.min)} خواب${n.score != null ? `، امتیاز ${n.score}` : ""}`, `${wd}: ${hm(n.min)} asleep${n.score != null ? `, score ${n.score}` : ""}`) : tr(`${wd}: ثبت نشده، برای ثبت بزن`, `${wd}: not logged, tap to log`)}
            >
              <span className="slw-val">{n.rec ? faNum(hm(n.min)) : <Plus aria-hidden />}</span>
              <span className="slw-plot" aria-hidden="true">
                {n.rec && (
                  <span
                    className={`slw-fill slw-grow${n.band ? ` slp-c-${n.band}` : ""}`}
                    style={{ height: h, ["--d" as string]: `${i * 60}ms` } as React.CSSProperties}
                  />
                )}
              </span>
              <span className="slw-day">{wd}</span>
            </button>
          );
        })}
      </div>

      {active && active.rec && (
        <div className="slw-detail" key={active.iso} aria-live="polite">
          <SleepNightDetail
            rec={active.rec}
            goalMin={insights.goalMin}
            targetBed={target?.sleep ?? null}
            title={longDate(active.iso)}
            badge={active.iso === todayIso ? tr("دیشب", "Last night") : null}
            onEdit={() => onPick(active.iso)}
          />
        </div>
      )}

      {avg === null ? (
        <p className="slw-foot is-empty">{tr("هنوز شبی این هفته ثبت نشده. یک ستون رو بزن و خوابت رو ثبت کن.", "No nights logged this week yet. Tap a column to log your sleep.")}</p>
      ) : (
        <div className="slw-stats">
          <div>
            <span>{tr("میانگین", "Average")}</span>
            <b className="slw-num"><bdi dir="ltr">{faNum(hm(avg))}</bdi><small className="slw-unit">{tr("ساعت", "h")}</small></b>
          </div>
          <div className={insights.debt7Min > 0 ? "is-debt" : "is-ok"}>
            <span>{tr("بدهی خواب", "Sleep debt")}</span>
            <b className="slw-num">{insights.debt7Min > 0 ? <><bdi dir="ltr">{faNum(hm(insights.debt7Min))}</bdi><small className="slw-unit">{tr("ساعت", "h")}</small></> : tr("ندارم", "None")}</b>
          </div>
          {streak >= 2 ? (
            <div className="is-ok">
              <span>{tr("پشت سر هم به هدف", "Goal streak")}</span>
              <b>{tr(`${faNum(streak)} شب`, `${streak} nights`)}</b>
            </div>
          ) : best ? (
            <div>
              <span>{tr("بهترین شب", "Best night")}</span>
              <b className={best.band ? `slp-c-${best.band}` : undefined}>{faNum(best.score ?? 0)}<small className="slw-best-day">{bestDay}</small></b>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
