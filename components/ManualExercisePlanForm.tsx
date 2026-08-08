"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { FA_WEEKDAY, FA_WEEKDAY_SHORT, CAL_WEEK_ORDER } from "@/lib/jalali";
import { ExerciseDay } from "@/lib/exercisePlans";
import { EXERCISE_CATALOG, ExerciseCatalogEntry } from "@/lib/exerciseCatalog";
import { normalizeFa } from "@/lib/utils";
import { toFaDigits } from "@/lib/schedule";

type ManualDayBlock = { day: string; focus: string; items: string[] };

const ALL_DAYS = CAL_WEEK_ORDER.map((i) => FA_WEEKDAY[i]);

function emptyBlock(usedDays: string[]): ManualDayBlock {
  const firstFree = ALL_DAYS.find((d) => !usedDays.includes(d)) || ALL_DAYS[0];
  return { day: firstFree, focus: "", items: [] };
}

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
      <div className="day-picker" style={{ marginTop: 8 }}>
        <span className={`day-pill${!timed ? " on" : ""}`} onClick={() => setTimed(false)}>ست و تکرار</span>
        <span className={`day-pill${timed ? " on" : ""}`} onClick={() => setTimed(true)}>زمان‌محور</span>
      </div>

      {!timed ? (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
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
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
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

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
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
      <div className="thin-scroll manual-exercise-picker-list">
        {visible.length === 0 ? (
          <div className="item-line empty">حرکتی پیدا نشد.</div>
        ) : (
          visible.map((e) => (
            <div key={e.name} className="exercise-catalog-row" style={{ cursor: "default" }}>
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

// برنامه‌ی دستی/شخصیِ کاربر — هر بلوک یک روزه (روز + تمرکز + لیستِ حرکات)،
// دقیقاً هم‌ساختار با ExerciseDay که مسیرِ هوش‌مصنوعی/قالب هم تولید می‌کنه.
// حرکات دیگه با تایپِ آزاد وارد نمی‌شن — از کاتالوگ انتخاب می‌شن و بعد از
// زدنِ «افزودن»، تعداد ست/تکرار یا (برای حرکاتِ زمان‌محور) مدت‌زمان پرسیده می‌شه.
export function ManualExercisePlanForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (days: ExerciseDay[]) => void;
  submitting: boolean;
}) {
  const [blocks, setBlocks] = useState<ManualDayBlock[]>([emptyBlock([])]);
  const [pickerOpenIndex, setPickerOpenIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function addBlock() {
    setBlocks((b) => [...b, emptyBlock(b.map((x) => x.day))]);
  }
  function removeBlock(i: number) {
    setBlocks((b) => b.filter((_, idx) => idx !== i));
    setPickerOpenIndex(null);
  }
  function updateBlock(i: number, patch: Partial<ManualDayBlock>) {
    setBlocks((b) => b.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }
  function addItem(i: number, formatted: string) {
    setBlocks((b) => b.map((x, idx) => (idx === i ? { ...x, items: [...x.items, formatted] } : x)));
  }
  function removeItem(i: number, ii: number) {
    setBlocks((b) => b.map((x, idx) => (idx === i ? { ...x, items: x.items.filter((_, j) => j !== ii) } : x)));
  }

  function submit() {
    const days = new Set(blocks.map((b) => b.day));
    if (days.size !== blocks.length) { setError("هر روز فقط یک‌بار می‌تونه توی برنامه باشه."); return; }
    for (const b of blocks) {
      if (b.items.length === 0) { setError(`برای روزِ «${b.day}» حداقل یک حرکت اضافه کن.`); return; }
    }
    setError(null);
    const cleaned: ExerciseDay[] = blocks.map((b) => ({
      day: b.day,
      focus: b.focus.trim() || "برنامه‌ی شخصی",
      items: b.items,
    }));
    onSubmit(cleaned);
  }

  return (
    <div>
      <div className="section-note" style={{ marginTop: 0 }}>
        روزهای باشگاه رو انتخاب کن و برای هر روز از کاتالوگ حرکات اضافه کن.
      </div>

      {blocks.map((b, bi) => (
        <div key={bi} className="tm-extra">
          <div className="domain-sub" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>روز</span>
            {blocks.length > 1 && (
              <button type="button" className="wsearch-newrow-remove-text" onClick={() => removeBlock(bi)}>
                حذف این روز
              </button>
            )}
          </div>
          <div className="exercise-day-select-row">
            {CAL_WEEK_ORDER.map((i) => (
              <span
                key={FA_WEEKDAY[i]}
                className={`day-pill${b.day === FA_WEEKDAY[i] ? " on" : ""}`}
                onClick={() => updateBlock(bi, { day: FA_WEEKDAY[i] })}
              >
                {FA_WEEKDAY_SHORT[i]}
              </span>
            ))}
          </div>

          <label className="exercise-form-label" style={{ marginTop: 12, display: "block" }}>تمرکزِ امروز (اختیاری)</label>
          <input
            type="text"
            dir="auto"
            className="wsearch-newform-name"
            placeholder="مثلاً بالاتنه، پا، بدنِ کامل…"
            value={b.focus}
            onChange={(e) => updateBlock(bi, { focus: e.target.value })}
          />

          <label className="exercise-form-label" style={{ marginTop: 12, display: "block" }}>حرکات</label>
          {b.items.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
              {b.items.map((it, ii) => (
                <div key={ii} className="manual-exercise-added-row">
                  <span className="truncate">{it}</span>
                  <button type="button" onClick={() => removeItem(bi, ii)} aria-label="حذف حرکت">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {pickerOpenIndex === bi ? (
            <div style={{ marginTop: 10 }}>
              <ManualCatalogPicker
                onAdd={(formatted) => addItem(bi, formatted)}
                onClose={() => setPickerOpenIndex(null)}
              />
            </div>
          ) : (
            <button type="button" className="wsearch-add-btn" onClick={() => setPickerOpenIndex(bi)} style={{ marginTop: 8 }}>
              افزودن حرکت
              <span className="wsearch-add-btn-icon">+</span>
            </button>
          )}
        </div>
      ))}

      {blocks.length < 7 && (
        <button type="button" className="wsearch-add-btn" onClick={addBlock} style={{ marginTop: 10 }}>
          افزودن روز دیگر
          <span className="wsearch-add-btn-icon">+</span>
        </button>
      )}

      {error && <div className="field-error-msg" style={{ display: "block", marginTop: 10 }}>{error}</div>}

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        style={{ marginTop: 16, borderColor: "var(--accent)", color: "var(--accent)" }}
      >
        {submitting ? "در حال ثبت…" : "مرحله بعد"}
      </button>
    </div>
  );
}
