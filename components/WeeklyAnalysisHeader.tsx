"use client";

import { ChevronLeft, ChevronRight, CornerDownLeft } from "lucide-react";
import { Spinner } from "./Spinner";
import { WA_CARD_CLASS } from "./WeeklyAnalysisShared";

function relativeWeekLabel(offset: number): string {
  if (offset === 0) return "این هفته";
  if (offset === -1) return "هفته‌ی قبل";
  return `${Math.abs(offset)} هفته قبل`;
}

// ناوبرِ هفته — فلشِ «بعدی» روی هفته‌ی جاری غیرفعاله (آینده قابل‌تحلیل
// نیست). توی RTL فلشِ راست یعنی عقب (قدیمی‌تر)، چپ یعنی جلو.
export function WeeklyAnalysisHeader({
  offset,
  weekLabel,
  loading,
  onChange,
}: {
  offset: number;
  weekLabel: string | null;
  loading: boolean;
  onChange: (next: number) => void;
}) {
  return (
    <div className={`${WA_CARD_CLASS} wa-week-nav`}>
      <button
        type="button"
        className="wa-ghost wa-nav-btn"
        onClick={() => onChange(offset - 1)}
        aria-label="هفته‌ی قبل"
      >
        <ChevronRight size={18} />
      </button>

      <div className="wa-week-nav-center" aria-live="polite">
        <div className="wa-week-nav-title">
          <span>{relativeWeekLabel(offset)}</span>
          {offset === 0 && <span className="wa-chip-static">جاری</span>}
        </div>
        <div className="wa-week-nav-sub">
          {loading && !weekLabel ? <Spinner size={12} /> : weekLabel ?? "—"}
        </div>
        {offset < 0 && (
          <button type="button" className="wa-ghost wa-link-btn" onClick={() => onChange(0)}>
            <CornerDownLeft size={12} />
            برگشت به این هفته
          </button>
        )}
      </div>

      <button
        type="button"
        className="wa-ghost wa-nav-btn"
        onClick={() => onChange(offset + 1)}
        disabled={offset >= 0}
        aria-label="هفته‌ی بعد"
      >
        <ChevronLeft size={18} />
      </button>
    </div>
  );
}
