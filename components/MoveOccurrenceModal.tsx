"use client";

import { useRef, useState } from "react";
import { WEEK_ORDER } from "@/lib/schedule";
import { normalizeTimeToFa } from "@/lib/timeUtils";
import { timeStartMinutes } from "@/lib/schedule";
import { findScheduleConflict } from "@/lib/conflict";
import { showConflictAlert } from "@/lib/conflictAlertBus";
import { TimeInput } from "./TimeInput";
import { CustomOccurrence, Importance, setCustomOccurrences, setRemovedOccurrences } from "@/lib/storage";
import { LiquidBlobLayers } from "./LiquidBlobBox";
import { focusNextOnEnter } from "@/lib/formNav";

type Occ = { dayName: string; jsDay: number; time: string; id: string; custom?: boolean; importance?: Importance; tag?: string };
type ScheduleOpts = { removedOccurrences: Set<string>; customOccurrences: CustomOccurrence[] };

const now = new Date();

// پاپ‌آپِ «انتقال به یک روز دیگر» — از منویِ سه‌نقطه‌ی یک برنامه باز می‌شه.
// دیزاینش دقیقاً مثلِ افزودن/ویرایشِ برنامه‌ست (همون بک‌گراندِ لیکوئید گلسِ
// بلورشده با توپ‌های ثابت). فقط روزِ مقصد رو می‌گیره؛ تغییرِ ساعت اختیاریه
// (با یه تیک روشن/خاموش می‌شه، وگرنه همون ساعتِ قبلی برای روزِ جدید می‌مونه).
export function MoveOccurrenceModal({
  name,
  occ,
  scheduleOpts,
  onClose,
  onChanged,
}: {
  name: string;
  occ: Occ;
  scheduleOpts: ScheduleOpts;
  onClose: () => void;
  onChanged: () => void;
}) {
  const parts = String(occ.time).split(/[–—-]/);
  const [targetJsDay, setTargetJsDay] = useState(occ.jsDay);
  const [changeTime, setChangeTime] = useState(false);
  const [start, setStart] = useState((parts[0] || "").trim());
  const [end, setEnd] = useState((parts[1] || "").trim());
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errors, setErrors] = useState<{ start?: boolean; end?: boolean }>({});
  const formRef = useRef<HTMLDivElement>(null);

  async function submit() {
    if (status !== "idle") return;
    if (changeTime) {
      const nextErrors: typeof errors = {};
      if (!start.trim()) nextErrors.start = true;
      if (!end.trim()) nextErrors.end = true;
      setErrors(nextErrors);
      if (nextErrors.start || nextErrors.end) return;
    }

    const startFa = normalizeTimeToFa(start);
    const endFa = normalizeTimeToFa(end);
    const startMin = timeStartMinutes(startFa);
    const endMin = timeStartMinutes(endFa);

    const conflict = findScheduleConflict(targetJsDay, startMin, endMin, now, scheduleOpts, occ.id);

    setStatus("loading");
    setTimeout(async () => {
      if (conflict) {
        setStatus("error");
        showConflictAlert(`تداخل زمانی با «${conflict.name}» — منتقل نشد`);
        setTimeout(() => setStatus("idle"), 900);
        return;
      }

      setStatus("success");
      if (navigator.vibrate) navigator.vibrate(15);

      let nextRemoved = scheduleOpts.removedOccurrences;
      let nextCustom = scheduleOpts.customOccurrences;
      if (occ.custom) {
        nextCustom = scheduleOpts.customOccurrences.filter((c) => c.id !== occ.id);
      } else {
        nextRemoved = new Set(scheduleOpts.removedOccurrences);
        nextRemoved.add(occ.id + "|" + occ.jsDay);
      }

      const newOcc: CustomOccurrence = {
        id: "custom-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        name,
        jsDay: targetJsDay,
        time: endFa ? `${startFa} – ${endFa}` : startFa,
        ...(occ.importance ? { importance: occ.importance } : {}),
        ...(occ.tag ? { tag: occ.tag } : {}),
      };
      nextCustom = [...nextCustom, newOcc];

      await setCustomOccurrences(nextCustom);
      await setRemovedOccurrences(Array.from(nextRemoved));

      setTimeout(() => { onChanged(); onClose(); }, 480);
    }, 550);
  }

  return (
    <>
      <div className="wsearch-newform-overlay strong-blur open" onClick={onClose} />
      <div className="wsearch-newform liquid-glass-form dash-scope open">
        <LiquidBlobLayers static />
        <div className="relative z-[1] add-program-glass" ref={formRef} onKeyDown={(e) => focusNextOnEnter(e, formRef)}>
          <div className="wsearch-newform-head">
            <div className="wsearch-newform-title accent">انتقال «{name}» به یک روز دیگر</div>
            <button className="nav-close" onClick={onClose} aria-label="بستن">×</button>
          </div>

          <label>روز مقصد</label>
          <div className="day-picker">
            {WEEK_ORDER.map((o) => (
              <span
                key={o.jsDay}
                className={`day-pill${o.jsDay === targetJsDay ? " on" : ""}`}
                onClick={() => setTargetJsDay(o.jsDay)}
              >
                {o.short}
              </span>
            ))}
          </div>

          <div className="task" onClick={() => setChangeTime((v) => !v)}>
            <div className={`check${changeTime ? " on" : ""}`}>
              <svg className="c-check" viewBox="0 0 24 24" fill="none">
                <path d="M2.5 13l5.5 5.5L21.5 4.5" stroke="var(--bg)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="task-name">ساعتش هم تغییر کنه</div>
          </div>

          {changeTime && (
            <div className="wsearch-newrow">
              <div className={`time-field${errors.start ? " field-error" : ""}`}>
                <span className="time-field-label">ساعت شروع</span>
                <div className="field-error-wrap">
                  <TimeInput value={start} onChange={(v) => { setStart(v); if (v.trim()) setErrors((e) => ({ ...e, start: false })); }} />
                </div>
              </div>
              <div className={`time-field${errors.end ? " field-error" : ""}`}>
                <span className="time-field-label">ساعت پایان</span>
                <div className="field-error-wrap">
                  <TimeInput value={end} onChange={(v) => { setEnd(v); if (v.trim()) setErrors((e) => ({ ...e, end: false })); }} />
                </div>
              </div>
            </div>
          )}

          <div className="wsearch-newform-actions">
            <button
              type="button"
              className={`wsearch-newform-submit${status !== "idle" ? " " + status : ""}`}
              onClick={submit}
              aria-label="انتقال"
            >
              <span className="wns-spinner" />
              <svg className="wns-check" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <svg className="wns-x" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
