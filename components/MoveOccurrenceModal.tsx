"use client";

import { useRef, useState } from "react";
import { normalizeTimeToFa } from "@/lib/timeUtils";
import { timeStartMinutes } from "@/lib/schedule";
import { findScheduleConflict } from "@/lib/conflict";
import { showConflictAlert } from "@/lib/conflictAlertBus";
import { TimeInput } from "./TimeInput";
import { JalaliDatePicker } from "./JalaliDatePicker";
import { formatJalali, isoLocal, jalaliToGregorianApprox, toJalali, JalaliDate } from "@/lib/jalali";
import { CustomOccurrence, Importance, setCustomOccurrences, setRemovedOccurrences } from "@/lib/storage";
import { focusNextOnEnter } from "@/lib/formNav";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";

type Occ = { dayName: string; jsDay: number; time: string; id: string; custom?: boolean; importance?: Importance; tag?: string };
type ScheduleOpts = { removedOccurrences: Set<string>; customOccurrences: CustomOccurrence[] };

const now = new Date();
const jNow = toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());

// پاپ‌آپ «انتقال به یک روز دیگر» — از منوی سه‌نقطه‌ی یک برنامه باز می‌شه.
// دیزاینش دقیقا مثل افزودن/ویرایش برنامه‌ست. روز مقصد با یک تقویم واقعی
// انتخاب می‌شه؛ فقط روزهایی که واقعا از تقویم گذشتن غیرفعالن (نه کل یه
// روز هفته برای همیشه — چون برنامه‌ها تکرارشونده‌ان، هفته‌ی بعد هر روزی
// می‌تونه مقصد معتبر باشه). ساعت شروع/پایان همیشه توی پاپ‌آپن، پیش‌فرض
// همون ساعت فعلی برنامه، ولی کاربر می‌تونه آزادانه تغییرشون بده.
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
  useLockBodyScroll();
  const parts = String(occ.time).split(/[–—-]/);
  const [targetJalali, setTargetJalali] = useState<JalaliDate | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dayError, setDayError] = useState(false);
  const [start, setStart] = useState((parts[0] || "").trim());
  const [end, setEnd] = useState((parts[1] || "").trim());
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errors, setErrors] = useState<{ start?: boolean; end?: boolean }>({});
  const formRef = useRef<HTMLDivElement>(null);

  async function submit() {
    if (status !== "idle") return;
    const dErr = !targetJalali;
    setDayError(dErr);
    const nextErrors: typeof errors = {};
    if (!start.trim()) nextErrors.start = true;
    if (!end.trim()) nextErrors.end = true;
    setErrors(nextErrors);
    if (dErr || nextErrors.start || nextErrors.end) return;

    const targetJsDay = jalaliToGregorianApprox(targetJalali![0], targetJalali![1], targetJalali![2]).getDay();
    const startFa = normalizeTimeToFa(start);
    const endFa = normalizeTimeToFa(end);
    const startMin = timeStartMinutes(startFa);
    const endMin = timeStartMinutes(endFa);

    let pastMsg: string | null = null;
    const isPickedToday = targetJalali![0] === jNow[0] && targetJalali![1] === jNow[1] && targetJalali![2] === jNow[2];
    if (isPickedToday) {
      const checkMin = endMin ?? startMin;
      const nowMin = now.getHours() * 60 + now.getMinutes();
      if (checkMin !== null && nowMin >= checkMin) {
        pastMsg = "این ساعت برای امروز گذشته — نمی‌شه منتقلش کرد";
      }
    }

    const conflict = pastMsg ? null : findScheduleConflict(targetJsDay, startMin, endMin, now, scheduleOpts, occ.id);

    setStatus("loading");
    setTimeout(async () => {
      if (pastMsg || conflict) {
        setStatus("error");
        showConflictAlert(pastMsg || `تداخل زمانی با «${conflict!.name}» — منتقل نشد`);
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
        startDate: isoLocal(now),
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
      <div className="wsearch-newform dash-scope open">
        <div className="relative z-[1] add-program-glass" ref={formRef} onKeyDown={(e) => focusNextOnEnter(e, formRef)}>
          <div className="wsearch-newform-head">
            <div className="wsearch-newform-title accent">انتقال «{name}» به یک روز دیگر</div>
            <button className="nav-close" onClick={onClose} aria-label="بستن">×</button>
          </div>

          <label>انتقال به روز:</label>
          <button
            type="button"
            className={`jdate-btn${targetJalali ? "" : " placeholder"}${dayError ? " field-error" : ""}`}
            onClick={() => setPickerOpen(true)}
          >
            {targetJalali ? formatJalali(targetJalali) : "روز / ماه / سال"}
          </button>

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

      {pickerOpen && (
        <JalaliDatePicker
          initial={targetJalali}
          title="انتقال به روز:"
          disablePast
          onClose={() => setPickerOpen(false)}
          onPick={(d) => { setTargetJalali(d); setDayError(false); setPickerOpen(false); }}
        />
      )}
    </>
  );
}
