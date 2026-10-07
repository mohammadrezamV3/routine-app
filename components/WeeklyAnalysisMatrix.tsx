"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ANALYSIS_DOMAIN_LABELS, type AnalysisDomain, type DayCell, type DomainResult,
} from "@/lib/weeklyAnalysis/types";
import { DOMAIN_HREFS, V_WK_CARD, weekdayLetter } from "./WeeklyAnalysisKit";
import "./wa-days.css";

// رنگ نقطه‌ی هر بخش از توکن‌های حلقه
const DOT: Record<AnalysisDomain, string> = {
  routine: "var(--ring-1a)",
  sleep: "var(--ring-2b)",
  tasks: "var(--ring-1b)",
  fitness: "var(--ring-2a)",
  nutrition: "var(--ring-3a)",
  trading: "var(--ring-3b)",
  learning: "var(--secondary)",
};

// چهار پله‌ی رنگ از روی امتیاز؛ 0 = بدون داده
function step(v: number | null): 0 | 1 | 2 | 3 | 4 {
  if (v === null) return 0;
  if (v < 40) return 1;
  if (v < 60) return 2;
  if (v < 80) return 3;
  return 4;
}

function DeltaText({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="wa-mx-delta">تازه</span>;
  const d = Math.round(delta);
  const cls = d > 0 ? "up" : d < 0 ? "down" : "";
  return <span className={`wa-mx-delta wk-num ${cls}`} dir="ltr">{d > 0 ? `+${d}` : d < 0 ? `−${Math.abs(d)}` : "0"}</span>;
}

// «نقشه‌ی هفته»: ردیف = بخش دارای داده، ستون = روز. زدن سربرگ یا خانه‌ی هر روز
// برگه‌ی همون روز رو باز می‌کنه.
export function WeeklyAnalysisMatrix({
  domains, days, onPickDay,
}: { domains: DomainResult[]; days: DayCell[]; onPickDay: (i: number) => void }) {
  const rows = domains.filter((d) => d.hasData && d.score !== null);
  const noData = domains.filter((d) => !(d.hasData && d.score !== null));
  const seen = new Set<string>();
  const links = noData.filter((d) => {
    const k = `${d.domain}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const cols = days.slice(0, 7);

  return (
    <motion.section className="wk-card wa-mx" variants={V_WK_CARD} aria-label="نقشه‌ی هفته">
      <header className="wa-mx-head">
        <h2 className="wa-h">
          نقشه‌ی هفته
          <span className="wa-h-sub">هر بخش در هر روز؛ پررنگ‌تر یعنی امتیاز بالاتر</span>
        </h2>
        <div className="wa-mx-legend" aria-hidden="true">
          <span>کم</span>
          {[1, 2, 3, 4].map((s) => <i key={s} className={`wa-mx-sw s${s}`} />)}
          <span>زیاد</span>
        </div>
      </header>

      {rows.length === 0 ? (
        <p className="wa-mx-empty">این هفته در هیچ‌کدوم از بخش‌ها چیزی ثبت نشده.</p>
      ) : (
        <div className="wa-mx-grid" data-noswipe>
          <span className="wa-mx-corner" />
          {cols.map((d, i) => (
            <button
              key={d.date}
              type="button"
              className="wk-ghost wa-mx-dh"
              disabled={d.isFuture}
              onClick={() => onPickDay(i)}
              aria-label={`جزئیات ${d.weekday}`}
              title={d.weekday}
            >{weekdayLetter(d.weekday)}</button>
          ))}
          <span className="wa-mx-wk-h">امتیاز هفته</span>

          {rows.map((r) => (
            <MatrixRow key={r.domain} r={r} cols={cols} onPickDay={onPickDay} />
          ))}
        </div>
      )}
      {rows.length > 0 && <span className="wa-mx-hint">روی هر روز بزن تا جزییاتش باز بشه</span>}

      {links.length > 0 && (
        <p className="wa-mx-nodata">
          <span>بدون داده:</span>
          {links.map((d, i) => (
            <span key={d.domain}>
              <Link href={DOMAIN_HREFS[d.domain]} prefetch={false}>{ANALYSIS_DOMAIN_LABELS[d.domain]}</Link>
              {i < links.length - 1 ? "،" : ""}
            </span>
          ))}
        </p>
      )}
    </motion.section>
  );
}

function MatrixRow({ r, cols, onPickDay }: { r: DomainResult; cols: DayCell[]; onPickDay: (i: number) => void }) {
  const label = ANALYSIS_DOMAIN_LABELS[r.domain];
  return (
    <>
      <div className="wa-mx-name">
        <i className="wa-mx-dot" style={{ ["--dc" as string]: DOT[r.domain] }} aria-hidden="true" />
        <span>{label}</span>
      </div>
      {cols.map((d, i) => {
        const raw = r.daily[i];
        const v = d.isFuture || raw === null || raw === undefined ? null : Math.round(raw);
        const s = step(v);
        if (v === null) {
          return <span key={i} className="wa-mx-cell s0" title={d.isFuture ? "هنوز نرسیده" : "بدون داده"} aria-hidden="true"><span>·</span></span>;
        }
        return (
          <button
            key={i}
            type="button"
            className={`wk-ghost wa-mx-cell s${s}`}
            onClick={() => onPickDay(i)}
            title={`${label}، ${d.weekday}: ${v}`}
            aria-label={`${label}، ${d.weekday}: ${v}`}
          ><span className="wk-num">{v}</span></button>
        );
      })}
      <div className="wa-mx-end">
        <DeltaText delta={r.delta} />
        <strong className="wa-mx-score wk-num">{Math.round(r.score as number)}</strong>
      </div>
    </>
  );
}
