"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Grid3x3 } from "lucide-react";
import { ANALYSIS_DOMAIN_LABELS, type DayCell, type DomainResult } from "@/lib/weeklyAnalysis/types";
import { SectionHead, V_WK_CARD, jalaliShort, useSeen, weekdayLetter } from "./WeeklyAnalysisKit";

type Row = { key: string; label: string; values: (number | null)[]; total?: boolean; color: string };

// نقشه‌ی حرارتی 7 روز × دامنه (شنبه سمت راست). شدت رنگ هر خانه = امتیاز،
// با رنگ خود دامنه. خانه‌ی بدون داده فقط قاب خط‌چینه (نه رنگ صفر)، روز آینده
// کم‌رنگ و ستون امروز قاب دارد. ورود: موج مورب (تاخیر هر خانه از ردیف+ستون)
// فقط با opacity/transform. زدن عنوان ستون = برگه‌ی جزئیات همون روز.
export function WeeklyAnalysisHeatmap({
  domains, days, onPickDay,
}: { domains: DomainResult[]; days: DayCell[]; onPickDay: (i: number) => void }) {
  const [sel, setSel] = useState<{ row: number; col: number } | null>(null);
  const [seenRef, ready] = useSeen<HTMLDivElement>();
  // بعد از پایان موج ورود، تاخیر هر خانه صفر می‌شه تا هاور/خاموش‌شدن فوری باشه
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setDone(true), 1800);
    return () => clearTimeout(t);
  }, [ready]);

  const rows: Row[] = [
    ...domains.map((d) => ({ key: d.domain, label: ANALYSIS_DOMAIN_LABELS[d.domain], values: d.daily, color: `var(--wk-d-${d.domain}-a)` })),
    { key: "overall", label: "کل روز", values: days.map((d) => d.score), total: true, color: "var(--accent)" },
  ];

  const selRow = sel ? rows[sel.row] : null;
  const selDay = sel ? days[sel.col] : null;
  const selVal = sel && selRow ? selRow.values[sel.col] : null;

  return (
    <motion.section className="wk-card wk-heat-card" variants={V_WK_CARD} aria-label="نقشه‌ی حرارتی هفته">
      <SectionHead icon={<Grid3x3 size={15} />} title="نقشه‌ی حرارتی" />

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
        className={`wk-heat${ready ? " is-on" : ""}${done ? " is-done" : ""}${sel ? " has-sel" : ""}`}
        role="grid"
        aria-label="امتیاز هر بخش در هر روز"
        onPointerLeave={(e) => { if (e.pointerType === "mouse") setSel(null); }}
      >
        <div className="wk-heat-row is-head" role="row">
          <span className="wk-heat-label" />
          {days.map((d, ci) => (
            <button
              key={d.date}
              type="button"
              role="columnheader"
              className={`wk-ghost wk-heat-day${d.isToday ? " is-today" : ""}${sel?.col === ci ? " is-hl" : ""}`}
              onClick={() => onPickDay(ci)}
              aria-label={`جزئیات ${d.weekday}`}
            >
              {weekdayLetter(d.weekday)}
            </button>
          ))}
        </div>
        {rows.map((r, ri) => (
          <div key={r.key} className={`wk-heat-row${r.total ? " is-total" : ""}${sel?.row === ri ? " is-hl" : ""}`} role="row">
            <span className="wk-heat-label" role="rowheader">{r.label}</span>
            {r.values.map((v, ci) => {
              const day = days[ci];
              const future = !!day?.isFuture;
              const active = sel?.row === ri && sel?.col === ci;
              const pct = v === null ? 0 : Math.round(14 + (Math.min(100, Math.max(0, v)) / 100) * 78);
              return (
                <button
                  key={ci}
                  type="button"
                  role="gridcell"
                  className={`wk-ghost wk-heat-cell${v === null ? " is-empty" : ""}${future ? " is-future" : ""}${day?.isToday ? " is-today" : ""}${active ? " is-active" : ""}${!active && sel && (sel.row === ri || sel.col === ci) ? " is-rc" : ""}`}
                  style={{
                    ["--hc" as string]: v === null ? "transparent" : `color-mix(in srgb, ${r.color} ${pct}%, transparent)`,
                    ["--hd" as string]: `${120 + (ri + ci) * 55}ms`,
                  }}
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
          <i key={s} style={{ background: `color-mix(in srgb, var(--accent) ${Math.round(14 + (s / 100) * 78)}%, transparent)` }} />
        ))}
        <span>زیاد</span>
        <i className="is-empty" />
        <span>بدون داده</span>
      </div>
    </motion.section>
  );
}
