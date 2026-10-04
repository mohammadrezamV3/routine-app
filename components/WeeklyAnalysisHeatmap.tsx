"use client";

import "./wa-viz.css";
import { useState } from "react";
import { motion } from "framer-motion";
import { ANALYSIS_DOMAIN_LABELS, type DayCell, type DomainResult } from "@/lib/weeklyAnalysis/types";
import { WK_EASE, heatPct, jalaliShort, useCalmMotion, useSeen, weekdayLetter } from "./WeeklyAnalysisKit";

type Row = { key: string; label: string; values: (number | null)[]; total?: boolean };

// نقشه‌ی حرارتی 7 روز × بخش (پنل داخل «الگوهای هفته»، شنبه سمت راست). شدت رنگ
// هر خانه = امتیاز. خانه‌ها با موج مورب (تاخیر = ردیف + ستون) pop می‌کنن و
// هاور (فقط ماوس) کمی بزرگشون می‌کنه. خانه‌ی بدون داده فقط قاب خط‌چینه. زدن
// عنوان ستون = برگه‌ی جزئیات همون روز.
export function WeeklyAnalysisHeatmap({
  domains, days, onPickDay,
}: { domains: DomainResult[]; days: DayCell[]; onPickDay: (i: number) => void }) {
  const [sel, setSel] = useState<{ row: number; col: number } | null>(null);
  const [seenRef, ready] = useSeen<HTMLDivElement>();
  const calm = useCalmMotion();

  const rows: Row[] = [
    ...domains.map((d) => ({ key: d.domain, label: ANALYSIS_DOMAIN_LABELS[d.domain], values: d.daily })),
    { key: "overall", label: "کل روز", values: days.map((d) => d.score), total: true },
  ];

  const selRow = sel ? rows[sel.row] : null;
  const selDay = sel ? days[sel.col] : null;
  const selVal = sel && selRow ? selRow.values[sel.col] : null;

  return (
    <div className="wkv-heat-wrap">
      <div className="wk-heat-readout" aria-live="polite">
        {selRow && selDay ? (
          <>
            {selDay.weekday} <span className="wk-num">{jalaliShort(selDay.date)}</span> · {selRow.label}:{" "}
            <b className="wk-num">{selVal === null ? (selDay.isFuture ? "هنوز نرسیده" : "بدون داده") : Math.round(selVal)}</b>
          </>
        ) : (
          <span className="wk-muted-sm">روی هر خانه بزن تا امتیازش رو ببینی</span>
        )}
      </div>

      <div
        ref={seenRef}
        className="wkv-heat"
        role="grid"
        aria-label="امتیاز هر بخش در هر روز"
        onPointerLeave={(e) => { if (e.pointerType === "mouse") setSel(null); }}
      >
        <div className="wkv-heat-row is-head" role="row">
          <span className="wkv-heat-label" />
          {days.map((d, ci) => (
            <button
              key={d.date}
              type="button"
              role="columnheader"
              className={`wk-ghost wkv-heat-day${d.isToday ? " is-today" : ""}${sel?.col === ci ? " is-hl" : ""}`}
              onClick={() => onPickDay(ci)}
              aria-label={`جزئیات ${d.weekday}`}
            >
              {weekdayLetter(d.weekday)}
            </button>
          ))}
        </div>
        {rows.map((r, ri) => (
          <div key={r.key} className={`wkv-heat-row${r.total ? " is-total" : ""}${sel?.row === ri ? " is-hl" : ""}`} role="row">
            <span className="wkv-heat-label" role="rowheader">{r.label}</span>
            {r.values.map((v, ci) => {
              const day = days[ci];
              const future = !!day?.isFuture;
              const active = sel?.row === ri && sel?.col === ci;
              const pct = v === null ? 0 : heatPct(v);
              const dim = !!sel && !active && sel.row !== ri && sel.col !== ci;
              return (
                <motion.button
                  key={ci}
                  type="button"
                  role="gridcell"
                  className={`wk-ghost wkv-heat-cell${v === null ? " is-empty" : ""}${future ? " is-future" : ""}${day?.isToday ? " is-today" : ""}${active ? " is-active" : ""}${dim ? " is-dim" : ""}`}
                  style={{ ["--hc" as string]: v === null ? "transparent" : `color-mix(in srgb, var(--ring-1a) ${pct}%, transparent)` }}
                  initial={calm ? false : { opacity: 0, scale: 0.35 }}
                  animate={calm || ready ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.35 }}
                  transition={{ duration: 0.45, delay: calm ? 0 : 0.08 + (ri + ci) * 0.045, ease: WK_EASE }}
                  whileHover={calm ? undefined : { scale: 1.14, transition: { duration: 0.15, delay: 0 } }}
                  onClick={() => setSel(active ? null : { row: ri, col: ci })}
                  onPointerEnter={(e) => { if (e.pointerType === "mouse") setSel({ row: ri, col: ci }); }}
                  aria-label={`${day?.weekday ?? ""} ${r.label}: ${v === null ? "بدون داده" : Math.round(v)}`}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="wk-heat-legend" aria-hidden="true">
        <span>کم</span>
        {[10, 35, 60, 85].map((s) => (
          <i key={s} style={{ background: `color-mix(in srgb, var(--ring-1a) ${heatPct(s)}%, transparent)` }} />
        ))}
        <span>زیاد</span>
        <i className="is-empty" />
        <span>بدون داده</span>
      </div>
    </div>
  );
}
