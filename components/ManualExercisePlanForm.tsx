"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Reorder, useDragControls } from "framer-motion";
import { ChevronRight, GripVertical, Pencil, Plus, X } from "lucide-react";
import { FA_WEEKDAY, CAL_WEEK_ORDER } from "@/lib/jalali";
import type { ExerciseDay } from "@/lib/exercisePlans";
import { computeDayFocus } from "@/lib/exerciseCatalogUtils";
import { EXERCISE_CATALOG, ExerciseCatalogEntry, exerciseSearchText, getExerciseDifficulty, matchesExerciseQuery } from "@/lib/exerciseCatalog";
import { useProgressiveList } from "@/lib/useProgressiveList";
import { stripSetSuffix } from "@/lib/exerciseSets";
import { normalizeFa } from "@/lib/utils";
import { toEnDigits } from "@/lib/schedule";
import { DifficultyStars } from "./ExerciseCatalogModal";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { NumberInput } from "./NumberInput";
import { SegmentedTabs } from "./SegmentedTabs";
import { Spinner } from "./Spinner";
import { isEn, tr } from "@/lib/i18n";
import { dayNameDisplay, exerciseDisplayName, focusDisplay, localizeExercise } from "@/lib/exerciseI18n";
import { EXERCISE_EN } from "@/lib/exerciseCatalogData/en";

// نوع ورودی (زمان‌محور یا ست‌وتکرار) از روی الگوی حرکت خود حرکت تعیین
// می‌شه، نه با یه سوال از کاربر — کاردیو/انعطاف‌پذیری زمانی‌ان، بقیه ست‌وتکراری.
function isTimedExercise(entry: ExerciseCatalogEntry): boolean {
  return entry.pattern === "cardio" || entry.pattern === "flexibility";
}

// کارت تعیین مشخصات یک حرکت — فقط یک ضربدر بی‌بک‌گراند بالا داره (نه
// دکمه‌ی بازگشت جدا)؛ زدن ضربدر یعنی برگشت به لیست جستجو، نه بستن کامل
// پاپ‌آپ افزودن.
function ManualQuantityPrompt({
  entry,
  onConfirm,
  onCancel,
}: {
  entry: ExerciseCatalogEntry;
  onConfirm: (formattedItem: string) => void;
  onCancel: () => void;
}) {
  const timed = isTimedExercise(entry);
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10");
  const [amount, setAmount] = useState("30");
  const [unit, setUnit] = useState<"ثانیه" | "دقیقه">("ثانیه");

  function confirm() {
    const formatted = timed
      ? `${entry.name} ${toEnDigits(amount || "0")} ${unit}`
      : `${entry.name} ${toEnDigits(sets || "1")}×${toEnDigits(reps || "1")}`;
    onConfirm(formatted);
  }

  return (
    <div className="manual-exercise-qty">
      <div className="modal-head" style={{ marginBottom: 6 }}>
        <div className="domain-sub" style={{ marginTop: 0 }}>{localizeExercise(entry).name}</div>
        <button type="button" className="nav-close" onClick={onCancel} aria-label={tr("بازگشت", "Back")}>×</button>
      </div>
      {!timed ? (
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <div style={{ flex: 1 }}>
            <label className="exercise-form-label">{tr("تعداد ست", "Number of sets")}</label>
            <NumberInput className="wsearch-newform-name calorie-glass-field" value={sets} onChange={(v) => setSets(v)} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="exercise-form-label">{tr("تکرار در هر ست", "Reps per set")}</label>
            <NumberInput className="wsearch-newform-name calorie-glass-field" value={reps} onChange={(v) => setReps(v)} />
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <div style={{ flex: 1 }}>
            <label className="exercise-form-label">{tr("مدت زمان", "Duration")}</label>
            <NumberInput className="wsearch-newform-name calorie-glass-field" value={amount} onChange={(v) => setAmount(v)} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="exercise-form-label">{tr("واحد", "Unit")}</label>
            <SegmentedTabs
              className="seg-flush manual-timer-unit-tabs"
              ariaLabel={tr("واحد", "Unit")}
              options={[{ value: "ثانیه", label: tr("ثانیه", "Seconds") }, { value: "دقیقه", label: tr("دقیقه", "Minutes") }]}
              active={unit}
              onChange={setUnit}
            />
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 16 }}>
        <button type="button" className="manual-plan-submit-btn" onClick={confirm}>
          {tr("افزودن به برنامه", "Add to plan")}
        </button>
      </div>
    </div>
  );
}

// متن جستجوی هر حرکت (اسم + اسم‌های دیگه + عضلات) یک بار ساخته می‌شه.
// نام و گروه عضلانی انگلیسی هم قابل جستجوست (مستقل از زبان جاری)
const SEARCH_INDEX = EXERCISE_CATALOG.map((entry) => ({
  entry,
  text: normalizeFa(`${exerciseSearchText(entry)} | ${EXERCISE_EN[entry.name]?.name ?? ""} | ${EXERCISE_EN[entry.name]?.muscleGroup ?? ""}`),
}));

// پاپ‌آپ مستقل «افزودن حرکت» — قبلا این جستجو/لیست همون‌جا توی نمای روز
// اینلاین رندر می‌شد و صفحه رو شلوغ می‌کرد؛ حالا مثل ExerciseCatalogModal یه
// پاپ‌آپ پورتال‌شده‌ست، مستقل از باکس «حرکات این روز» زیرش.
function ManualExerciseAddPopup({
  onAdd,
  onClose,
  excludeNames,
}: {
  onAdd: (formattedItem: string) => void;
  onClose: () => void;
  excludeNames: Set<string>;
}) {
  useLockBodyScroll();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState<ExerciseCatalogEntry | null>(null);

  const normalizedQuery = normalizeFa(query).replace(/\s+/g, " ");
  const visible = useMemo(
    () => SEARCH_INDEX.filter((x) => !excludeNames.has(x.entry.name) && matchesExerciseQuery(x.text, normalizedQuery)).map((x) => x.entry),
    [excludeNames, normalizedQuery]
  );
  const { limit, onScroll, listRef } = useProgressiveList(visible.length, normalizedQuery);

  return createPortal(
    <div className="exercise-catalog-popup-wrap manual-exercise-popup-wrap" onClick={onClose}>
      <div className="exercise-catalog-popup-panel dash-scope" onClick={(e) => e.stopPropagation()}>
        {adding ? (
          <ManualQuantityPrompt
            entry={adding}
            onCancel={() => setAdding(null)}
            onConfirm={(formatted) => { onAdd(formatted); setAdding(null); }}
          />
        ) : (
          <>
            <div className="modal-head">
              <div className="modal-title">{tr("افزودن حرکت", "Add exercise")}</div>
              <button type="button" className="nav-close" onClick={onClose} aria-label={tr("بستن", "Close")}>×</button>
            </div>

            <input
              type="text"
              dir={isEn() ? "ltr" : "rtl"}
              className="manual-exercise-picker-search"
              placeholder={tr("جستجوی حرکت…", "Search exercises…")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />

            <div ref={listRef} className="no-scrollbar manual-exercise-picker-list" onScroll={onScroll}>
              {visible.length === 0 ? (
                <div className="item-line empty">{tr("حرکتی پیدا نشد.", "No exercises found.")}</div>
              ) : (
                visible.slice(0, limit).map((e) => (
                  <div key={e.name} className="exercise-catalog-row">
                    <div className="min-w-0 flex-1 truncate text-start text-[12.5px] font-semibold text-dash-text sm:text-[13.5px]">
                      {localizeExercise(e).name}
                    </div>
                    <DifficultyStars level={getExerciseDifficulty(e)} className="exercise-catalog-row-stars" />
                    <button type="button" className="manual-exercise-row-add-btn" onClick={() => setAdding(e)}>
                      {tr("افزودن", "Add")}
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

// ردیف یک حرکت اضافه‌شده — توی حالت ویرایش، به‌جای دو دکمه‌ی بالا/پایین،
// یه دسته‌ی درگ («⠿») می‌گیره که با framer-motion's Reorder واقعا کشیدنی‌ه.
function ManualExerciseRow({
  item,
  isEditing,
  onRemove,
}: {
  item: string;
  isEditing: boolean;
  onRemove: () => void;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      className="exercise-catalog-row manual-exercise-added-row"
    >
      {isEditing && (
        <button
          type="button"
          className="manual-reorder-handle"
          onPointerDown={(e) => controls.start(e)}
          aria-label={tr("جابه‌جایی این حرکت", "Move this exercise")}
        >
          <GripVertical size={15} />
        </button>
      )}
      <span className="truncate">{exerciseDisplayName(item)}</span>
      {isEditing && (
        <button type="button" onClick={onRemove} aria-label={tr("حذف حرکت", "Remove exercise")}>
          <X size={14} />
        </button>
      )}
    </Reorder.Item>
  );
}

// برنامه‌ی دستی/شخصی کاربر — دقیقا هم‌قاعده‌ی نمای «برنامه هفتگی»: یه
// آکاردئون عمودی روزهای هفته، با کلیک روی هر روز باز می‌شه و برنامه‌ی
// همون روز رو نشون می‌ده. هر روز بازشده یه دکمه‌ی «افزودن» داره (پاپ‌آپ
// مستقل انتخاب حرکت) و — وقتی حداقل یک حرکت داره — یه دکمه‌ی «ویرایش» که
// حالت جابه‌جایی/حذف حرکات رو باز/بسته می‌کنه. روزی که هیچ حرکتی نداره
// یعنی روز استراحته؛ نیازی به یه مرحله‌ی جداگانه‌ی «انتخاب روزهای باشگاه»
// نیست — همون روزهایی که حرکت دارن، روزهای باشگاهن.
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
  const [dayItems, setDayItems] = useState<Record<string, string[]>>({});
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [editDay, setEditDay] = useState<string | null>(null);
  const [pickerOpenFor, setPickerOpenFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleDay(day: string) {
    setOpenDay((d) => (d === day ? null : day));
    if (editDay !== day) setEditDay(null);
  }
  function addItem(day: string, formatted: string) {
    setDayItems((m) => ({ ...m, [day]: [...(m[day] || []), formatted] }));
  }
  function removeItem(day: string, idx: number) {
    setDayItems((m) => ({ ...m, [day]: (m[day] || []).filter((_, i) => i !== idx) }));
  }
  function reorderItems(day: string, newOrder: string[]) {
    setDayItems((m) => ({ ...m, [day]: newOrder }));
  }

  function submit() {
    const gymDays = CAL_WEEK_ORDER.map((i) => FA_WEEKDAY[i]).filter((d) => (dayItems[d] || []).length > 0);
    if (gymDays.length === 0) { setError(tr("حداقل برای یک روز حرکت اضافه کن", "Add exercises to at least one day")); return; }
    setError(null);
    const days: ExerciseDay[] = gymDays.map((d) => ({
      day: d,
      focus: computeDayFocus(dayItems[d] || []),
      items: dayItems[d] || [],
    }));
    onSubmit(days);
  }

  const hasAnyItems = Object.values(dayItems).some((arr) => arr.length > 0);

  return (
    <div>
      {(onCancel || onClose) && (
        <div className="exercise-wizard-head">
          {onCancel ? (
            <button type="button" className="exercise-catalog-back-btn" onClick={onCancel} aria-label={tr("بازگشت", "Back")}>
              <ChevronRight size={20} className="dir-flip" />
            </button>
          ) : <span />}
          {onClose && <button type="button" className="nav-close" onClick={onClose} aria-label={tr("بستن", "Close")}>×</button>}
        </div>
      )}

      <label className="exercise-wizard-title">{tr("برنامه تمرینیت رو بساز", "Build your workout plan")}</label>

      <div className="manual-week-accordion">
        {CAL_WEEK_ORDER.map((i) => {
          const day = FA_WEEKDAY[i];
          const items = dayItems[day] || [];
          const isOpen = openDay === day;
          const isEditing = editDay === day;
          return (
            <div key={day} className={`week-day${isOpen ? " open" : ""}`}>
              <div className="week-day-head" onClick={() => toggleDay(day)}>
                <span className="week-day-name">{dayNameDisplay(day)}</span>
                {items.length > 0 && <span className="manual-day-count-badge">{tr(`${items.length} حرکت`, `${items.length} ${items.length === 1 ? "exercise" : "exercises"}`)}</span>}
                <span className="week-day-chevron" />
              </div>
              {/* بدون انیمیشن height:auto — همون دلیل آکاردئون «برنامه هفتگی»:
                  اندازه‌گیری هر فریم روی لیستی که خودش Reorder.Group داره،
                  روی موبایل کاملا لگ می‌داد. */}
              {isOpen && (
                  <div className="week-day-body">
                    <div className="manual-day-panel">
                      <div className="manual-day-panel-head">
                        <div className="manual-day-panel-headinfo">
                          {items.length > 0 && <div className="manual-day-exercises-focus" style={{ margin: 0 }}>{focusDisplay(computeDayFocus(items))}</div>}
                          {items.length > 0 && (
                            <button
                              type="button"
                              className="manual-day-edit-btn"
                              onClick={() => setEditDay(isEditing ? null : day)}
                              aria-label={isEditing ? tr("پایان ویرایش", "Done editing") : tr(`ویرایش روز ${day}`, `Edit ${dayNameDisplay(day)}`)}
                            >
                              <Pencil size={13} />
                              {isEditing ? tr("پایان ویرایش", "Done editing") : tr("ویرایش", "Edit")}
                            </button>
                          )}
                        </div>
                        <button type="button" className="manual-day-add-btn" onClick={() => setPickerOpenFor(day)}>
                          <Plus size={14} />
                          {tr("افزودن", "Add")}
                        </button>
                      </div>

                      {items.length === 0 ? (
                        <div className="item-line empty">{tr("هنوز حرکتی اضافه نکردی — امروز استراحته", "No exercises added yet. This is a rest day")}</div>
                      ) : (
                        <Reorder.Group
                          axis="y"
                          values={items}
                          onReorder={(newOrder) => reorderItems(day, newOrder)}
                          style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}
                        >
                          {items.map((it, ii) => (
                            <ManualExerciseRow key={it} item={it} isEditing={isEditing} onRemove={() => removeItem(day, ii)} />
                          ))}
                        </Reorder.Group>
                      )}
                    </div>
                  </div>
                )}

              {pickerOpenFor === day && (
                <ManualExerciseAddPopup
                  onAdd={(formatted) => addItem(day, formatted)}
                  onClose={() => setPickerOpenFor(null)}
                  excludeNames={new Set(items.map((it) => stripSetSuffix(it)))}
                />
              )}
            </div>
          );
        })}
      </div>

      {error && <div className="field-error-msg" style={{ display: "block", marginTop: 10 }}>{error}</div>}

      <div className="manual-submit-row">
        <button type="button" onClick={submit} disabled={submitting || !hasAnyItems} className="manual-plan-submit-btn">
          {submitting ? <Spinner size={15} /> : tr("ثبت برنامه", "Save plan")}
        </button>
      </div>
    </div>
  );
}
