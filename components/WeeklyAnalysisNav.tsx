"use client";

import { ChevronLeft, ChevronRight, CornerDownLeft } from "lucide-react";
import type { TrendPoint } from "@/lib/weeklyAnalysis/types";
import { Spinner } from "./Spinner";
import { MeterColumn } from "./WeeklyMeter";
import { jalaliShort, relativeWeekLabel, useMounted } from "./WeeklyAnalysisKit";

export const MIN_OFFSET = -52; // سقف API (یک سال به عقب)

// ناوبر هفته — چسبیده زیر هدر. توی RTL فلش راست = عقب (قدیمی‌تر)، چپ = جلو.
// نوار هشت‌هفته‌ی زیرش از ترند همین پاسخ ساخته می‌شه (قدیمی‌ترین سمت راست،
// عین جهت خواندن)؛ زدن هر ستون مستقیم همون هفته رو باز می‌کنه.
export function WeeklyAnalysisNav({
  offset, weekLabel, trend, loading, onChange,
}: {
  offset: number;
  weekLabel: string | null;
  trend: TrendPoint[];
  loading: boolean;
  onChange: (next: number) => void;
}) {
  const ready = useMounted();
  const n = trend.length;
  const canPrev = offset > MIN_OFFSET;

  return (
    <div className="wk-nav">
      <div className="wk-card wk-nav-card">
        {n > 1 && (
          <div className="wk-strip" role="group" aria-label="امتیاز هشت هفته‌ی اخیر">
            {trend.map((t, i) => {
              const off = offset - (n - 1 - i);
              const sel = i === n - 1;
              const disabled = off < MIN_OFFSET || off > 0;
              return (
                <button
                  key={t.weekStart}
                  type="button"
                  className={`wk-ghost wk-strip-col${sel ? " is-sel" : ""}`}
                  disabled={disabled || sel}
                  onClick={() => onChange(off)}
                  aria-label={`هفته‌ی ${jalaliShort(t.weekStart)}: ${t.score === null ? "بدون داده" : Math.round(t.score)}`}
                  aria-current={sel ? "true" : undefined}
                  title={`${jalaliShort(t.weekStart)} · ${t.score === null ? "بدون داده" : Math.round(t.score)}`}
                >
                  <span className="wk-strip-bar">
                    <MeterColumn size="xs" value={t.score} on={ready} delay={(n - 1 - i) * 40} highlight={sel} />
                  </span>
                  <span className="wk-strip-dot" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        )}
        <div className="wk-nav-row">
          <button
            type="button"
            className="wk-ghost wk-nav-btn"
            onClick={() => canPrev && onChange(offset - 1)}
            disabled={!canPrev}
            aria-label="هفته‌ی قبل"
          >
            <ChevronRight size={19} />
          </button>

          <div className="wk-nav-center" aria-live="polite">
            <div className="wk-nav-title">
              <span>{relativeWeekLabel(offset)}</span>
              {offset === 0 ? (
                <span className="wk-chip is-accent">جاری</span>
              ) : (
                <button type="button" className="wk-ghost wk-chip is-link" onClick={() => onChange(0)}>
                  <CornerDownLeft size={11} />برگرد به جاری
                </button>
              )}
              <span className="wk-nav-spin" aria-hidden={!loading}>{loading && <Spinner size={13} label={null} />}</span>
            </div>
            <div className="wk-nav-sub">{weekLabel ?? "—"}</div>
          </div>

          <button
            type="button"
            className="wk-ghost wk-nav-btn"
            onClick={() => onChange(offset + 1)}
            disabled={offset >= 0}
            aria-label="هفته‌ی بعد"
          >
            <ChevronLeft size={19} />
          </button>
        </div>

      </div>
    </div>
  );
}
