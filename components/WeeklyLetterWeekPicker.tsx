"use client";

// انتخاب هفته: قرص جمع‌وجور با قبلی/بعدی (تا 52 هفته‌ی قبل) و میان‌بر «این هفته».
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { LetterCtx } from "./WeeklyLetterCtx";
import "./weekly-letter.css";

const MAX_BACK = 52; // سقف API

function shiftWeek(iso: string, weeks: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + weeks * 7));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}

export function WeeklyLetterWeekPicker({ ctx, onPick }: { ctx: LetterCtx; onPick: (weekStart: string) => void }) {
  // شنبه‌ی هفته‌ی جاری از روی افست (همون منطق زمانی سرور)
  const currentStart = shiftWeek(ctx.weekStart, -ctx.offset);
  const canPrev = ctx.offset > -MAX_BACK;
  const canNext = ctx.offset < 0;
  return (
    <div className="wl-live-picker" role="group" aria-label="انتخاب هفته">
      <button
        type="button"
        className="wl-live-ghost wl-live-pick-btn"
        onClick={() => canPrev && onPick(shiftWeek(ctx.weekStart, -1))}
        disabled={!canPrev}
        aria-label="هفته‌ی قبل"
      >
        <ChevronRight size={20} />
      </button>
      <div className="wl-live-pick-mid" aria-live="polite">
        <strong>هفته‌ی {ctx.analysis.weekLabel}</strong>
        {ctx.isCurrent ? (
          <span className="wl-live-pick-now">این هفته</span>
        ) : (
          <button type="button" className="wl-live-ghost wl-live-pick-link" onClick={() => onPick(currentStart)}>
            برو به این هفته
          </button>
        )}
      </div>
      <button
        type="button"
        className="wl-live-ghost wl-live-pick-btn"
        onClick={() => canNext && onPick(shiftWeek(ctx.weekStart, 1))}
        disabled={!canNext}
        aria-label="هفته‌ی بعد"
      >
        <ChevronLeft size={20} />
      </button>
    </div>
  );
}
