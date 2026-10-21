"use client";

import "./sleep-log.css";
import { TimeInput } from "./TimeInput";
import { tr } from "@/lib/i18n";
import { NUDGE_MIN, shiftClock } from "@/lib/sleepSheetHelpers";

// ورودی ساعت درشت مشترک پنجره‌های خواب: برچسب، فیلد استاندارد سایت و دو دکمه‌ی
// کم/زیاد 15 دقیقه. دکمه‌ها از سیستم .btn هستن؛ ساعت ناقص هم با دکمه درست می‌شه.
export function SleepTimeField({
  label, value, onChange, hint, fallback = "00:00",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string | null;
  /** اگه فیلد خالی/ناقص بود، دکمه‌ها از این ساعت شروع می‌کنن */
  fallback?: string;
}) {
  const nudge = (d: number) => onChange(shiftClock(/^\d{1,2}:\d{2}$/.test(value) ? value : fallback, d));
  return (
    <div className="stf">
      <div className="stf-label">
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </div>
      <div className="stf-row" dir="ltr">
        <button type="button" className="btn btn-outline btn-sm stf-nudge" onClick={() => nudge(-NUDGE_MIN)} aria-label={tr(`${NUDGE_MIN} دقیقه زودتر`, `${NUDGE_MIN} minutes earlier`)}>
          <bdi dir="ltr">−{NUDGE_MIN}</bdi>
        </button>
        <label className="stf-in">
          <span className="stf-sr">{label}</span>
          <TimeInput value={value} onChange={onChange} className="wsearch-newform-name stf-input" />
        </label>
        <button type="button" className="btn btn-outline btn-sm stf-nudge" onClick={() => nudge(NUDGE_MIN)} aria-label={tr(`${NUDGE_MIN} دقیقه دیرتر`, `${NUDGE_MIN} minutes later`)}>
          <bdi dir="ltr">+{NUDGE_MIN}</bdi>
        </button>
      </div>
    </div>
  );
}
