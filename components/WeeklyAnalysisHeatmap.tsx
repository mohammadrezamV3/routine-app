"use client";

import { useState } from "react";
import { Grid3x3 } from "lucide-react";
import { ANALYSIS_DOMAIN_LABELS, type DayCell, type DomainResult } from "@/lib/weeklyAnalysis/types";
import { cn } from "@/lib/utils";
import { DashCard } from "./DashCard";
import { jalaliShort, scoreFill, weekdayLetter } from "./WeeklyAnalysisShared";

type Row = { key: string; label: string; values: (number | null)[]; total?: boolean };

// نقشه‌ی حرارتیِ ۷ روز × دامنه‌ها — شدتِ رنگ = امتیاز (مقیاسِ شفافیتِ
// accent). خانه‌ی بدونِ داده فقط یک قابِ خط‌چینه (نه رنگِ صفر)، روزِ آینده
// کم‌رنگ، و ستونِ امروز قابِ accent داره.
export function WeeklyAnalysisHeatmap({ domains, days }: { domains: DomainResult[]; days: DayCell[] }) {
  const [sel, setSel] = useState<{ row: number; col: number } | null>(null);

  const rows: Row[] = [
    ...domains.map((d) => ({ key: d.domain, label: ANALYSIS_DOMAIN_LABELS[d.domain], values: d.daily })),
    { key: "overall", label: "کل روز", values: days.map((d) => d.score), total: true },
  ];

  const selRow = sel ? rows[sel.row] : null;
  const selDay = sel ? days[sel.col] : null;
  const selVal = sel && selRow ? selRow.values[sel.col] : null;

  return (
    <DashCard className="wa-heatmap-card">
      <div className="wa-card-head">
        <h2 className="wa-card-title"><Grid3x3 size={16} className="wa-title-icon" />نقشه‌ی حرارتی هفته</h2>
      </div>

      <div className="wa-heat-readout" aria-live="polite">
        {selRow && selDay ? (
          <>
            {selDay.weekday} <span className="mono">{jalaliShort(selDay.date)}</span> · {selRow.label}:{" "}
            <b className="mono">{selVal === null ? (selDay.isFuture ? "هنوز نرسیده" : "بدون داده") : Math.round(selVal)}</b>
          </>
        ) : (
          <span className="wa-muted-sm">روی هر خانه بزن تا امتیازش رو ببینی</span>
        )}
      </div>

      <div className="wa-heat" role="grid" aria-label="نقشه‌ی حرارتی امتیاز روزها">
        <div className="wa-heat-row head" role="row">
          <span className="wa-heat-label" />
          {days.map((d) => (
            <span key={d.date} role="columnheader" className={cn("wa-heat-day", d.isToday && "today")}>
              {weekdayLetter(d.weekday)}
            </span>
          ))}
        </div>
        {rows.map((r, ri) => (
          <div key={r.key} className={cn("wa-heat-row", r.total && "total")} role="row">
            <span className="wa-heat-label" role="rowheader">{r.label}</span>
            {r.values.map((v, ci) => {
              const day = days[ci];
              const future = !!day?.isFuture;
              const active = sel?.row === ri && sel?.col === ci;
              return (
                <button
                  key={ci}
                  type="button"
                  role="gridcell"
                  className={cn(
                    "wa-ghost wa-heat-cell",
                    v === null && "empty",
                    future && "future",
                    day?.isToday && "today",
                    active && "active"
                  )}
                  style={{ background: v === null ? "transparent" : scoreFill(v) }}
                  onClick={() => setSel(active ? null : { row: ri, col: ci })}
                  aria-label={`${day?.weekday ?? ""} ${r.label}: ${v === null ? "بدون داده" : Math.round(v)}`}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="wa-heat-legend" aria-hidden="true">
        <span>کم</span>
        {[10, 30, 50, 70, 90].map((s) => <i key={s} style={{ background: scoreFill(s) }} />)}
        <span>زیاد</span>
        <i className="empty" />
        <span>بدون داده</span>
      </div>
    </DashCard>
  );
}
