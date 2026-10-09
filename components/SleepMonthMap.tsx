"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { scoreBandLabel, scoreBand, type ScoreBand, type SleepInsights } from "@/lib/sleep";
import { weekdayShort, jMonthName, faNum, jalaliToIso, toJalali } from "@/lib/jalali";
import { isEn, tr, trv } from "@/lib/i18n";
import "./sleep-charts.css";

// تقویم ماهانه‌ی امتیاز خواب: هفته از شنبه، هر روز یک خانه‌ی رنگی (رنگ = سطح
// امتیاز). فقط تا 4 ماه عقب (هاب 120 روز می‌خونه). رنگ خانه داده‌ست؛ خود
// دکمه‌ها بک‌گراند ندارن.
export type SleepMonthMapProps = {
  insights: SleepInsights;
  todayIso: string;
  onPick: (dateIso: string) => void;
};

const MAX_BACK = 4;
const weekHead = () => [6, 0, 1, 2, 3, 4, 5].map((d) => weekdayShort(d)); // ش ی د س چ پ ج
const BANDS: ScoreBand[] = ["great", "good", "fair", "poor"];

export function SleepMonthMap({ insights, todayIso, onPick }: SleepMonthMapProps) {
  const [back, setBack] = useState(0);

  const scoreOf = useMemo(() => new Map(insights.scores.map((s) => [s.date, s.score])), [insights.scores]);

  const month = useMemo(() => {
    const [ty, tm, td] = todayIso.split("-").map(Number);
    const [jy0, jm0] = toJalali(ty, tm, td);
    let jy = jy0, jm = jm0 - back;
    while (jm < 1) { jm += 12; jy -= 1; }
    const cells: ({ iso: string; day: number } | null)[] = [];
    const first = jalaliToIso(jy, jm, 1);
    if (first) {
      const [fy, fm, fd] = first.split("-").map(Number);
      const lead = (new Date(fy, fm - 1, fd).getDay() + 1) % 7; // شنبه = 0
      for (let i = 0; i < lead; i++) cells.push(null);
      for (let d = 1; d <= 31; d++) {
        const iso = d === 1 ? first : jalaliToIso(jy, jm, d);
        if (!iso) break;
        cells.push({ iso, day: d });
      }
    }
    return { jy, jm, cells };
  }, [todayIso, back]);

  const stats = useMemo(() => {
    const vals = month.cells.flatMap((c) => (c && scoreOf.has(c.iso) ? [scoreOf.get(c.iso) as number] : []));
    return { nights: vals.length, avg: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null };
  }, [month, scoreOf]);

  const avgBand = stats.avg !== null ? scoreBand(stats.avg) : null;
  let animIdx = 0;

  return (
    <section className="sl-card slm">
      <div className="sl-head-row">
        <h3 className="sl-card-title"><CalendarDays aria-hidden="true" />{tr("تقویم امتیاز خواب", "Sleep score calendar")}</h3>
        <div className="slm-nav">
          <button type="button" className="slm-arrow" aria-label={tr("ماه قبل", "Previous month")} disabled={back >= MAX_BACK} onClick={() => setBack((b) => Math.min(MAX_BACK, b + 1))}>
            {isEn() ? <ChevronLeft aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
          </button>
          <span className="slm-title">{jMonthName(month.jm - 1)} {faNum(month.jy)}</span>
          <button type="button" className="slm-arrow" aria-label={tr("ماه بعد", "Next month")} disabled={back <= 0} onClick={() => setBack((b) => Math.max(0, b - 1))}>
            {isEn() ? <ChevronRight aria-hidden="true" /> : <ChevronLeft aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div className="slm-grid" key={`${month.jy}-${month.jm}`}>
        {weekHead().map((w) => <div key={w} className="slm-wd">{w}</div>)}
        {month.cells.map((c, i) => {
          if (!c) return <div key={"b" + i} className="slm-cell is-blank" aria-hidden="true" />;
          const future = c.iso > todayIso;
          const score = scoreOf.get(c.iso);
          const band = score !== undefined ? scoreBand(score) : null;
          const cls = `slm-cell${c.iso === todayIso ? " is-today" : ""}${future ? " is-future" : ""}${band ? " has-score" : ""}`;
          const label = `${faNum(c.day)} ${jMonthName(month.jm - 1)}${band ? tr(`، امتیاز ${faNum(score as number)} (${scoreBandLabel(band)})`, `, score ${score} (${scoreBandLabel(band)})`) : future ? "" : tr("، بدون ثبت", ", not logged")}`;
          const inner = (
            <>
              {band && <span className={`slm-fill slm-fill-${band}`} style={{ ["--d" as string]: `${(animIdx++) * 12}ms` } as React.CSSProperties} />}
              <span className="slm-num">{faNum(c.day)}</span>
            </>
          );
          if (future) return <div key={c.iso} className={cls} aria-label={label}>{inner}</div>;
          return (
            <button key={c.iso} type="button" className={cls} aria-label={label} onClick={() => onPick(c.iso)}>
              {inner}
            </button>
          );
        })}
      </div>

      <div className="slm-foot">
        <div className="slm-legend" aria-hidden="true">
          {BANDS.map((b) => (
            <span key={b}><i className={`slm-fill-${b}`} />{scoreBandLabel(b)}</span>
          ))}
        </div>
        <div className="slm-sum">
          {stats.avg !== null && avgBand ? (
            trv(
              <>میانگین <b className={`slp-c-${avgBand}`}>{faNum(stats.avg)}</b> در <b>{faNum(stats.nights)}</b> شب ثبت‌شده</>,
              <>Average <b className={`slp-c-${avgBand}`}>{stats.avg}</b> over <b>{stats.nights}</b> {stats.nights === 1 ? "night" : "nights"} logged</>,
            )
          ) : (
            tr("در این ماه شبی ثبت نشده", "No nights logged this month")
          )}
        </div>
      </div>
    </section>
  );
}
