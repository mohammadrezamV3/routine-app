"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "framer-motion";
import {
  Sparkles, Dumbbell, BookOpen, Brain, BookMarked, Languages, Footprints, ListChecks,
  type LucideIcon,
} from "lucide-react";
import { jsDayOfIso, timeStartMinutes } from "@/lib/schedule";
import { normalizeTimeToFa } from "@/lib/timeUtils";
import { findConflictOnDate, findScheduleConflict, rangesOverlap } from "@/lib/conflict";
import { JalaliDatePicker } from "./JalaliDatePicker";
import { formatJalali, isoLocal, jalaliToIso, JalaliDate, toJalali } from "@/lib/jalali";
import { CustomOccurrence, setSettingChecked } from "@/lib/storage";
import { SegmentedTabs } from "./SegmentedTabs";
import { focusNextOnEnter } from "@/lib/formNav";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { TickOption } from "./TickOption";
import { RoutineChecklistEditor } from "./RoutineChecklistEditor";
import { RoutineTagField } from "./RoutineTagField";
import type { ChecklistItem } from "@/lib/routineChecklist";
import { Spinner } from "./Spinner";
import { ProgramTimeRows, type RowError } from "./ProgramTimeRows";
import {
  PROGRAM_TEMPLATES,
  addMinutesToTime,
  describeSchedule,
  newTimeRow,
  type ProgramKind,
  type ProgramTemplate,
  type TimeRow,
} from "@/lib/programForm";
import "./add-program.css";

type ScheduleOpts = { removedOccurrences: Set<string>; customOccurrences: CustomOccurrence[] };

// آیکون الگوها از روی اسم lucide انتخاب می‌شه (فهرست محدود تا باندل بزرگ نشه)
// فقط آیکون‌هایی که PROGRAM_TEMPLATES (lib/programForm.ts) استفاده می‌کنه — نه یک
// فهرست بزرگ که بی‌دلیل به باندل اضافه بشه؛ قالب تازه = آیکونش همین‌جا اضافه بشه
const TEMPLATE_ICONS: Record<string, LucideIcon> = {
  Sparkles, Dumbbell, BookOpen, Brain, BookMarked, Languages, Footprints, ListChecks,
};

function isoToJalali(iso: string): JalaliDate {
  const d = new Date(iso + "T00:00:00");
  return toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

// فرم «افزودن برنامه جدید» — یک صفحه (بدون ویزارد)، پاپ‌آپ وسط روی همه‌ی
// عرض‌ها با همون پوسته‌ی EditOccurrenceForm. پاورقی خلاصه‌ی برنامه و دکمه‌ها
// رو همیشه پایین پاپ‌آپ نشون می‌ده. خطاها همه داخل خود فرمه (نه بنر بالای صفحه).
export function AddProgramForm({
  scheduleOpts,
  onClose,
  onChanged,
  defaultDateIso,
}: {
  scheduleOpts: ScheduleOpts;
  onClose: () => void;
  onChanged: () => void;
  /** روزی که کاربر در صفحه انتخاب کرده — پیش‌فرض تاریخ «یک روز» */
  defaultDateIso?: string;
}) {
  useLockBodyScroll();
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(true);

  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  // اعلان: روشن = importance "high" (فقط فلگ داخلی اعلان)، خاموش = "medium"
  const [notify, setNotify] = useState(false);
  const [kind, setKind] = useState<ProgramKind>("weekly");
  const [isList, setIsList] = useState(false);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [itemsError, setItemsError] = useState(false);
  const [onceJalali, setOnceJalali] = useState<JalaliDate>(() => isoToJalali(defaultDateIso || isoLocal(new Date())));
  const [startJalali, setStartJalali] = useState<JalaliDate | null>(null);
  const [endJalali, setEndJalali] = useState<JalaliDate | null>(null);
  const [pickerFor, setPickerFor] = useState<"start" | "end" | "once" | null>(null);
  const [rows, setRows] = useState<TimeRow[]>(() => [newTimeRow()]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [formError, setFormError] = useState<string | null>(null);
  const [nameError, setNameError] = useState(false);
  const [rowErrors, setRowErrors] = useState<Record<string, RowError>>({});
  const [periodError, setPeriodError] = useState<null | "missing" | "order">(null);
  const [shake, setShake] = useState(false);
  const [templateName, setTemplateName] = useState<string | null>(null);
  // مدت الگوی انتخاب‌شده؛ وقتی کاربر ساعت شروع یک ردیف خالی از پایان رو
  // می‌زنه یک بار پایان خودکار پر می‌شه
  const tplMinutes = useRef<number | null>(null);
  const autoFilled = useRef<Set<string>>(new Set());
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // بستن: اول کلاس open برداشته می‌شه (محو شدن)، بعد از انیمیشن آنمونت
  const closing = useRef(false);
  const requestClose = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    setShow(false);
    setTimeout(onClose, reduceMotion ? 0 : 260);
  }, [onClose, reduceMotion]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pickerFor) requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestClose, pickerFor]);

  const onceIso = kind === "once" ? jalaliToIso(...onceJalali) : null;
  const periodFromIso = kind === "period" && startJalali ? jalaliToIso(...startJalali) : null;
  const periodToIso = kind === "period" && endJalali ? jalaliToIso(...endJalali) : null;
  const usedRows = kind === "once" ? rows.slice(0, 1) : rows;

  // تاریخ ثبت: یک روز → همان روز؛ دوره → بازه‌ی انتخاب‌شده؛ هفتگی → از امروز
  function computeDates(today: string): { startDate: string; endDate?: string } {
    return onceIso
      ? { startDate: onceIso, endDate: onceIso }
      : periodFromIso && periodToIso
        ? { startDate: periodFromIso, endDate: periodToIso }
        : { startDate: today };
  }

  // تداخل هر ردیف (همون منطق سنجش زمان ثبت): با برنامه‌های موجود و با
  // ردیف‌های دیگه‌ی همین فرم در همون روز. عمدا هیچ قفلی روی «این ساعت امروز
  // گذشته» نیست: کاربر باید بتونه برنامه‌ی همین امروز رو هم ثبت کنه.
  const computeConflicts = useCallback((): Record<string, string | null> => {
    const out: Record<string, string | null> = {};
    const now = new Date();
    const today = isoLocal(now);
    const dates = computeDates(today);
    const useDates = kind === "once" || kind === "period";
    const norm = usedRows.map((r) => {
      const startFa = normalizeTimeToFa(r.start);
      const endFa = normalizeTimeToFa(r.end);
      return { row: r, startMin: timeStartMinutes(startFa), endMin: timeStartMinutes(endFa) };
    });
    // اولین وقوع واقعی این روز هفته — تداخل باید همان‌جا سنجیده شود
    function firstOccurrence(jsDay: number): Date | null {
      const from = dates.startDate > today ? dates.startDate : today;
      const d = new Date(from + "T00:00:00");
      d.setDate(d.getDate() + ((jsDay - d.getDay() + 7) % 7));
      if (dates.endDate && isoLocal(d) > dates.endDate) return null;
      return d;
    }
    const daysOf = (r: TimeRow) => (onceIso ? [jsDayOfIso(onceIso)] : r.jsDays);
    for (const a of norm) {
      out[a.row.id] = null;
      if (a.startMin === null || a.endMin === null || a.endMin <= a.startMin) continue;
      // دوره بدون تاریخ کامل هنوز قابل سنجش نیست
      if (kind === "period" && !(periodFromIso && periodToIso)) continue;
      for (const jsDay of daysOf(a.row)) {
        let conflict: { name: string } | null = null;
        if (useDates) {
          const at = firstOccurrence(jsDay);
          conflict = at ? findConflictOnDate(at, a.startMin, a.endMin, scheduleOpts) : null;
        } else {
          conflict = findScheduleConflict(jsDay, a.startMin, a.endMin, now, scheduleOpts);
        }
        if (!conflict) {
          for (const b of norm) {
            if (b === a || b.startMin === null || b.endMin === null) continue;
            if (!daysOf(b.row).includes(jsDay)) continue;
            if (rangesOverlap(a.startMin, a.endMin, b.startMin, b.endMin)) {
              conflict = { name: "ردیف دیگر همین برنامه" };
              break;
            }
          }
        }
        if (conflict) { out[a.row.id] = conflict.name; break; }
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, rows, onceIso, periodFromIso, periodToIso, scheduleOpts]);

  const conflicts = useMemo(computeConflicts, [computeConflicts]);

  const summary = useMemo(
    () => describeSchedule(kind, usedRows, { onceIso, periodFromIso, periodToIso }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kind, rows, onceIso, periodFromIso, periodToIso]
  );

  function changeRows(next: TimeRow[]) {
    // پایان خودکار از مدت الگو: فقط یک بار برای هر ردیف
    const mins = tplMinutes.current;
    const withAuto = mins == null ? next : next.map((r) => {
      const prev = rows.find((p) => p.id === r.id);
      if (!prev || prev.start === r.start || !r.start.trim() || r.end.trim() || autoFilled.current.has(r.id)) return r;
      const end = autoEnd(r.start, mins);
      if (!end) return r;
      autoFilled.current.add(r.id);
      return { ...r, end };
    });
    setRows(withAuto);
  }
  /** پایان خودکار از مدت الگو؛ اگه از نیمه‌شب رد می‌شد همون 23:59 (برنامه‌ی روتین از نیمه‌شب رد نمی‌شه) */
  function autoEnd(start: string, mins: number): string {
    const st = normalizeDigits(start);
    if (!/^\d{1,2}:\d{2}$/.test(st)) return "";
    const end = addMinutesToTime(st, mins);
    if (!end) return "";
    const toMin = (v: string) => { const [h, m] = v.split(":").map(Number); return h * 60 + m; };
    return toMin(end) <= toMin(st) ? "23:59" : end;
  }
  function normalizeDigits(s: string): string {
    return s.replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 1776)).replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632)).trim();
  }
  const clearRowError = useCallback((rowId: string) => {
    setRowErrors((prev) => {
      if (!prev[rowId]) return prev;
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
  }, []);

  function applyTemplate(t: ProgramTemplate) {
    setTemplateName(t.name);
    setName(t.name);
    setNameError(false);
    if (!tag.trim() && t.tag) setTag(t.tag);
    tplMinutes.current = t.minutes;
    const first = rows[0];
    if (first && first.start.trim() && !first.end.trim()) {
      const end = autoEnd(first.start, t.minutes);
      if (end) {
        autoFilled.current.add(first.id);
        setRows((rs) => rs.map((r, i) => (i === 0 ? { ...r, end } : r)));
      }
    }
  }

  function changeKind(k: ProgramKind) {
    setKind(k);
    if (k === "once") {
      // یک روز: یک ردیف ساعت دارد و روزش از تاریخ می‌آید
      setRows((r) => r.slice(0, 1));
      setRowErrors({});
    }
    if (k !== "period") setPeriodError(null);
  }

  function validate(): { ok: boolean; first: "name" | "list" | "period" | "rows" | null } {
    let first: "name" | "list" | "period" | "rows" | null = null;
    const nErr = !name.trim();
    setNameError(nErr);
    if (nErr) first = first ?? "name";

    const iErr = isList && !items.some((i) => i.name.trim());
    setItemsError(iErr);
    if (iErr) first = first ?? "list";

    let pErr: typeof periodError = null;
    if (kind === "period") {
      if (!startJalali || !endJalali) pErr = "missing";
      else if ((jalaliToIso(...endJalali) ?? "") < (jalaliToIso(...startJalali) ?? "")) pErr = "order";
    }
    setPeriodError(pErr);
    if (pErr) first = first ?? "period";

    const rErrs: Record<string, RowError> = {};
    usedRows.forEach((r) => {
      const e: RowError = {};
      if (kind !== "once" && !r.jsDays.length) e.days = true;
      if (!r.start.trim()) e.start = true;
      if (!r.end.trim()) e.end = true;
      // ساعت پایان نمی‌تونه زودتر (یا برابر) ساعت شروع باشه — بازه‌ی معکوس/صفر
      // یعنی برنامه‌ای که هیچ‌وقت اتفاق نمی‌افته و محاسبه‌ی تداخل رو بهم می‌ریزه.
      if (!e.start && !e.end) {
        const sMin = timeStartMinutes(normalizeTimeToFa(r.start));
        const eMin = timeStartMinutes(normalizeTimeToFa(r.end));
        if (sMin !== null && eMin !== null && eMin <= sMin) e.order = true;
      }
      if (e.days || e.start || e.end || e.order) rErrs[r.id] = e;
    });
    setRowErrors(rErrs);
    if (Object.keys(rErrs).length) first = first ?? "rows";
    return { ok: !first, first };
  }

  function failFeedback(first: "name" | "list" | "period" | "rows" | null) {
    setShake(true);
    setTimeout(() => setShake(false), 350);
    if (!first) return;
    setTimeout(() => {
      const el = bodyRef.current?.querySelector(`[data-apf-field="${first}"]`);
      el?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    }, 30);
  }

  async function submitNew() {
    if (status !== "idle") return;
    const v = validate();
    if (!v.ok) {
      setFormError(null);
      failFeedback(v.first);
      return;
    }

    const today = isoLocal(new Date());
    const dates = computeDates(today);

    // تداخل: همون سنجش زنده، این‌بار مسدودکننده
    const live = computeConflicts();
    const hit = usedRows.map((r) => live[r.id]).find((c) => c);
    if (hit) {
      setFormError(`تداخل زمانی با «${hit}» — این برنامه اضافه نشد`);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 900);
      return;
    }

    setFormError(null);
    setStatus("loading");

    const trimmedTag = tag.trim();
    // همه‌ی روزهای این برنامه همون آیتم‌ها رو دارن (کلید تیک با id هر occurrence جداست)
    const cleanItems = isList ? items.map((i) => ({ id: i.id, name: i.name.trim() })).filter((i) => i.name) : [];
    const additions: CustomOccurrence[] = [];
    for (const r of usedRows) {
      const startFa = normalizeTimeToFa(r.start);
      const endFa = normalizeTimeToFa(r.end);
      for (const jsDay of onceIso ? [jsDayOfIso(onceIso)] : r.jsDays) {
        additions.push({
          id: "custom-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
          name,
          jsDay,
          time: endFa ? `${startFa} – ${endFa}` : startFa,
          // هفتگی: از همین امروز به بعد؛ یک روز/دوره: دقیقا بازه‌ی انتخاب‌شده
          ...dates,
          importance: notify ? "high" : "medium",
          ...(trimmedTag ? { tag: trimmedTag } : {}),
          ...(cleanItems.length ? { items: cleanItems } : {}),
        });
      }
    }
    // نتیجه‌ی ذخیره بررسی می‌شه (مثلا پایان دوره‌ی آزمایشی روتین = 403)؛ قبلا خطا
    // دکمه رو برای همیشه در حالت لودینگ نگه می‌داشت
    const saved = await setSettingChecked("customOccurrences", [...scheduleOpts.customOccurrences, ...additions]).catch(() => ({ ok: false as const, error: "اتصال برقرار نشد" }));
    if (!saved.ok) {
      setFormError(saved.error || "ذخیره نشد، دوباره امتحان کن");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 1400);
      return;
    }
    if (navigator.vibrate) navigator.vibrate(15);
    setStatus("success");
    onChanged();
    setTimeout(requestClose, 480);
  }

  if (!mounted) return null;

  return createPortal(
    <>
      <div className={`wsearch-newform-overlay strong-blur${show ? " open" : ""}`} onClick={requestClose} />
      <div
        className={`wsearch-newform apf-popup dash-scope${show ? " open" : ""}`}
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-label="برنامه‌ی جدید"
      >
        <div className="relative z-[1] add-program-glass apf-glass" onKeyDown={(e) => focusNextOnEnter(e, bodyRef)}>
          <div className="wsearch-newform-head">
            <div className="wsearch-newform-title accent">برنامه‌ی جدید</div>
            <button type="button" className="nav-close" onClick={requestClose} aria-label="بستن">×</button>
          </div>

              <div className="apf-body" ref={bodyRef}>
                <div className="apf-section" data-apf-field="name">
                  <div className={`apf-name-wrap${nameError ? " apf-invalid" : ""}`}>
                    <input
                      id="addProgramName"
                      type="text"
                      className="wsearch-newform-name"
                      aria-label="اسم برنامه"
                      placeholder="اسم برنامه، مثلا ورزش یا مطالعه"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (e.target.value.trim()) setNameError(false);
                        if (templateName && e.target.value !== templateName) setTemplateName(null);
                      }}
                    />
                  </div>
                  {nameError && <span className="apf-msg">اسم برنامه رو وارد کن</span>}
                  {PROGRAM_TEMPLATES.length > 0 && (
                    <div className="apf-chips">
                      {PROGRAM_TEMPLATES.map((t) => {
                        const Icon = TEMPLATE_ICONS[t.icon] ?? Sparkles;
                        return (
                          <button
                            key={t.name}
                            type="button"
                            className={`apf-chip${templateName === t.name ? " on" : ""}`}
                            onClick={() => applyTemplate(t)}
                          >
                            <Icon size={14} />
                            {t.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="apf-section">
                  <SegmentedTabs<ProgramKind>
                    active={kind}
                    onChange={changeKind}
                    ariaLabel="نوع برنامه"
                    options={[
                      { value: "weekly", label: "هفتگی" },
                      { value: "once", label: "یک روز" },
                      { value: "period", label: "دوره" },
                    ]}
                  />
                  {kind === "once" && (
                    <div className="apf-dates">
                      <div className="apf-date-field">
                        <span className="apf-date-label">تاریخ</span>
                        <button type="button" className="jdate-btn" onClick={() => setPickerFor("once")}>
                          {formatJalali(onceJalali)}
                        </button>
                      </div>
                    </div>
                  )}
                  {kind === "period" && (
                    <div data-apf-field="period">
                      <div className={`apf-dates two${periodError ? " apf-invalid" : ""}`}>
                        <div className="apf-date-field">
                          <span className="apf-date-label">شروع دوره</span>
                          <button type="button" className={`jdate-btn${startJalali ? "" : " placeholder"}`} onClick={() => setPickerFor("start")}>
                            {startJalali ? formatJalali(startJalali) : "روز / ماه / سال"}
                          </button>
                        </div>
                        <div className="apf-date-field">
                          <span className="apf-date-label">پایان دوره</span>
                          <button type="button" className={`jdate-btn${endJalali ? "" : " placeholder"}`} onClick={() => setPickerFor("end")}>
                            {endJalali ? formatJalali(endJalali) : "روز / ماه / سال"}
                          </button>
                        </div>
                      </div>
                      {periodError && (
                        <span className="apf-msg">
                          {periodError === "order" ? "تاریخ پایان دوره باید بعد از تاریخ شروع باشه" : "تاریخ شروع و پایان دوره رو انتخاب کن"}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="apf-rows" data-apf-field="rows">
                  <ProgramTimeRows
                    kind={kind}
                    rows={usedRows}
                    onChange={changeRows}
                    errors={rowErrors}
                    conflicts={conflicts}
                    onClearError={clearRowError}
                  />
                </div>

                <div className="apf-section" data-apf-field="list">
                  <TickOption checked={isList} onChange={(on) => { setIsList(on); if (!on) setItemsError(false); }}>
                    این برنامه یک لیسته (چند آیتم که تک‌تک تیک می‌خورن)
                  </TickOption>
                  {isList && (
                    <>
                      <RoutineChecklistEditor
                        items={items}
                        onChange={(v) => { setItems(v); if (v.some((i) => i.name.trim())) setItemsError(false); }}
                        error={itemsError}
                      />
                      {itemsError && <span className="apf-msg">حداقل یک آیتم به لیست اضافه کن</span>}
                    </>
                  )}
                </div>

                <div className="apf-section">
                  <label htmlFor="addProgramTag">تگ (اختیاری)</label>
                  <RoutineTagField id="addProgramTag" value={tag} onChange={setTag} occurrences={scheduleOpts.customOccurrences} />
                </div>

                <div className="apf-section">
                  <TickOption checked={notify} onChange={setNotify}>
                    برای این برنامه اعلان بفرست
                  </TickOption>
                </div>
              </div>

              <div className="apf-foot">
                {summary && <div className="apf-summary">{summary}</div>}
                {formError && <div className="apf-error">{formError}</div>}
                <div className="apf-actions">
                  <button
                    type="button"
                    className={`wsearch-submit-btn apf-submit${shake ? " shake" : ""}${status !== "idle" ? " " + status : ""}`}
                    onClick={submitNew}
                    disabled={status === "loading" || status === "success"}
                  >
                    {status === "loading" ? <Spinner size={15} /> : status === "success" ? "اضافه شد ✓" : status === "error" ? "اضافه نشد" : "افزودن برنامه"}
                  </button>
                  <button type="button" className="account-outline-btn apf-cancel" onClick={requestClose}>
                    انصراف
                  </button>
                </div>
              </div>
        </div>
      </div>

      {pickerFor && (
        <JalaliDatePicker
          initial={pickerFor === "once" ? onceJalali : pickerFor === "start" ? startJalali : endJalali}
          title={pickerFor === "once" ? "تاریخ برنامه" : pickerFor === "start" ? "تاریخ شروع دوره" : "تاریخ پایان دوره"}
          onClose={() => setPickerFor(null)}
          onPick={(d) => {
            if (pickerFor === "once") { setOnceJalali(d); setPickerFor(null); }
            else if (pickerFor === "start") { setStartJalali(d); setPeriodError(null); setPickerFor("end"); }
            else { setEndJalali(d); setPeriodError(null); setPickerFor(null); }
          }}
        />
      )}
    </>,
    document.body
  );
}
