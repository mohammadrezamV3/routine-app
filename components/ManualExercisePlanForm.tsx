"use client";

import { useState } from "react";
import { ChevronRight, Search, X } from "lucide-react";
import { FA_WEEKDAY, FA_WEEKDAY_SHORT, CAL_WEEK_ORDER } from "@/lib/jalali";
import { ExerciseDay, computeDayFocus } from "@/lib/exercisePlans";
import { EXERCISE_CATALOG, ExerciseCatalogEntry } from "@/lib/exerciseCatalog";
import { normalizeFa } from "@/lib/utils";
import { toFaDigits } from "@/lib/schedule";

// وقتی کاربر روی «افزودن» یک حرکت از کاتالوگ می‌زنه، بسته به الگوی حرکت
// پیش‌فرض رو زمان‌محور (کاردیو/انعطاف‌پذیری) یا ست‌وتکرار می‌ذاریم — ولی
// خودش می‌تونه عوضش کنه.
function isTimedByDefault(entry: ExerciseCatalogEntry): boolean {
  return entry.pattern === "cardio" || entry.pattern === "flexibility";
}

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
      <div className="domain-sub" style={{ marginTop: 0 }}>{entry.name}</div>
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

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button type="button" className="small" style={{ flex: 1 }} onClick={onCancel}>انصراف</button>
        <button type="button" style={{ flex: 2, borderColor: "var(--accent)", color: "var(--accent)" }} onClick={confirm}>
          افزودن به برنامه
        </button>
      </div>
    </div>
  );
}

function ManualCatalogPicker({ onAdd, onClose }: { onAdd: (formattedItem: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState<ExerciseCatalogEntry | null>(null);

  const normalizedQuery = normalizeFa(query);
  const visible = EXERCISE_CATALOG.filter((e) => !normalizedQuery || normalizeFa(e.name).includes(normalizedQuery));

  if (adding) {
    return (
      <ManualQuantityPrompt
        entry={adding}
        onCancel={() => setAdding(null)}
        onConfirm={(formatted) => { onAdd(formatted); setAdding(null); }}
      />
    );
  }

  return (
    <div className="manual-exercise-picker">
      <div className="manual-exercise-picker-search">
        <Search size={14} className="manual-exercise-picker-search-icon" />
        <input
          type="text"
          dir="auto"
          placeholder="جستجوی حرکت…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="button" className="manual-exercise-picker-close" onClick={onClose}>بستن</button>
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
    </div>
  );
}

// برنامه‌ی دستی/شخصیِ کاربر — کاربر اول روزهای باشگاهش رو (چندتایی) انتخاب
// می‌کنه، بعد با کلیک روی هر روز وارد نمای همون روز می‌شه و از کاتالوگ
// حرکت اضافه می‌کنه. تمرکزِ هر روز («بالاتنه»/«پایین‌تنه»/...) رو خودِ
// سیستم از روی گروهِ عضلانیِ حرکاتِ اضافه‌شده تشخیص می‌ده، نه اینکه کاربر
// تایپ کنه. بدونِ مرحله‌ی قبول‌کردنِ قوانین — چون خودِ کاربر برنامه رو نوشته.
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

  function submit() {
    if (gymDays.length === 0) { setError("حداقل یک روز رو انتخاب کن"); return; }
    for (const d of gymDays) {
      if (!(dayItems[d] || []).length) { setError(`برای روزِ «${d}» حداقل یک حرکت اضافه کن.`); return; }
    }
    setError(null);
    const days: ExerciseDay[] = gymDays.map((d) => ({
      day: d,
      focus: computeDayFocus(dayItems[d] || []),
      items: dayItems[d] || [],
    }));
    onSubmit(days);
  }

  // ------------- نمای جزئیاتِ یک روز -------------
  if (activeDay) {
    const items = dayItems[activeDay] || [];
    return (
      <div>
        <div className="exercise-wizard-head">
          <button type="button" className="exercise-catalog-back-btn" onClick={() => { setActiveDay(null); setPickerOpen(false); }} aria-label="بازگشت">
            <ChevronRight size={20} />
          </button>
          {onClose && <button type="button" className="nav-close" onClick={onClose} aria-label="بستن">×</button>}
        </div>

        <div className="domain-sub" style={{ marginTop: 14 }}>برنامه‌ی روزِ {activeDay}</div>
        {items.length > 0 && (
          <div style={{ fontSize: 11, color: "var(--muted2)", marginTop: 2 }}>{computeDayFocus(items)}</div>
        )}

        {items.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
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

        {pickerOpen ? (
          <div style={{ marginTop: 12 }}>
            <ManualCatalogPicker
              onAdd={(formatted) => addItem(activeDay, formatted)}
              onClose={() => setPickerOpen(false)}
            />
          </div>
        ) : (
          <button type="button" className="wsearch-add-btn" onClick={() => setPickerOpen(true)} style={{ marginTop: 12 }}>
            افزودن حرکت به این روز
            <span className="wsearch-add-btn-icon">+</span>
          </button>
        )}
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

      <label className="exercise-form-label" style={{ marginTop: 0 }}>کدوم روزها می‌خوای برنامه داشته باشی؟</label>
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

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        style={{ width: "100%", marginTop: 18, borderColor: "var(--accent)", color: "var(--accent)" }}
      >
        {submitting ? "در حال ثبت…" : "ثبتِ برنامه"}
      </button>
    </div>
  );
}
