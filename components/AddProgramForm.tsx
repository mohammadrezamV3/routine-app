"use client";

import { useRef, useState } from "react";
import { ChevronRight, Minus } from "lucide-react";
import { WEEK_ORDER, jsDayOfIso } from "@/lib/schedule";
import { normalizeTimeToFa } from "@/lib/timeUtils";
import { timeStartMinutes } from "@/lib/schedule";
import { findConflictOnDate, findScheduleConflict, rangesOverlap } from "@/lib/conflict";
import { TimeInput } from "./TimeInput";
import { JalaliDatePicker } from "./JalaliDatePicker";
import { formatJalali, isoLocal, jalaliToIso, JalaliDate, toJalali } from "@/lib/jalali";
import { CustomOccurrence, Importance, IMPORTANCE_LABELS, setCustomOccurrences } from "@/lib/storage";
import { SegmentedTabs } from "./SegmentedTabs";
import { focusNextOnEnter } from "@/lib/formNav";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";

const now = new Date();

type ScheduleOpts = { removedOccurrences: Set<string>; customOccurrences: CustomOccurrence[] };
// یک ردیف می‌تونه چند روز هم‌زمان داشته باشه (یه ساعت واحد برای همه‌شون) —
// موقع ثبت، یک occurrence جدا برای هر روز انتخاب‌شده ساخته می‌شه. id
// ثابت (نه index آرایه) لازمه تا React موقع افزودن/حذف یک ردیف، بقیه‌ی
// ردیف‌ها رو دوباره از صفر نسازه و مقدار فیلدهاشون جابه‌جا نشه.
type NewRow = { id: string; jsDays: number[]; start: string; end: string };
function newRowId(): string {
  return "row-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
type Step = "info" | "details";

// فرم مستقل «افزودن برنامه جدید» — دو مرحله‌ای: اول اسم/روزها/ساعت‌ها/دوره،
// بعدش میزان اهمیت و تگ. اعتبارسنجی هر مرحله جدا انجام می‌شه؛ دکمه‌ی «بعدی»
// اگه چیزی ناقصه یه لرزش خیلی ملایم می‌خوره تا کاربر بفهمه مشکلی هست.
function isoToJalali(iso: string): JalaliDate {
  const d = new Date(iso + "T00:00:00");
  return toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function AddProgramForm({
  scheduleOpts,
  onClose,
  onChanged,
  defaultDateIso,
}: {
  scheduleOpts: ScheduleOpts;
  onClose: () => void;
  onChanged: () => void;
  /** روزی که کاربر در صفحه انتخاب کرده — پیش‌فرضِ گزینه‌ی «فقط برای یک روز» */
  defaultDateIso?: string;
}) {
  useLockBodyScroll();
  const [step, setStep] = useState<Step>("info");
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [importance, setImportance] = useState<Importance>("medium");
  const [isPeriod, setIsPeriod] = useState(false);
  // «فقط برای یک روز»: برنامه روی همان یک تاریخ ثبت می‌شود (startDate =
  // endDate) و هفته‌های بعد تکرار نمی‌شود. با «دوره» هم‌زمان نمی‌شود.
  const [isOnce, setIsOnce] = useState(false);
  const [onceJalali, setOnceJalali] = useState<JalaliDate>(() => isoToJalali(defaultDateIso || isoLocal(now)));
  const [startJalali, setStartJalali] = useState<JalaliDate | null>(null);
  const [endJalali, setEndJalali] = useState<JalaliDate | null>(null);
  const [pickerFor, setPickerFor] = useState<"start" | "end" | "once" | null>(null);
  const [rows, setRows] = useState<NewRow[]>([{ id: newRowId(), jsDays: [], start: "", end: "" }]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  // پیامِ خطا عمداً *داخلِ همین فرم* نشان داده می‌شود، نه با بنرِ بالای صفحه:
  // درخواستِ صریحِ کاربر بود که آن بنرها حذف شوند. جایی که کاربر دارد نگاه
  // می‌کند همین‌جاست، پس پیام هم باید همین‌جا باشد.
  const [formError, setFormError] = useState<string | null>(null);
  const [nameError, setNameError] = useState(false);
  const [rowErrors, setRowErrors] = useState<Record<number, { start?: boolean; end?: boolean; days?: boolean; order?: boolean }>>({});
  const [periodError, setPeriodError] = useState<null | "missing" | "order">(null);
  const [shakeNext, setShakeNext] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  function addRow() {
    setRows((r) => [...r, { id: newRowId(), jsDays: [], start: "", end: "" }]);
  }
  function removeRow(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }
  // خطای یک ردیف به‌محض اینکه کاربر دوباره دستش رو روی همون ردیف می‌ذاره
  // پاک می‌شه — نه اینکه تا زدن دوباره‌ی «بعدی» قرمز بمونه.
  function clearRowError(i: number) {
    setRowErrors((prev) => {
      if (!prev[i]) return prev;
      const next = { ...prev };
      delete next[i];
      return next;
    });
  }
  function updateRow(i: number, patch: Partial<NewRow>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function toggleRowDay(i: number, jsDay: number) {
    setRows((r) =>
      r.map((row, idx) => {
        if (idx !== i) return row;
        const has = row.jsDays.includes(jsDay);
        // همیشه باید حداقل یک روز انتخاب‌شده بمونه — دی‌سلکت‌کردن آخرین
        // روز باقی‌مونده نادیده گرفته می‌شه، وگرنه یه ردیف بدون هیچ روزی
        // می‌شد که هیچ occurrence‌ای ازش قابل ساختن نیست.
        if (has && row.jsDays.length === 1) return row;
        const next = has ? row.jsDays.filter((d) => d !== jsDay) : [...row.jsDays, jsDay];
        return { ...row, jsDays: next };
      })
    );
  }

  function validateInfoStep(): boolean {
    let hasError = false;
    const nErr = !name.trim();
    setNameError(nErr);
    if (nErr) hasError = true;

    const rErrs: typeof rowErrors = {};
    rows.forEach((r, i) => {
      const e: { start?: boolean; end?: boolean; days?: boolean; order?: boolean } = {};
      if (!isOnce && !r.jsDays.length) { e.days = true; hasError = true; }
      if (!r.start.trim()) { e.start = true; hasError = true; }
      if (!r.end.trim()) { e.end = true; hasError = true; }
      // ساعت پایان نمی‌تونه زودتر (یا برابر) ساعت شروع باشه — بازه‌ی
      // معکوس/صفر یعنی برنامه‌ای که هیچ‌وقت اتفاق نمی‌افته و همه‌ی
      // محاسبه‌های خط زمان/تداخل رو هم بهم می‌ریزه.
      if (!e.start && !e.end) {
        const sMin = timeStartMinutes(normalizeTimeToFa(r.start));
        const eMin = timeStartMinutes(normalizeTimeToFa(r.end));
        if (sMin !== null && eMin !== null && eMin <= sMin) { e.order = true; hasError = true; }
      }
      if (e.start || e.end || e.days || e.order) rErrs[i] = e;
    });
    setRowErrors(rErrs);

    let pErr: typeof periodError = null;
    if (isPeriod) {
      if (!startJalali || !endJalali) pErr = "missing";
      else if ((jalaliToIso(...endJalali) ?? "") < (jalaliToIso(...startJalali) ?? "")) pErr = "order";
    }
    setPeriodError(pErr);
    if (pErr) hasError = true;

    return !hasError;
  }

  function goNext() {
    if (validateInfoStep()) {
      setStep("details");
      return;
    }
    setShakeNext(true);
    setTimeout(() => setShakeNext(false), 350);
  }

  async function submitNew() {
    if (status !== "idle") return;
    if (!validateInfoStep()) { setStep("info"); return; }

    const today = isoLocal(now);
    const onceIso = isOnce ? jalaliToIso(...onceJalali) : null;
    const periodStart = isPeriod && startJalali ? jalaliToIso(...startJalali) : null;
    const periodEnd = isPeriod && endJalali ? jalaliToIso(...endJalali) : null;
    // تاریخِ ثبت: تک‌روزه → همان روز؛ دوره → بازه‌ی انتخاب‌شده؛ هفتگی → از امروز
    const dates: { startDate: string; endDate?: string } = onceIso
      ? { startDate: onceIso, endDate: onceIso }
      : periodStart && periodEnd
        ? { startDate: periodStart, endDate: periodEnd }
        : { startDate: today };

    /** اولین وقوعِ واقعیِ این روزِ هفته — تداخل باید همان‌جا سنجیده شود، نه لزوما این هفته */
    function firstOccurrence(jsDay: number): Date | null {
      const from = dates.startDate > today ? dates.startDate : today;
      const d = new Date(from + "T00:00:00");
      d.setDate(d.getDate() + ((jsDay - d.getDay() + 7) % 7));
      if (dates.endDate && isoLocal(d) > dates.endDate) return null;
      return d;
    }

    const normalizedRows: { jsDay: number; start: string; end: string; startMin: number | null; endMin: number | null }[] = [];
    let conflictMsg: string | null = null;
    outer: for (const r of (isOnce ? rows.slice(0, 1) : rows)) {
      const startFa = normalizeTimeToFa(r.start);
      const endFa = normalizeTimeToFa(r.end);
      const startMin = timeStartMinutes(startFa);
      const endMin = timeStartMinutes(endFa);

      for (const jsDay of (onceIso ? [jsDayOfIso(onceIso)] : r.jsDays)) {
        // عمداً هیچ قفلی روی «این ساعت امروز گذشته» نیست: کاربر باید بتواند
        // برنامه‌ی همین امروز را هم ثبت کند، حتی اگر ساعتش رد شده باشد.
        const at = onceIso || isPeriod ? firstOccurrence(jsDay) : null;
        let conflict = onceIso || isPeriod
          ? (at ? findConflictOnDate(at, startMin, endMin, scheduleOpts) : null)
          : findScheduleConflict(jsDay, startMin, endMin, now, scheduleOpts);
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

    if (conflictMsg) {
      setFormError(null);
      setStatus("error");
      setFormError(conflictMsg);
      setTimeout(() => setStatus("idle"), 900);
      return;
    }

    setFormError(null);
    setStatus("loading");

    // دیگه هیچ تاخیر مصنوعی‌ای قبل از نوشتن نیست — طبق درخواست صریح، برنامه
    // باید همون لحظه‌ای که واقعاً ذخیره شد توی بقیه‌ی اپ هم دیده بشه، نه
    // بعد از یک لودینگ ساختگی که فقط برای نمایش بود.
    const trimmedTag = tag.trim();
    const additions: CustomOccurrence[] = normalizedRows.map((r) => ({
      id: "custom-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      name,
      jsDay: r.jsDay,
      time: r.end ? `${r.start} – ${r.end}` : r.start,
      // هفتگی: از همین امروز به بعد — چهارشنبه‌های گذشته نباید یهو این
      // برنامه رو داشته باشن. دوره/تک‌روزه: دقیقا بازه‌ای که کاربر انتخاب
      // کرد (قبلا تاریخ‌های دوره گرفته می‌شد ولی هیچ‌وقت ذخیره نمی‌شد).
      ...dates,
      importance,
      ...(trimmedTag ? { tag: trimmedTag } : {}),
    }));
    await setCustomOccurrences([...scheduleOpts.customOccurrences, ...additions]);
    if (navigator.vibrate) navigator.vibrate(15);
    setStatus("success");
    onChanged();
    setTimeout(onClose, 480);
  }

  return (
    <>
      <div className="wsearch-newform-overlay strong-blur open" onClick={onClose} />
      <div className="wsearch-newform dash-scope open">
        <div className="relative z-[1] add-program-glass" ref={formRef} onKeyDown={(e) => focusNextOnEnter(e, formRef)}>
          {step === "info" ? (
            <div className="wsearch-newform-head">
              <div className="wsearch-newform-title accent">افزودن برنامه جدید</div>
              <button className="nav-close" onClick={onClose} aria-label="بستن">×</button>
            </div>
          ) : (
            <div className="exercise-wizard-head">
              <button type="button" className="exercise-catalog-back-btn" onClick={() => setStep("info")} aria-label="بازگشت">
                <ChevronRight size={20} />
              </button>
              <button type="button" className="nav-close" onClick={onClose} aria-label="بستن">×</button>
            </div>
          )}

          {step === "info" && (
            <>
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
              {nameError && <div className="field-error-msg" style={{ display: "block", marginTop: 6 }}>اسم برنامه رو وارد کن</div>}

              <label className="auth-remember-label" style={{ marginTop: 14 }}>
                <input
                  type="checkbox"
                  className="auth-checkbox"
                  checked={isOnce}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setIsOnce(on);
                    if (on) {
                      // تک‌روزه یک ردیف ساعت دارد و روزش از تاریخ می‌آید
                      setIsPeriod(false);
                      setPeriodError(null);
                      setRows((r) => r.slice(0, 1));
                      setRowErrors({});
                    }
                  }}
                />
                فقط برای یک روز (تکرار نشه)
              </label>

              {isOnce && (
                <div className="wsearch-date-row">
                  <div className="time-field">
                    <span className="time-field-label">تاریخ</span>
                    <button type="button" className="jdate-btn" onClick={() => setPickerFor("once")}>
                      {formatJalali(onceJalali)}
                    </button>
                  </div>
                </div>
              )}

              <div className="wsearch-newrow-list">
                {(isOnce ? rows.slice(0, 1) : rows).map((r, ri) => {
                  const err = rowErrors[ri];
                  const rowErrMsgs: string[] = [];
                  if (err?.days) rowErrMsgs.push("حداقل یک روز رو انتخاب کن");
                  if (err?.start) rowErrMsgs.push("ساعت شروع رو وارد کن");
                  if (err?.end) rowErrMsgs.push("ساعت پایان رو وارد کن");
                  if (err?.order) rowErrMsgs.push("ساعت پایان باید بعد از ساعت شروع باشه");
                  return (
                    <div key={r.id} className="wsearch-newrow-anim">
                      <div className="wsearch-newrow">
                        {!isOnce && (
                        <div className="wsearch-newrow-daywrap">
                          <div className={`day-picker${err?.days ? " field-error" : ""}`}>
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
                        )}
                        <div className={`time-field${err?.start || err?.order ? " field-error" : ""}`}>
                          <span className="time-field-label">ساعت شروع</span>
                          <div className="field-error-wrap">
                            <TimeInput value={r.start} onChange={(v) => { updateRow(ri, { start: v }); clearRowError(ri); }} />
                          </div>
                        </div>
                        <div className={`time-field${err?.end || err?.order ? " field-error" : ""}`}>
                          <span className="time-field-label">ساعت پایان</span>
                          <div className="field-error-wrap">
                            <TimeInput value={r.end} onChange={(v) => { updateRow(ri, { end: v }); clearRowError(ri); }} />
                          </div>
                        </div>
                        {rows.length > 1 && (
                          <button type="button" className="wsearch-newrow-remove-text" onClick={() => removeRow(ri)}>
                            <Minus size={12} />
                            حذف این روز
                          </button>
                        )}
                      </div>
                      {!!rowErrMsgs.length && (
                        <div className="field-error-msg" style={{ display: "block", marginTop: -4, marginBottom: 4 }}>
                          {rowErrMsgs.join(" — ")}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {!isOnce && (
                <button type="button" className="wsearch-add-btn" onClick={addRow}>
                  افزودن روز دیگر
                  <span className="wsearch-add-btn-icon">+</span>
                </button>
              )}

              <label className="auth-remember-label" style={{ marginTop: 16 }}>
                <input
                  type="checkbox"
                  className="auth-checkbox"
                  checked={isPeriod}
                  onChange={(e) => {
                    setIsPeriod(e.target.checked);
                    if (e.target.checked) setIsOnce(false);
                    else setPeriodError(null);
                  }}
                />
                این یک دوره است
              </label>

              {isPeriod && (
                <div className={`wsearch-date-row${periodError ? " field-error" : ""}`}>
                  <div className="time-field">
                    <span className="time-field-label">تاریخ شروع دوره</span>
                    <button type="button" className={`jdate-btn${startJalali ? "" : " placeholder"}`} onClick={() => setPickerFor("start")}>
                      {startJalali ? formatJalali(startJalali) : "روز / ماه / سال"}
                    </button>
                  </div>
                  <div className="time-field">
                    <span className="time-field-label">تاریخ پایان دوره</span>
                    <button type="button" className={`jdate-btn${endJalali ? "" : " placeholder"}`} onClick={() => setPickerFor("end")}>
                      {endJalali ? formatJalali(endJalali) : "روز / ماه / سال"}
                    </button>
                  </div>
                </div>
              )}
              {periodError && (
                <div className="field-error-msg" style={{ display: "block", marginTop: 6 }}>
                  {periodError === "order" ? "تاریخ پایان دوره باید بعد از تاریخ شروع باشه" : "تاریخ شروع و پایان دوره رو انتخاب کن"}
                </div>
              )}

              <button
                type="button"
                className={`exercise-wizard-next-btn wide${shakeNext ? " shake" : ""}`}
                style={{ marginTop: 18 }}
                onClick={goNext}
              >
                بعدی
              </button>
            </>
          )}

          {step === "details" && (
            <>
              <label className="exercise-wizard-title">میزان اهمیت و تگ</label>

              <label>میزان اهمیت</label>
              <SegmentedTabs
                active={importance}
                onChange={setImportance}
                options={(Object.keys(IMPORTANCE_LABELS) as Importance[]).map((k) => ({ value: k, label: IMPORTANCE_LABELS[k] }))}
              />
              <div className="section-note" style={{ marginTop: 8 }}>
                نکته: فقط برنامه‌هایی که میزان اهمیت آن‌ها زیاد یا خیلی زیاد باشد توسط اعلان به شما اطلاع داده خواهد شد.
              </div>

              <label htmlFor="addProgramTag" style={{ marginTop: 14, display: "block" }}>تگ (اختیاری)</label>
              <input
                id="addProgramTag"
                type="text"
                className="wsearch-newform-name"
                placeholder="درس، ورزش، کار…"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
              />

              {/* دکمه‌ی ثبت طبق درخواست کاربر دیگه یه آیکون تیک دایره‌ای
                  نیست — یک دکمه‌ی تمام‌عرض متن‌دار با حالت لودینگ/موفقیت/خطا
                  روی خودش، تا مشخص باشه داره ثبت می‌شه. */}
              {formError && <div className="form-inline-error">{formError}</div>}

              <div className="wsearch-newform-actions">
                <button
                  type="button"
                  className={`wsearch-submit-btn${status !== "idle" ? " " + status : ""}`}
                  onClick={submitNew}
                  disabled={status !== "idle"}
                >
                  {status === "loading" ? (
                    <span className="wsearch-submit-spinner" />
                  ) : status === "success" ? "ثبت شد" : status === "error" ? "ثبت نشد" : "ثبت"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {pickerFor && (
        <JalaliDatePicker
          initial={pickerFor === "once" ? onceJalali : pickerFor === "start" ? startJalali : endJalali}
          title={pickerFor === "once" ? "تاریخ برنامه" : pickerFor === "start" ? "تاریخ شروع دوره" : "تاریخ پایان دوره"}
          onClose={() => setPickerFor(null)}
          onPick={(d) => {
            if (pickerFor === "once") { setOnceJalali(d); setPickerFor(null); }
            else if (pickerFor === "start") { setStartJalali(d); setPickerFor("end"); }
            else { setEndJalali(d); setPickerFor(null); }
          }}
        />
      )}
    </>
  );
}
