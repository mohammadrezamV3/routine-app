"use client";

import "./sleep-dial.css";
import "./sleep-charts.css";
import { useId, useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { weekdayName, weekdayShort, jMonthName, faNum, toJalali } from "@/lib/jalali";
import { tr } from "@/lib/i18n";
import { clockOf, scoreBandLabel, type SleepInsights, type SleepRecord } from "@/lib/sleep";
import { barHeight, bestNight, buildWeekNights, goalDiffKind, lastLogged, signedDuration, weekAverage } from "@/lib/sleepWeekStats";

// هفت شب آخر به‌صورت هفت ستون ساده: ارتفاع ستون = مدت خواب (سقف 10 ساعت)،
// رنگ = امتیاز، خط‌چین = هدف. زدن ستون یک شب ثبت‌شده، جزئیاتش رو همون‌جا
// نشون می‌ده (با دکمه‌ی ویرایش)؛ زدن شب خالی مستقیم ثبت رو باز می‌کنه.
// ستون‌ها SVG‌ان (fill، نه بک‌گراند CSS). تاریخچه‌ی بلندتر در آنالیز هفتگیه.

const MAX_MIN = 10 * 60;
const BAR_H = 124;
const BAR_W = 18;

function hm(min: number): string {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}

const BANDS = ["great", "good", "fair", "poor"] as const;

function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const [, jm, jd] = toJalali(y, m, d);
  return `${weekdayName(new Date(y, m - 1, d).getDay())} ${faNum(jd)} ${jMonthName(jm - 1)}`;
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
  const uid = useId().replace(/:/g, "");
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
        <span className="slw-legend" aria-hidden="true"><i className="slp-c-poor" /><i className="slp-c-fair" /><i className="slp-c-good" /><i className="slp-c-great" /></span>
      </div>
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
              <svg className="slw-bar" width={BAR_W} height={BAR_H} viewBox={`0 0 ${BAR_W} ${BAR_H}`} aria-hidden="true">
                <rect x={0} y={0} width={BAR_W} height={BAR_H} rx={BAR_W / 2} className="slw-slot" />
                {isToday && <rect x={BAR_W / 2 - 6} y={-5} width={12} height={3} rx={1.5} className="slw-cap" />}
                {n.rec && (
                  <rect
                    x={0}
                    y={BAR_H - h}
                    width={BAR_W}
                    height={h}
                    rx={BAR_W / 2}
                    className={`slw-fill slw-grow${n.band ? ` slp-c-${n.band}` : ""}`}
                    style={{ fill: `url(#slwg-${n.band ?? "good"}-${uid})`, ["--d" as string]: `${i * 50}ms` } as React.CSSProperties}
                  />
                )}
                {n.rec && h > 22 && (
                  <rect x={4} y={BAR_H - h + 5} width={3} height={Math.min(h - 18, 26)} rx={1.5} className="slw-gloss" />
                )}
              </svg>
              <span className="slw-day">{wd}</span>
            </button>
          );
        })}
      </div>

      {active && active.rec && (
        <div className="slw-detail" key={active.iso} aria-live="polite">
          <div className="slw-d-head">
            <div className="slw-d-title">
              <b>{longDate(active.iso)}{active.iso === todayIso ? <em>{tr("دیشب", "Last night")}</em> : null}</b>
              <bdi dir="ltr" className="slw-d-times">{faNum(clockOf(active.rec.sleptAt))} <span aria-hidden="true">{"→"}</span> {faNum(clockOf(active.rec.wokeAt))}</bdi>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onPick(active.iso)}>
              <Pencil aria-hidden="true" width={15} height={15} />{tr("ویرایش", "Edit")}
            </button>
          </div>
          <div className="slw-d-stats">
            <div><span>{tr("مدت", "Duration")}</span><b className="slw-num"><bdi dir="ltr">{faNum(hm(active.min))}</bdi><small className="slw-unit">{tr("ساعت", "h")}</small></b></div>
            <div>
              <span>{tr("امتیاز", "Score")}</span>
              <b className={active.band ? `slp-c-${active.band}` : undefined}>{active.score != null ? <>{faNum(active.score)}{active.band ? <small> {scoreBandLabel(active.band)}</small> : null}</> : "-"}</b>
            </div>
            <div>
              <span>{tr("نسبت به هدف", "Vs goal")}</span>
              {active.diffGoal != null ? (
                <b dir="ltr" className={`slw-diff is-${goalDiffKind(active.diffGoal)}`}>{faNum(signedDuration(active.diffGoal))}</b>
              ) : <b>-</b>}
            </div>
          </div>
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
