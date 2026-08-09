"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Plus, Search, X } from "lucide-react";
import { FA_WEEKDAY, FA_WEEKDAY_SHORT, CAL_WEEK_ORDER } from "@/lib/jalali";
import { ExerciseDay, computeDayFocus } from "@/lib/exercisePlans";
import { EXERCISE_CATALOG, ExerciseCatalogEntry } from "@/lib/exerciseCatalog";
import { stripSetSuffix } from "@/lib/exerciseSets";
import { normalizeFa } from "@/lib/utils";
import { toFaDigits } from "@/lib/schedule";

// وقتی کاربر روی «افزودن» یک حرکت از کاتالوگ می‌زنه، بسته به الگوی حرکت
// پیش‌فرض رو زمان‌محور (کاردیو/انعطاف‌پذیری) یا ست‌وتکرار می‌ذاریم — ولی
// خودش می‌تونه عوضش کنه.
function isTimedByDefault(entry: ExerciseCatalogEntry): boolean {
  return entry.pattern === "cardio" || entry.pattern === "flexibility";
}

// کارتِ تعیینِ مشخصاتِ یک حرکت — فقط یک ضربدرِ بی‌بک‌گراند بالا داره (نه
// دکمه‌ی بازگشتِ جدا)؛ زدنِ ضربدر یعنی برگشت به لیستِ جستجو، نه بستنِ کاملِ
// پاپ‌آپِ افزودن.
function ManualQuantityPrompt({
  entry,
  onConfirm,
  onCancel,
}: {
  entry: ExerciseCatalogEntry;
  onConfirm: (formattedItem: string) => void;
  onCancel: () => void;
}) {
  const [timed, setTimed] = useState(isTimedByDefault(entry));
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10");
  const [amount, setAmount] = useState("30");
  const [unit, setUnit] = useState<"ثانیه" | "دقیقه">("ثانیه");

  function confirm() {
    const formatted = timed
      ? `${entry.name} ${toFaDigits(amount || "0")} ${unit}`
      : `${entry.name} ${toFaDigits(sets || "1")}×${toFaDigits(reps || "1")}`;
    onConfirm(formatted);
  }

  return (
    <div className="manual-exercise-qty">
      <div className="modal-head" style={{ marginBottom: 6 }}>
        <div className="domain-sub" style={{ marginTop: 0 }}>{entry.name}</div>
        <button type="button" className="nav-close" onClick={onCancel} aria-label="بازگشت">×</button>
      </div>
      <div className="day-picker" style={{ marginTop: 10 }}>
        <span className={`day-pill${!timed ? " on" : ""}`} onClick={() => setTimed(false)}>ست و تکرار</span>
        <span className={`day-pill${timed ? " on" : ""}`} onClick={() => setTimed(true)}>زمان‌محور</span>
      </div>

      {!timed ? (
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <div style={{ flex: 1 }}>
            <label className="exercise-form-label">تعداد ست</label>
            <input type="number" className="wsearch-newform-name" value={sets} onChange={(e) => setSets(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="exercise-form-label">تکرار در هر ست</label>
            <input type="number" className="wsearch-newform-name" value={reps} onChange={(e) => setReps(e.target.value)} />
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <div style={{ flex: 1 }}>
            <label className="exercise-form-label">مدت زمان</label>
            <input type="number" className="wsearch-newform-name" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="exercise-form-label">واحد</label>
            <div className="day-picker">
              <span className={`day-pill${unit === "ثانیه" ? " on" : ""}`} onClick={() => setUnit("ثانیه")}>ثانیه</span>
              <span className={`day-pill${unit === "دقیقه" ? " on" : ""}`} onClick={() => setUnit("دقیقه")}>دقیقه</span>
            </div>
          </div>
        </div>
      )}

      <button type="button" className="manual-submit-btn" style={{ width: "100%", marginTop: 16 }} onClick={confirm}>
        افزودن به برنامه
      </button>
    </div>
  );
}

// پاپ‌آپِ مستقلِ «افزودنِ حرکت» — قبلاً این جستجو/لیست همون‌جا توی نمای روز
// اینلاین رندر می‌شد و صفحه رو شلوغ می‌کرد؛ حالا مثلِ ExerciseCatalogModal یه
// پاپ‌آپِ پورتال‌شده‌ست، مستقل از باکسِ «حرکات این روز» زیرش.
function ManualExerciseAddPopup({
  onAdd,
  onClose,
  excludeNames,
}: {
  onAdd: (formattedItem: string) => void;
  onClose: () => void;
  excludeNames: Set<string>;
}) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState<ExerciseCatalogEntry | null>(null);

  const normalizedQuery = normalizeFa(query);
  const visible = EXERCISE_CATALOG.filter(
    (e) => !excludeNames.has(e.name) && (!normalizedQuery || normalizeFa(e.name).includes(normalizedQuery))
  );

  return createPortal(
    <motion.div
      className="exercise-catalog-popup-wrap manual-exercise-popup-wrap"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="exercise-catalog-popup-panel dash-scope"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        {adding ? (
          <ManualQuantityPrompt
            entry={adding}
            onCancel={() => setAdding(null)}
            onConfirm={(formatted) => { onAdd(formatted); setAdding(null); }}
          />
        ) : (
          <>
            <div className="modal-head">
              <div className="modal-title">افزودن حرکت</div>
              <button type="button" className="nav-close" onClick={onClose} aria-label="بستن">×</button>
            </div>

            <div className="manual-exercise-picker-search">
              <Search size={14} className="manual-exercise-picker-search-icon" />
              <input
                type="text"
                dir="auto"
                placeholder="جستجوی حرکت…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div className="no-scrollbar manual-exercise-picker-list">
              {visible.length === 0 ? (
                <div className="item-line empty">حرکتی پیدا نشد.</div>
              ) : (
                visible.map((e) => (
                  <div key={e.name} className="manual-exercise-picker-row">
                    <div className="min-w-0 flex-1 text-right">
                      <div className="truncate text-[12.5px] font-semibold text-dash-text sm:text-[13.5px]">{e.name}</div>
                      <div className="truncate text-[10px] text-dash-muted sm:text-[11px]">{e.muscleGroup}</div>
                    </div>
                    <button type="button" className="wsearch-add-btn" onClick={() => setAdding(e)}>
                      افزودن
                      <span className="wsearch-add-btn-icon">+</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>,
    document.body
  );
}

// برنامه‌ی دستی/شخصیِ کاربر — کاربر اول روزهای باشگاهش رو (چندتایی) انتخاب
// می‌کنه، بعد با کلیک روی هر روز وارد نمای همون روز می‌شه و از یه پاپ‌آپِ
// مستقل حرکت اضافه می‌کنه. تمرکزِ هر روز («بالاتنه»/«پایین‌تنه»/...) رو
// خودِ سیستم از روی گروهِ عضلانیِ حرکاتِ اضافه‌شده تشخیص می‌ده. بعدِ تکمیلِ
// همه‌ی روزها، یه مرحله‌ی مرورِ کاملِ برنامه هست که یا تایید و ثبت می‌شه یا
// با دکمه‌ی «ویرایش» برمی‌گرده به لیستِ روزها. بدونِ مرحله‌ی قبول‌کردنِ
// قوانین — چون خودِ کاربر برنامه رو نوشته.
export function ManualExercisePlanForm({
  onSubmit,
  submitting,
  onCancel,
  onClose,
}: {
  onSubmit: (days: ExerciseDay[]) => void;
  submitting: boolean;
  onCancel?: () => void;
  onClose?: () => void;
}) {
  const [gymDays, setGymDays] = useState<string[]>([]);
  const [dayItems, setDayItems] = useState<Record<string, string[]>>({});
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dayError, setDayError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDay(day: string) {
    setGymDays((d) => (d.includes(day) ? d.filter((x) => x !== day) : [...d, day]));
    setError(null);
  }
  function addItem(day: string, formatted: string) {
    setDayItems((m) => ({ ...m, [day]: [...(m[day] || []), formatted] }));
  }
  function removeItem(day: string, idx: number) {
    setDayItems((m) => ({ ...m, [day]: (m[day] || []).filter((_, i) => i !== idx) }));
  }

  function goReview() {
    if (gymDays.length === 0) { setError("حداقل یک روز رو انتخاب کن"); return; }
    for (const d of gymDays) {
      if (!(dayItems[d] || []).length) { setError(`برای روزِ «${d}» حداقل یک حرکت اضافه کن.`); return; }
    }
    setError(null);
    setReviewing(true);
  }

  function submit() {
    const days: ExerciseDay[] = gymDays.map((d) => ({
      day: d,
      focus: computeDayFocus(dayItems[d] || []),
      items: dayItems[d] || [],
    }));
    onSubmit(days);
  }

  function finishDay() {
    if (!activeDay) return;
    if (!(dayItems[activeDay] || []).length) { setDayError("حداقل یک حرکت اضافه کن"); return; }
    setDayError(null);
    setActiveDay(null);
    setPickerOpen(false);
  }

  // ------------- نمای مرورِ نهاییِ برنامه -------------
  if (reviewing) {
    return (
      <div>
        <div className="exercise-wizard-head">
          <span />
          {onClose && <button type="button" className="nav-close" onClick={onClose} aria-label="بستن">×</button>}
        </div>

        <label className="exercise-wizard-title">مرورِ برنامه</label>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {gymDays.map((d) => (
            <div key={d} className="manual-day-exercises-box" style={{ margin: 0 }}>
              <div className="manual-day-exercises-head">
                <div className="manual-day-exercises-title">{d} — {computeDayFocus(dayItems[d] || [])}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(dayItems[d] || []).map((it, ii) => (
                  <div key={ii} className="manual-exercise-added-row">
                    <span className="truncate">{it}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 18 }}>
          <button type="button" className="small" onClick={() => setReviewing(false)}>ویرایش</button>
          <button type="button" onClick={submit} disabled={submitting} className="manual-submit-btn">
            {submitting ? "در حال ثبت…" : "ثبتِ برنامه"}
          </button>
        </div>
      </div>
    );
  }

  // ------------- نمای جزئیاتِ یک روز -------------
  if (activeDay) {
    const items = dayItems[activeDay] || [];
    return (
      <div>
        <div className="exercise-wizard-head">
          <button type="button" className="exercise-catalog-back-btn" onClick={() => { setActiveDay(null); setPickerOpen(false); setDayError(null); }} aria-label="بازگشت">
            <ChevronRight size={20} />
          </button>
          {onClose && <button type="button" className="nav-close" onClick={onClose} aria-label="بستن">×</button>}
        </div>

        <label className="exercise-wizard-title" style={{ marginBottom: 4 }}>برنامه‌ی روزِ {activeDay}</label>
        {items.length > 0 && (
          <div style={{ fontSize: 11, color: "var(--muted2)", marginTop: 2 }}>{computeDayFocus(items)}</div>
        )}

        <div className="manual-day-exercises-box">
          <div className="manual-day-exercises-head">
            <div className="manual-day-exercises-title">حرکات این روز</div>
            <button type="button" className="manual-day-add-btn" onClick={() => setPickerOpen(true)}>
              افزودن
              <Plus size={14} />
            </button>
          </div>

          {items.length === 0 ? (
            <div className="item-line empty">هنوز حرکتی اضافه نکردی</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {items.map((it, ii) => (
                <div key={ii} className="manual-exercise-added-row">
                  <span className="truncate">{it}</span>
                  <button type="button" onClick={() => removeItem(activeDay, ii)} aria-label="حذف حرکت">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {dayError && <div className="field-error-msg" style={{ display: "block", marginTop: 10 }}>{dayError}</div>}

        <button type="button" className="manual-day-done-btn" onClick={finishDay}>ثبت</button>

        <AnimatePresence>
          {pickerOpen && (
            <ManualExerciseAddPopup
              onAdd={(formatted) => addItem(activeDay, formatted)}
              onClose={() => setPickerOpen(false)}
              excludeNames={new Set(items.map((it) => stripSetSuffix(it)))}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ------------- نمای انتخابِ روزها -------------
  return (
    <div>
      {(onCancel || onClose) && (
        <div className="exercise-wizard-head">
          {onCancel ? (
            <button type="button" className="exercise-catalog-back-btn" onClick={onCancel} aria-label="بازگشت">
              <ChevronRight size={20} />
            </button>
          ) : <span />}
          {onClose && <button type="button" className="nav-close" onClick={onClose} aria-label="بستن">×</button>}
        </div>
      )}

      <label className="exercise-wizard-title">کدوم روزها رو می‌خوای برنامه داشته باشی؟</label>
      <div className="exercise-day-select-row">
        {CAL_WEEK_ORDER.map((i) => (
          <span
            key={FA_WEEKDAY[i]}
            className={`day-pill${gymDays.includes(FA_WEEKDAY[i]) ? " on" : ""}`}
            onClick={() => toggleDay(FA_WEEKDAY[i])}
          >
            {FA_WEEKDAY_SHORT[i]}
          </span>
        ))}
      </div>

      {gymDays.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 16 }}>
          {gymDays.map((d) => {
            const count = (dayItems[d] || []).length;
            return (
              <div key={d} className="manual-day-row" onClick={() => setActiveDay(d)}>
                <span className="manual-day-row-name">{d}</span>
                <span className="manual-day-row-count">{count > 0 ? `${toFaDigits(String(count))} حرکت` : "افزودن حرکت"}</span>
              </div>
            );
          })}
        </div>
      )}

      {error && <div className="field-error-msg" style={{ display: "block", marginTop: 10 }}>{error}</div>}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
        <button
          type="button"
          onClick={goReview}
          className="manual-submit-btn"
        >
          مرحله بعد
        </button>
      </div>
    </div>
  );
}
