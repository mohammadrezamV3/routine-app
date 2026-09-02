"use client";

import { useRef, useState } from "react";
import { WEEK_ORDER } from "@/lib/schedule";
import { normalizeTimeToFa } from "@/lib/timeUtils";
import { timeStartMinutes } from "@/lib/schedule";
import { findScheduleConflict, isPastToday, rangesOverlap } from "@/lib/conflict";
import { showConflictAlert } from "@/lib/conflictAlertBus";
import { TimeInput } from "./TimeInput";
import { CustomOccurrence, Importance, IMPORTANCE_LABELS, setCustomOccurrences, setRemovedOccurrences } from "@/lib/storage";
import { isoLocal } from "@/lib/jalali";
import { SegmentedTabs } from "./SegmentedTabs";
import { focusNextOnEnter } from "@/lib/formNav";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";

type Occ = { dayName: string; jsDay: number; time: string; id: string; custom?: boolean; importance?: Importance; tag?: string };
type ScheduleOpts = { removedOccurrences: Set<string>; customOccurrences: CustomOccurrence[] };
// دقیقا همون ساختار ردیف‌های AddProgramForm — هر ردیف می‌تونه چند روز
// هم‌زمان داشته باشه (فیکس باگ «توی ویرایش نمی‌شه چند روز انتخاب کرد»).
type EditRow = { jsDays: number[]; start: string; end: string };

const now = new Date();

// این فرم دقیقا همون دیزاین AddProgramForm رو داره (همون کلاس‌های
// liquid-glass-form / add-program-glass، همون بلاب‌های ثابت، همون منطق
// چندردیفی/چندروزه) — چون خود محصول باید حس یکسان بده، فقط برای
// ویرایش یک برنامه‌ی موجود به‌جای افزودن یک برنامه‌ی تازه.
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
  useLockBodyScroll();
  const parts = String(occ.time).split(/[–—-]/);
  const [rows, setRows] = useState<EditRow[]>([
    { jsDays: [occ.jsDay], start: (parts[0] || "").trim(), end: (parts[1] || "").trim() },
  ]);
  const [importance, setImportance] = useState<Importance>(occ.importance ?? "low");
  const [tag, setTag] = useState(occ.tag ?? "");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [rowErrors, setRowErrors] = useState<Record<number, { start?: boolean; end?: boolean; days?: boolean; order?: boolean }>>({});
  const formRef = useRef<HTMLDivElement>(null);

  function addRow() {
    setRows((r) => [...r, { jsDays: [], start: "", end: "" }]);
  }
  function removeRow(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }
  function updateRow(i: number, patch: Partial<EditRow>) {
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

  async function submit() {
    if (status !== "idle") return;
    let hasError = false;
    const rErrs: typeof rowErrors = {};
    rows.forEach((r, i) => {
      const e: { start?: boolean; end?: boolean; days?: boolean; order?: boolean } = {};
      if (!r.jsDays.length) { e.days = true; hasError = true; }
      if (!r.start.trim()) { e.start = true; hasError = true; }
      if (!r.end.trim()) { e.end = true; hasError = true; }
      // ساعت پایان هیچ‌وقت نباید زودتر (یا برابر) ساعت شروع باشه
      if (!e.start && !e.end) {
        const sMin = timeStartMinutes(normalizeTimeToFa(r.start));
        const eMin = timeStartMinutes(normalizeTimeToFa(r.end));
        if (sMin !== null && eMin !== null && eMin <= sMin) { e.order = true; hasError = true; }
      }
      if (e.start || e.end || e.days || e.order) rErrs[i] = e;
    });
    setRowErrors(rErrs);
    if (hasError) {
      if (Object.values(rErrs).some((e) => e.order)) showConflictAlert("ساعت پایان باید بعد از ساعت شروع باشه");
      return;
    }

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
        // occ.id excluded تا خود همون occurrence‌ای که داریم ویرایشش می‌کنیم
        // با خودش تداخل حساب نشه.
        let conflict = findScheduleConflict(jsDay, startMin, endMin, now, scheduleOpts, occ.id);
        if (!conflict) {
          for (const other of normalizedRows) {
            if (other.jsDay === jsDay && rangesOverlap(startMin!, endMin, other.startMin!, other.endMin)) {
              conflict = { id: "self", name } as any;
              break;
            }
          }
        }
        if (conflict) { conflictMsg = `تداخل زمانی با «${conflict.name}» — ذخیره نشد`; break outer; }
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

      let nextRemoved = scheduleOpts.removedOccurrences;
      let nextCustom = scheduleOpts.customOccurrences;
      if (occ.custom) {
        nextCustom = scheduleOpts.customOccurrences.filter((c) => c.id !== occ.id);
      } else {
        nextRemoved = new Set(scheduleOpts.removedOccurrences);
        nextRemoved.add(occ.id + "|" + occ.jsDay);
      }

      const trimmedTag = tag.trim();
      const additions: CustomOccurrence[] = normalizedRows.map((r) => ({
        id: "custom-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        name,
        jsDay: r.jsDay,
        time: r.end ? `${r.start} – ${r.end}` : r.start,
        startDate: isoLocal(now),
        importance,
        ...(trimmedTag ? { tag: trimmedTag } : {}),
      }));
      nextCustom = [...nextCustom, ...additions];

      await setCustomOccurrences(nextCustom);
      await setRemovedOccurrences(Array.from(nextRemoved));

      setTimeout(() => { onChanged(); onClose(); }, 480);
    }, 550);
  }

  return (
    <>
      <div className="wsearch-newform-overlay occ-edit-overlay strong-blur open" onClick={onClose} />
      <div className="wsearch-newform occ-edit-form dash-scope open">
        <div className="relative z-[1] add-program-glass" ref={formRef} onKeyDown={(e) => focusNextOnEnter(e, formRef)}>
          <div className="wsearch-newform-head">
            <div className="wsearch-newform-title accent">ویرایش «{name}»</div>
            <button className="nav-close" onClick={onClose} aria-label="بستن">×</button>
          </div>

          <label htmlFor="editOccTag">تگ (اختیاری)</label>
          <input
            id="editOccTag"
            type="text"
            className="wsearch-newform-name"
            placeholder="درس، ورزش، کار…"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          />

          <label>میزان اهمیت</label>
          <SegmentedTabs
            active={importance}
            onChange={setImportance}
            options={(Object.keys(IMPORTANCE_LABELS) as Importance[]).map((k) => ({ value: k, label: IMPORTANCE_LABELS[k] }))}
          />

          {rows.map((r, ri) => (
            <div key={ri} className="wsearch-newrow">
              <div className="wsearch-newrow-daywrap">
                <div className={`day-picker${rowErrors[ri]?.days ? " field-error" : ""}`}>
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
              </div>
              <div className={`time-field${rowErrors[ri]?.start || rowErrors[ri]?.order ? " field-error" : ""}`}>
                <span className="time-field-label">ساعت شروع</span>
                <div className="field-error-wrap">
                  <TimeInput value={r.start} onChange={(v) => updateRow(ri, { start: v })} />
                </div>
              </div>
              <div className={`time-field${rowErrors[ri]?.end || rowErrors[ri]?.order ? " field-error" : ""}`}>
                <span className="time-field-label">ساعت پایان</span>
                <div className="field-error-wrap">
                  <TimeInput value={r.end} onChange={(v) => updateRow(ri, { end: v })} />
                </div>
              </div>
              {rows.length > 1 && (
                <button type="button" className="wsearch-newrow-remove-text" onClick={() => removeRow(ri)}>
                  حذف این روز
                </button>
              )}
            </div>
          ))}

          <div className="wsearch-newform-addrow">
            <button type="button" className="wsearch-add-btn" onClick={addRow}>
              افزودن روز دیگر
              <span className="wsearch-add-btn-icon">+</span>
            </button>
            <button
              type="button"
              className={`wsearch-submit-btn wsearch-submit-btn-inline${status !== "idle" ? " " + status : ""}`}
              onClick={submit}
              disabled={status !== "idle"}
            >
              {status === "loading" && <span className="wsearch-submit-spinner" />}
              {status === "loading" ? "در حال ذخیره…" : status === "success" ? "ذخیره شد" : status === "error" ? "ذخیره نشد" : "ذخیره"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
