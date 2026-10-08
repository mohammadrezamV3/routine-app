"use client";

// پیش‌بینی پایان هفته (فقط هفته‌ی جاری): امتیاز، بازه و پیام کوتاه.
import { TrendingUp } from "lucide-react";
import { LazyRing, Reveal } from "./WeeklyLetterShared";
import type { LetterChapterProps } from "./WeeklyLetterCtx";
import "./weekly-letter.css";

export function WeeklyLetterPrediction({ ctx }: LetterChapterProps) {
  const p = ctx.analysis.prediction;
  if (!ctx.isCurrent || !p) return null;
  const lo = Math.max(0, Math.min(100, p.low));
  const hi = Math.max(lo, Math.min(100, p.high));
  const at = Math.max(0, Math.min(100, p.projectedScore));
  return (
    <Reveal className="wl-card wl-live-pred">
      <LazyRing value={at / 100} size={64} stroke={7} className="wl-live-pred-ring">
        <b className="wl-live-pred-num">{Math.round(at)}</b>
      </LazyRing>
      <div className="wl-live-pred-body">
        <span className="wl-live-pred-k"><TrendingUp size={13} />پیش‌بینی پایان هفته</span>
        <p>{p.message}</p>
        <div className="wl-live-pred-range" dir="ltr" role="img" aria-label={`بازه‌ی محتمل ${Math.round(lo)} تا ${Math.round(hi)}`}>
          <span className="wl-live-pred-band" style={{ left: `${lo}%`, width: `${Math.max(2, hi - lo)}%` }} />
          <span className="wl-live-pred-dot" style={{ left: `${at}%` }} />
        </div>
        <span className="wl-live-pred-cap">بازه‌ی محتمل <b>{Math.round(lo)}</b> تا <b>{Math.round(hi)}</b></span>
      </div>
    </Reveal>
  );
}
