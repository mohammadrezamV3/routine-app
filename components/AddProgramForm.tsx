"use client";

import { useRef, useState } from "react";
import { WEEK_ORDER } from "@/lib/schedule";
import { normalizeTimeToFa } from "@/lib/timeUtils";
import { timeStartMinutes } from "@/lib/schedule";
import { findScheduleConflict, isPastToday, rangesOverlap } from "@/lib/conflict";
import { showConflictAlert } from "@/lib/conflictAlertBus";
import { TimeInput } from "./TimeInput";
import { JalaliDatePicker } from "./JalaliDatePicker";
import { formatJalali, JalaliDate } from "@/lib/jalali";
import { CustomOccurrence, Importance, IMPORTANCE_LABELS, setCustomOccurrences } from "@/lib/storage";
import { SegmentedTabs } from "./SegmentedTabs";
import { focusNextOnEnter } from "@/lib/formNav";

const now = new Date();

type ScheduleOpts = { removedOccurrences: Set<string>; customOccurrences: CustomOccurrence[] };
// یک ردیف می‌تونه چند روز هم‌زمان داشته باشه (یه ساعتِ واحد برای همه‌شون) —
// موقعِ ثبت، یک occurrence جدا برای هر روزِ انتخاب‌شده ساخته می‌شه.
type NewRow = { jsDays: number[]; start: string; end: string };

// فرمِ مستقلِ «افزودن برنامه جدید» — قبلاً زیرمجموعه‌ی WeeklySearchPanel بود
// (پاپ‌آپِ جستجو هم زیرش همزمان باز می‌شد)؛ حالا کاملاً جدا و تنها راهِ
// افزودنِ برنامه‌ست، با بک‌گراندِ لیکوئید گلس مثلِ بقیه‌ی کارت‌های اپ.
export function AddProgramForm({
  scheduleOpts,
  onClose,
  onChanged,
}: {
  scheduleOpts: ScheduleOpts;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [importance, setImportance] = useState<Importance>("low");
  const [startJalali, setStartJalali] = useState<JalaliDate | null>(null);
  const [endJalali, setEndJalali] = useState<JalaliDate | null>(null);
  const [pickerFor, setPickerFor] = useState<"start" | "end" | null>(null);
  const [rows, setRows] = useState<NewRow[]>([{ jsDays: [WEEK_ORDER[0].jsDay], start: "", end: "" }]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [nameError, setNameError] = useState(false);
  const [rowErrors, setRowErrors] = useState<Record<number, { start?: boolean; end?: boolean; days?: boolean }>>({});
  const formRef = useRef<HTMLDivElement>(null);

  function addRow() {
    setRows((r) => [...r, { jsDays: [WEEK_ORDER[0].jsDay], start: "", end: "" }]);
  }
  function removeRow(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }
  function updateRow(i: number, patch: Partial<NewRow>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function toggleRowDay(i: number, jsDay: number) {
    setRows((r) =>
      r.map((row, idx) => {
        if (idx !== i) return row;
        const has = row.jsDays.includes(jsDay);
        const next = has ? row.jsDays.filter((d) => d !== jsDay) : [...row.jsDays, jsDay];
        return { ...row, jsDays: next };
      })
    );
  }

  async function submitNew() {
    if (status !== "idle") return;
    let hasError = false;
    const nErr = !name.trim();
    setNameError(nErr);
    if (nErr) hasError = true;

    const rErrs: typeof rowErrors = {};
    rows.forEach((r, i) => {
      const e: { start?: boolean; end?: boolean; days?: boolean } = {};
      if (!r.jsDays.length) { e.days = true; hasError = true; }
      if (!r.start.trim()) { e.start = true; hasError = true; }
      if (!r.end.trim()) { e.end = true; hasError = true; }
      if (e.start || e.end || e.days) rErrs[i] = e;
    });
    setRowErrors(rErrs);
    if (hasError) return;

    const normalizedRows: { jsDay: number; start: string; end: string; startMin: number | null; endMin: number | null }[] = [];
    let conflictMsg: string | null = null;
    outer: for (const r of rows) {
      const startFa = normalizeTimeToFa(r.start);
      const endFa = normalizeTimeToFa(r.end);
      const startMin = timeStartMinutes(startFa);
      const endMin = timeStartMinutes(endFa);

      for (const jsDay of r.jsDays) {
        if (isPastToday(jsDay, startMin, endMin, now)) {
          conflictMsg = "این ساعت برای امروز گذشته — نمی‌شه براش برنامه ثبت کرد";
          break outer;
        }
        let conflict = findScheduleConflict(jsDay, startMin, endMin, now, scheduleOpts);
        if (!conflict) {
          for (const other of normalizedRows) {
            if (other.jsDay === jsDay && rangesOverlap(startMin!, endMin, other.startMin!, other.endMin)) {
              conflict = { id: "self", name } as any;
              break;
            }
          }
        }
        if (conflict) { conflictMsg = `تداخل زمانی با «${conflict.name}» — این برنامه اضافه نشد`; break outer; }
        normalizedRows.push({ jsDay, start: startFa, end: endFa, startMin, endMin });
      }
    }

    setStatus("loading");
    setTimeout(async () => {
      if (conflictMsg) {
        setStatus("error");
        showConflictAlert(conflictMsg!);
        setTimeout(() => setStatus("idle"), 900);
        return;
      }
      setStatus("success");
      if (navigator.vibrate) navigator.vibrate(15);

      const trimmedTag = tag.trim();
      const additions: CustomOccurrence[] = normalizedRows.map((r) => ({
        id: "custom-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        name,
        jsDay: r.jsDay,
        time: r.end ? `${r.start} – ${r.end}` : r.start,
        importance,
        ...(trimmedTag ? { tag: trimmedTag } : {}),
      }));
      await setCustomOccurrences([...scheduleOpts.customOccurrences, ...additions]);

      setTimeout(() => {
        onChanged();
        onClose();
      }, 480);
    }, 550);
  }

  return (
    <>
      <div className="wsearch-newform-overlay strong-blur open" onClick={onClose} />
      <div className="wsearch-newform dash-scope open">
        <div className="relative z-[1] add-program-glass" ref={formRef} onKeyDown={(e) => focusNextOnEnter(e, formRef)}>
          <div className="wsearch-newform-head">
            <div className="wsearch-newform-title accent">افزودن برنامه جدید</div>
            <button className="nav-close" onClick={onClose} aria-label="بستن">×</button>
          </div>

          <label htmlFor="addProgramName">اسم برنامه</label>
          <div className={`name-field-wrap${nameError ? " field-error" : ""}`}>
            <input
              id="addProgramName"
              type="text"
              className="wsearch-newform-name"
              placeholder="ریاضی، باشگاه، جلسه کاری…"
              value={name}
              onChange={(e) => { setName(e.target.value); if (e.target.value.trim()) setNameError(false); }}
            />
          </div>

          <label htmlFor="addProgramTag">تگ (اختیاری)</label>
          <input
            id="addProgramTag"
            type="text"
            className="wsearch-newform-name"
            placeholder="درس، ورزش، کار…"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          />

          <div className="wsearch-date-row">
            <div className="time-field">
              <span className="time-field-label">تاریخ شروع دوره (اختیاری)</span>
              <button type="button" className={`jdate-btn${startJalali ? "" : " placeholder"}`} onClick={() => setPickerFor("start")}>
                {startJalali ? formatJalali(startJalali) : "روز / ماه / سال"}
              </button>
            </div>
            <div className="time-field">
              <span className="time-field-label">تاریخ پایان دوره (اختیاری)</span>
              <button type="button" className={`jdate-btn${endJalali ? "" : " placeholder"}`} onClick={() => setPickerFor("end")}>
                {endJalali ? formatJalali(endJalali) : "روز / ماه / سال"}
              </button>
            </div>
          </div>

          <label>میزان اهمیت</label>
          <SegmentedTabs
            active={importance}
            onChange={setImportance}
            options={(Object.keys(IMPORTANCE_LABELS) as Importance[]).map((k) => ({ value: k, label: IMPORTANCE_LABELS[k] }))}
          />

          {rows.map((r, ri) => (
            <div key={ri} className="wsearch-newrow">
              {rows.length > 1 && (
                <div className="wsearch-newrow-remove-wrap">
                  <button type="button" className="wsearch-newrow-remove" onClick={() => removeRow(ri)} aria-label="حذف این ردیف">
                    <svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14" stroke="#E05252" strokeWidth="2.4" strokeLinecap="round" /></svg>
                  </button>
                </div>
              )}
              <div className={`day-picker wsearch-newrow-day${rowErrors[ri]?.days ? " field-error" : ""}`}>
                {WEEK_ORDER.map((o) => (
                  <span
                    key={o.jsDay}
                    className={`day-pill${r.jsDays.includes(o.jsDay) ? " on" : ""}`}
                    onClick={() => toggleRowDay(ri, o.jsDay)}
                  >
                    {o.short}
                  </span>
                ))}
              </div>
              <div className={`time-field${rowErrors[ri]?.start ? " field-error" : ""}`}>
                <span className="time-field-label">ساعت شروع</span>
                <div className="field-error-wrap">
                  <TimeInput value={r.start} onChange={(v) => updateRow(ri, { start: v })} />
                </div>
              </div>
              <div className={`time-field${rowErrors[ri]?.end ? " field-error" : ""}`}>
                <span className="time-field-label">ساعت پایان</span>
                <div className="field-error-wrap">
                  <TimeInput value={r.end} onChange={(v) => updateRow(ri, { end: v })} />
                </div>
              </div>
            </div>
          ))}

          <div className="wsearch-newform-addrow">
            <button type="button" className="wsearch-add-btn" onClick={addRow}>
              افزودن روز دیگر
              <span className="wsearch-add-btn-icon">+</span>
            </button>
            <button
              type="button"
              className={`wsearch-newform-submit${status !== "idle" ? " " + status : ""}`}
              onClick={submitNew}
              aria-label="ثبت"
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

      {pickerFor && (
        <JalaliDatePicker
          initial={pickerFor === "start" ? startJalali : endJalali}
          title={pickerFor === "start" ? "تاریخ شروع دوره" : "تاریخ پایان دوره"}
          onClose={() => setPickerFor(null)}
          onPick={(d) => {
            if (pickerFor === "start") { setStartJalali(d); setPickerFor("end"); }
            else { setEndJalali(d); setPickerFor(null); }
          }}
        />
      )}
    </>
  );
}
