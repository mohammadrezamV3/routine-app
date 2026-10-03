"use client";

// فصل «روزبه‌روز»: خط زمانی عمودی هفت‌روزه. هر روز: امتیاز، نشان بهترین/ضعیف‌ترین
// و تک‌تک جزئیات ثبت‌شده‌ی دامنه‌ها (DayDetails) با آیکون و متن فارسی.
import { Crown, Minus, TrendingDown } from "lucide-react";
import type { WeeklyLetterData } from "@/lib/weeklyLetter/types";
import { DOMAIN_ICONS, MeterBar, Reveal, domainClass } from "./WeeklyLetterShared";
import { BAND_COLOR, bestWorstIndex, dayRows, jalaliDayMonth, scoreBand } from "./WeeklyLetterUtils";

export function WeeklyLetterTimeline({ days, domains }: { days: WeeklyLetterData["days"]; domains: WeeklyLetterData["domains"] }) {
  const { best, worst } = bestWorstIndex(days);
  const dailyOf = (dom: string, i: number): number | null => {
    const d = domains.find((x) => x.domain === dom);
    const v = d?.daily?.[i];
    return typeof v === "number" ? v : null;
  };

  return (
    <ol className="wl-tl">
      {days.map((d, i) => {
        const rows = dayRows(d.details);
        const band = scoreBand(d.score);
        const color = BAND_COLOR[band];
        return (
          <li key={d.date || i} className={`wl-tl-item${d.isFuture ? " is-future" : ""}${d.isToday ? " is-today" : ""}${i === days.length - 1 ? " is-last" : ""}`} style={{ ["--c" as string]: color } as React.CSSProperties}>
            <span className={`wl-tl-node${i === best ? " is-best" : i === worst ? " is-worst" : ""}`} aria-hidden="true">
              {i === best && <Crown className="wl-tl-crown" size={18} />}
              {i === worst ? <TrendingDown size={13} /> : <i />}
            </span>
            <Reveal className={`wl-card wl-day${i === best ? " is-best" : ""}${i === worst ? " is-worst" : ""}`} delay={0.04}>
              <div className="wl-day-head">
                <div className="wl-day-name">
                  <b>{d.weekday}</b>
                  <span>{d.date ? jalaliDayMonth(d.date) : ""}</span>
                </div>
                <div className="wl-day-marks">
                  {i === best && <span className="wl-mark is-good"><Crown size={12} />بهترین روز</span>}
                  {i === worst && <span className="wl-mark is-bad"><TrendingDown size={12} />ضعیف‌ترین روز</span>}
                  {d.isToday && <span className="wl-mark">امروز</span>}
                  <span className="wl-pill" aria-label={d.score === null ? "بدون امتیاز" : `امتیاز ${Math.round(d.score)}`}>
                    {d.score === null ? "—" : Math.round(d.score)}
                  </span>
                </div>
              </div>
              {rows.length > 0 ? (
                <ul className="wl-day-rows">
                  {rows.map((r) => {
                    const Icon = DOMAIN_ICONS[r.domain];
                    const sc = dailyOf(r.domain, i);
                    return (
                      <li key={r.domain} className={`wl-day-row ${domainClass(r.domain)}`}>
                        <span className="wl-day-ico"><Icon size={15} /></span>
                        <span className="wl-day-txt">
                          <span className={`wl-day-main is-${r.tone ?? "neutral"}`}>{r.text}</span>
                          {r.sub && <small>{r.sub}</small>}
                          {r.ratio !== undefined && <MeterBar ratio={r.ratio} />}
                        </span>
                        {sc !== null && <span className="wl-day-sc" style={{ color: BAND_COLOR[scoreBand(sc)] }}>{Math.round(sc)}</span>}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="wl-day-empty"><Minus size={14} />{d.isFuture ? "هنوز نرسیده" : "چیزی ثبت نشد"}</p>
              )}
            </Reveal>
          </li>
        );
      })}
    </ol>
  );
}
