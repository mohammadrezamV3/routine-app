"use client";

import { useState } from "react";
import { WEEK_ORDER } from "@/lib/schedule";
import { normalizeTimeToFa } from "@/lib/timeUtils";
import { timeStartMinutes } from "@/lib/schedule";
import { findScheduleConflict } from "@/lib/conflict";
import { showConflictAlert } from "@/lib/conflictAlertBus";
import { TimeInput } from "./TimeInput";
import { CustomOccurrence, setCustomOccurrences, setRemovedOccurrences } from "@/lib/storage";

type Occ = { dayName: string; jsDay: number; time: string; id: string; custom?: boolean };
type ScheduleOpts = { removedOccurrences: Set<string>; customOccurrences: CustomOccurrence[] };

const now = new Date();

export function EditOccurrenceForm({
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
  const [jsDay, setJsDay] = useState(occ.jsDay);
  const [start, setStart] = useState((parts[0] || "").trim());
  const [end, setEnd] = useState((parts[1] || "").trim());
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errors, setErrors] = useState<{ start?: boolean; end?: boolean }>({});

  const dayName = WEEK_ORDER.find((o) => o.jsDay === jsDay)?.name || occ.dayName;

  async function submit() {
    if (status !== "idle") return;
    const nextErrors: typeof errors = {};
    if (!start.trim()) nextErrors.start = true;
    if (!end.trim()) nextErrors.end = true;
    setErrors(nextErrors);
    if (nextErrors.start || nextErrors.end) return;

    const startFa = normalizeTimeToFa(start);
    const endFa = normalizeTimeToFa(end);
    const startMin = timeStartMinutes(startFa);
    const endMin = timeStartMinutes(endFa);

    const conflict = findScheduleConflict(jsDay, startMin, endMin, now, scheduleOpts, occ.id);

    setStatus("loading");
    setTimeout(async () => {
      if (conflict) {
        setStatus("error");
        showConflictAlert(`تداخل زمانی با «${conflict.name}» — ذخیره نشد`);
        setTimeout(() => setStatus("idle"), 900);
        return;
      }

      setStatus("success");

      let nextRemoved = scheduleOpts.removedOccurrences;
      let nextCustom = scheduleOpts.customOccurrences;
      if (occ.custom) {
        nextCustom = scheduleOpts.customOccurrences.filter((c) => c.id !== occ.id);
      } else {
        nextRemoved = new Set(scheduleOpts.removedOccurrences);
        nextRemoved.add(occ.id + "|" + occ.jsDay);
      }
      const time = endFa ? `${startFa} – ${endFa}` : startFa;
      const newId = "custom-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      nextCustom = [...nextCustom, { id: newId, name, jsDay, time }];

      await setCustomOccurrences(nextCustom);
      await setRemovedOccurrences(Array.from(nextRemoved));

      setTimeout(() => { onChanged(); onClose(); }, 480);
    }, 550);
  }

  return (
    <>
      <div className="wsearch-newform-overlay occ-edit-overlay open" onClick={onClose} />
      <div className="wsearch-newform occ-edit-form open">
        <div className="wsearch-newform-head">
          <div className="wsearch-newform-title accent">ویرایش «{name}» — {dayName}</div>
          <button className="nav-close" onClick={onClose} aria-label="بستن">×</button>
        </div>

        <label>روز</label>
        <div className="day-picker">
          {WEEK_ORDER.map((o) => (
            <span
              key={o.jsDay}
              className={`day-pill${o.jsDay === jsDay ? " on" : ""}`}
              onClick={() => setJsDay(o.jsDay)}
            >
              {o.short}
            </span>
          ))}
        </div>

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
            aria-label="ذخیره"
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
    </>
  );
}
