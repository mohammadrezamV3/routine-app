"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TrendPoint } from "@/lib/weeklyAnalysis/types";
import { Spinner } from "./Spinner";
import { relativeWeekLabel } from "./WeeklyAnalysisKit";
import "./wa-shell.css";

export const MIN_OFFSET = -52; // سقف API (یک سال به عقب)

// سوییچر هفته: یک قرص فشرده (قبلی / برچسب هفته / بعدی). توی RTL فلش راست = عقب
// (قدیمی‌تر)، چپ = جلو. منطق افست/سوایپ/کیبورد در کلاینته؛ این‌جا فقط نمایش
// و دکمه‌هاست. برای هفته‌ی غیرجاری، زیرنویس «برگرد به جاری» همون دکمه‌ی بازگشته.
export function WeeklyAnalysisNav({
  offset, weekLabel, loading, onChange,
}: {
  offset: number;
  weekLabel: string | null;
  trend?: TrendPoint[];
  loading: boolean;
  onChange: (next: number) => void;
}) {
  const canPrev = offset > MIN_OFFSET;
  return (
    <div className="wa-switch" role="group" aria-label="انتخاب هفته">
      <button
        type="button"
        className="wk-ghost wa-sw-btn"
        onClick={() => canPrev && onChange(offset - 1)}
        disabled={!canPrev}
        aria-label="هفته‌ی قبل"
      >
        <ChevronRight size={19} />
      </button>

      <div className="wa-sw-center" aria-live="polite">
        <strong className="wa-sw-label">{weekLabel ?? "—"}</strong>
        {offset === 0 ? (
          <span className="wa-sw-sub is-now">{relativeWeekLabel(0)}</span>
        ) : (
          <button type="button" className="wk-ghost wa-sw-sub is-link" onClick={() => onChange(0)}>
            {relativeWeekLabel(offset)} · برگرد به جاری
          </button>
        )}
        <span className="wa-sw-spin" aria-hidden={!loading}>{loading && <Spinner size={12} label={null} />}</span>
      </div>

      <button
        type="button"
        className="wk-ghost wa-sw-btn"
        onClick={() => onChange(offset + 1)}
        disabled={offset >= 0}
        aria-label="هفته‌ی بعد"
      >
        <ChevronLeft size={19} />
      </button>
    </div>
  );
}
