"use client";

// فصل «نقشه‌ی هفته»: ردیف = بخش دارای داده، ستون = روز؛ رنگ خانه از امتیاز.
// زدن هر روز به کارت همون روز در فصل روز به روز می‌پره.
import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { ANALYSIS_DOMAIN_LABELS, type DomainResult } from "@/lib/weeklyAnalysis/types";
import type { LetterChapterProps } from "./WeeklyLetterCtx";
import { DOMAIN_HREFS, DOMAIN_ICONS, Reveal } from "./WeeklyLetterShared";
import { CAL_WEEK_ORDER, weekdayShort } from "@/lib/jalali";
import { tr } from "@/lib/i18n";
import { WeeklyLetterChapterHead } from "./WeeklyLetterChapterHead";

const dayLetters = () => CAL_WEEK_ORDER.map(weekdayShort);

function step(v: number | null): 0 | 1 | 2 | 3 | 4 {
  if (v === null) return 0;
  if (v < 40) return 1;
  if (v < 60) return 2;
  if (v < 80) return 3;
  return 4;
}

function jump(i: number) {
  const el = document.getElementById(`wl-day-${i}`);
  if (!el) return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
}

export function WeeklyLetterMatrix({ ctx, no }: LetterChapterProps & { no?: number }) {
  const { domains, days } = ctx.analysis;
  const rows = domains.filter((d: DomainResult) => d.hasData && d.score !== null);
  if (rows.length === 0) return null;
  const noData = domains.filter((d) => !(d.hasData && d.score !== null));
  const cols = days.slice(0, 7);
  const LETTERS = dayLetters();

  return (
    <section id="matrix" className="wl-ch">
      <WeeklyLetterChapterHead icon={LayoutGrid} title={tr("نقشه‌ی هفته", "Week map")} no={no} />
      <Reveal className="wl-card wl-dp-mx">
        <div className="wl-dp-mx-grid" role="table" aria-label={tr("امتیاز هر بخش در هر روز", "Score of each area on each day")}>
          <span className="wl-dp-mx-corner" />
          {cols.map((d, i) => (
            <button
              key={d.date}
              type="button"
              className="wl-dp-mx-dh"
              disabled={d.isFuture}
              onClick={() => jump(i)}
              aria-label={tr(`جزئیات ${d.weekday}`, `Details for ${d.weekday}`)}
            >{LETTERS[i]}</button>
          ))}

          {rows.map((r) => {
            const Icon = DOMAIN_ICONS[r.domain];
            const label = ANALYSIS_DOMAIN_LABELS[r.domain];
            return (
              <div key={r.domain} className="wl-dp-mx-row" role="row">
                <span className="wl-dp-mx-name"><Icon size={14} /><span>{label}</span></span>
                {cols.map((d, i) => {
                  const raw = r.daily[i];
                  const v = d.isFuture || raw === null || raw === undefined ? null : Math.round(raw);
                  if (v === null) {
                    return <span key={i} className="wl-dp-mx-cell s0" title={d.isFuture ? tr("هنوز نرسیده", "Not yet") : tr("بدون داده", "No data")} aria-hidden="true">·</span>;
                  }
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`wl-dp-mx-cell s${step(v)}`}
                      onClick={() => jump(i)}
                      aria-label={`${label}${tr("، ", ", ")}${d.weekday}: ${v}`}
                      title={`${label}${tr("، ", ", ")}${d.weekday}: ${v}`}
                    ><span>{v}</span></button>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className="wl-dp-mx-foot">
          <span className="wl-dp-mx-legend" aria-hidden="true">
            {tr("کم", "Less")}{[1, 2, 3, 4].map((s) => <i key={s} className={`s${s}`} />)}{tr("زیاد", "More")}
          </span>
          {noData.length > 0 && (
            <span className="wl-dp-mx-nodata">
              {tr("بدون داده:", "No data:")}{" "}
              {noData.map((d, i) => (
                <span key={d.domain}>
                  <Link href={DOMAIN_HREFS[d.domain]} prefetch={false}>{ANALYSIS_DOMAIN_LABELS[d.domain]}</Link>
                  {i < noData.length - 1 ? tr("، ", ", ") : ""}
                </span>
              ))}
            </span>
          )}
        </div>
      </Reveal>
    </section>
  );
}
