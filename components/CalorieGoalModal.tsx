"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronRight, MoreVertical, PenLine, Plus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { faNum } from "@/lib/jalali";
import { CalorieGoal, CALORIE_GOAL_LABELS, Sex, splitMeals, MealBreakdownItem } from "@/lib/calorieCalc";
import { getBodyMetrics, saveBodyMetrics } from "@/lib/bodyMetrics";
import { SegmentedTabs } from "./SegmentedTabs";
import { AiSparkleIcon } from "./AiSparkleIcon";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import type { Target } from "./CaloriePanel";
import { NumberInput } from "./NumberInput";

type Mode = "choice" | "smart" | "manual";
type SmartStep = "goal" | "meals" | "specs";
type MealDraftRow = { key: string; label: string; kcal: string };

// پاپ‌آپ «تغییر برنامه» — قبلا کلیک روش کل صفحه‌ی کالری رو با فرم عوض
// می‌کرد (حس رفتن به یه صفحه‌ی جدید می‌داد)؛ الان یه پاپ‌آپ واقعیه که روی
// همون داشبورد باز می‌شه و با بستنش دقیقا برمی‌گردی به همون‌جا. صفحه‌ی
// انتخاب اولش دقیقا هم‌قاعده‌ی «افزودن برنامه»ی بدنسازیه (دو دکمه‌ی
// بزرگ کنار هم، طبق درخواست صریح کاربر): «هوشمند» (فرمول
// Mifflin-St Jeor روی هدف/جنسیت/قد/وزن، حالا سه‌مرحله‌ای: هدف → تعداد
// وعده → جنسیت‌ومشخصات) یا «دستی» (خود کاربر مستقیما کالری هر وعده رو
// تعیین می‌کنه).
export function CalorieGoalModal({
  target,
  needsAge,
  onClose,
  onSaved,
}: {
  target: Target;
  needsAge: boolean;
  onClose: () => void;
  onSaved: (target: Target) => void;
}) {
  useLockBodyScroll();
  const [mode, setMode] = useState<Mode>("choice");
  const [smartStep, setSmartStep] = useState<SmartStep>("goal");

  const [goal, setGoal] = useState<CalorieGoal>(target.goal || "maintain");
  const [mealsPerDay, setMealsPerDay] = useState(target.mealsPerDay || 4);
  const [sex, setSex] = useState<Sex>(target.sex || "male");
  const [age, setAge] = useState("");
  const [goalHeight, setGoalHeight] = useState(target.heightCm ? String(target.heightCm) : "");
  const [goalWeight, setGoalWeight] = useState(target.weightKg ? String(target.weightKg) : "");
  const [goalError, setGoalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // اگه کاربر قبلا یه‌جای دیگه (مثلا فرم بدنسازی) قد/وزن/سنش رو وارد کرده،
  // همینجا هم از قبل پر می‌شه — فقط وقتی که خود این پاپ‌آپ مقدار قبلی نداره
  // (یعنی هدف کالری هنوز هیچ‌وقت محاسبه نشده)، تا داده‌ی قبلا محاسبه‌شده رو بی‌جهت عوض نکنه.
  useEffect(() => {
    if (goalHeight && goalWeight) return;
    getBodyMetrics().then(({ data }) => {
      if (!data) return;
      if (!goalHeight && data.heightCm) setGoalHeight(String(data.heightCm));
      if (!goalWeight && data.weightKg) setGoalWeight(String(data.weightKg));
      if (!age && data.ageYears) setAge(String(data.ageYears));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const defaultMealDraft = (): MealDraftRow[] => {
    const base: MealBreakdownItem[] = target.mealBreakdown?.length
      ? target.mealBreakdown
      : splitMeals(target.dailyTargetKcal || 2200, target.mealsPerDay || 4);
    return base.map((m) => ({ key: m.key, label: m.label, kcal: String(m.kcal) }));
  };
  const [mealDraft, setMealDraft] = useState<MealDraftRow[]>(defaultMealDraft);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualSubmitted, setManualSubmitted] = useState(false);
  // ردیفی که الان توی حالت ویرایشه (فقط یکی می‌تونه هم‌زمان باز باشه) — یه
  // ردیف تازه‌اضافه‌شده هم مستقیم با همین حالت شروع می‌شه چون بدون نام/کالری معنی نداره
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [menuOpenKey, setMenuOpenKey] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  // هدف درشت‌مغذی‌ها — فقط توی همین مسیر دستی قابل تنظیمه و اختیاریه
  const [proteinTarget, setProteinTarget] = useState(target.proteinTargetG ? String(target.proteinTargetG) : "");
  const [carbsTarget, setCarbsTarget] = useState(target.carbsTargetG ? String(target.carbsTargetG) : "");
  const [fatTarget, setFatTarget] = useState(target.fatTargetG ? String(target.fatTargetG) : "");

  function addMealDraftRow() {
    if (mealDraft.length >= 8) return;
    const key = `meal_${Date.now()}`;
    setMealDraft((rows) => [...rows, { key, label: "", kcal: "" }]);
    setEditingKey(key);
  }
  function updateMealDraftRow(key: string, patch: Partial<MealDraftRow>) {
    setMealDraft((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function removeMealDraftRow(key: string) {
    setMealDraft((rows) => rows.filter((r) => r.key !== key));
    setMenuOpenKey(null);
    if (editingKey === key) setEditingKey(null);
  }
  const mealDraftSum = mealDraft.reduce((s, r) => s + (+r.kcal || 0), 0);

  function goBack() {
    if (mode === "smart") {
      if (smartStep === "specs") { setSmartStep("meals"); return; }
      if (smartStep === "goal") { setMode("choice"); return; }
      setSmartStep("goal");
      return;
    }
    setMode("choice");
  }

  async function saveSmart() {
    if (!goalHeight || !goalWeight) { setGoalError("قد و وزن لازمه"); return; }
    if (needsAge && !age) { setGoalError("چون تاریخ تولدت توی حساب ثبت نشده، سنت رو وارد کن"); return; }

    setGoalError(null);
    setSaving(true);
    const res = await fetch("/api/calorie/target", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal, mealsPerDay, sex,
        ageYears: age ? +age : undefined,
        heightCm: +goalHeight, weightKg: +goalWeight,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setGoalError(data.error || "خطایی پیش آمد"); return; }
    saveBodyMetrics({ heightCm: +goalHeight, weightKg: +goalWeight, ageYears: age ? +age : undefined });
    onSaved(data.target);
    onClose();
  }

  async function saveManual() {
    if (mealDraft.length === 0) { setManualError("حداقل یک وعده لازمه"); return; }
    for (const r of mealDraft) {
      if (!r.label.trim()) { setManualError("اسم همه‌ی وعده‌ها رو وارد کن"); return; }
      if (!r.kcal || +r.kcal <= 0) { setManualError("کالری همه‌ی وعده‌ها باید عدد مثبت باشه"); return; }
    }
    setManualError(null);
    setManualSaving(true);
    const res = await fetch("/api/calorie/target", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mealBreakdown: mealDraft.map((r) => ({ key: r.key, label: r.label.trim(), kcal: +r.kcal })),
        proteinTargetG: proteinTarget.trim() ? +proteinTarget : null,
        carbsTargetG: carbsTarget.trim() ? +carbsTarget : null,
        fatTargetG: fatTarget.trim() ? +fatTarget : null,
      }),
    });
    const data = await res.json();
    setManualSaving(false);
    if (!res.ok) { setManualError(data.error || "خطایی پیش آمد"); return; }
    setManualSubmitted(true);
    onSaved(data.target);
    setTimeout(onClose, 850);
  }

  return (
    <>
      <div className="modal-overlay open" onClick={onClose} />
      <div className="modal-panel liquid-glass-panel dash-scope open">
        {mode === "choice" ? (
          <div className="modal-head">
            <div className="modal-title" style={{ flex: 1 }}>تغییر برنامه کالری</div>
            <button className="nav-close" onClick={onClose} aria-label="بستن">×</button>
          </div>
        ) : (
          <div className="exercise-wizard-head">
            <button type="button" className="exercise-catalog-back-btn" onClick={goBack} aria-label="بازگشت">
              <ChevronRight size={20} />
            </button>
            <button type="button" className="nav-close" onClick={onClose} aria-label="بستن">×</button>
          </div>
        )}
        <div className="modal-body" style={{ position: "relative" }}>
          {mode === "smart" && smartStep === "goal" && <label className="exercise-wizard-title">هدفت چیه؟</label>}
          {mode === "smart" && smartStep === "meals" && <label className="exercise-wizard-title">چند وعده در روز می‌خوای؟</label>}
          {mode === "smart" && smartStep === "specs" && <label className="exercise-wizard-title">جنسیت و مشخصاتت</label>}
          {mode === "manual" && <label className="exercise-wizard-title">وارد کردن دستی</label>}

          {mode === "choice" && (
            <div className="exercise-choice-row">
              <motion.button
                type="button"
                onClick={() => { setMode("smart"); setSmartStep("goal"); }}
                className="exercise-choice-btn"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
              >
                <AiSparkleIcon size={26} still />
                <span>محاسبه‌ی هوشمند</span>
              </motion.button>
              <div className="exercise-choice-divider" />
              <motion.button
                type="button"
                onClick={() => setMode("manual")}
                className="exercise-choice-btn"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
              >
                <PenLine size={22} style={{ color: "var(--accent)" }} />
                <span>وارد کردن دستی</span>
              </motion.button>
            </div>
          )}

          {mode === "smart" && smartStep === "goal" && (
            <>
              <div className="mt-1 text-[11px] text-dash-muted sm:text-[12px]">
                هدفت رو انتخاب کن — کاهش وزن، حفظ وزن یا افزایش وزن/عضله
              </div>
              <div className="mt-3">
                <SegmentedTabs
                  active={goal}
                  onChange={setGoal}
                  options={(Object.keys(CALORIE_GOAL_LABELS) as CalorieGoal[]).map((g) => ({ value: g, label: CALORIE_GOAL_LABELS[g] }))}
                />
              </div>
              <button
                type="button"
                onClick={() => setSmartStep("meals")}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[13.5px] font-bold"
                style={{ background: "var(--accent)", color: "var(--bg)", boxShadow: "0 8px 22px rgba(var(--accent-rgb),.3)" }}
              >
                بعدی
              </button>
            </>
          )}

          {mode === "smart" && smartStep === "meals" && (
            <>
              <div className="mt-1 text-[11px] text-dash-muted sm:text-[12px]">
                کالری روزانه‌ات رو بین چند وعده تقسیم کنیم؟
              </div>
              <div className="mt-3">
                <SegmentedTabs
                  active={String(mealsPerDay)}
                  onChange={(v) => setMealsPerDay(Number(v))}
                  options={[2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: faNum(n) }))}
                />
              </div>
              <button
                type="button"
                onClick={() => setSmartStep("specs")}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[13.5px] font-bold"
                style={{ background: "var(--accent)", color: "var(--bg)", boxShadow: "0 8px 22px rgba(var(--accent-rgb),.3)" }}
              >
                بعدی
              </button>
            </>
          )}

          {mode === "smart" && smartStep === "specs" && (
            <>
              <div className="mt-1 text-[11px] text-dash-muted sm:text-[12px]">
                با فرمول استاندارد تغذیه، بر اساس جنسیت/قد/وزنت کالری روزانه‌ات رو حساب می‌کنیم
              </div>

              <label className="mt-3.5 block text-[10.5px] font-semibold text-dash-muted sm:text-[11.5px]">جنسیت</label>
              <div className="mt-1.5">
                <SegmentedTabs
                  active={sex}
                  onChange={setSex}
                  options={[
                    { value: "male", label: "مرد" },
                    { value: "female", label: "زن" },
                  ]}
                />
              </div>

              <div className="mt-3.5 flex gap-2.5">
                <div className="flex-1">
                  <label className="block text-[10.5px] font-semibold text-dash-muted sm:text-[11.5px]">قد (سانتی‌متر)</label>
                  <NumberInput className="wsearch-newform-name calorie-glass-field mt-1.5 w-full" value={goalHeight} onChange={(v) => setGoalHeight(v)} />
                </div>
                <div className="flex-1">
                  <label className="block text-[10.5px] font-semibold text-dash-muted sm:text-[11.5px]">وزن (کیلوگرم)</label>
                  <NumberInput className="wsearch-newform-name calorie-glass-field mt-1.5 w-full" value={goalWeight} onChange={(v) => setGoalWeight(v)} />
                </div>
                {needsAge && (
                  <div className="flex-1">
                    <label className="block text-[10.5px] font-semibold text-dash-muted sm:text-[11.5px]">سن</label>
                    <NumberInput className="wsearch-newform-name calorie-glass-field mt-1.5 w-full" value={age} onChange={(v) => setAge(v)} />
                  </div>
                )}
              </div>

              {goalError && <div className="field-error-msg" style={{ display: "block", marginTop: 10 }}>{goalError}</div>}

              <button
                type="button"
                onClick={saveSmart}
                disabled={saving}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[13.5px] font-bold disabled:opacity-40"
                style={{ background: "var(--accent)", color: "var(--bg)", boxShadow: "0 8px 22px rgba(var(--accent-rgb),.3)" }}
              >
                {saving && <span className="wsearch-submit-spinner" />}
                {saving ? "در حال محاسبه" : "محاسبه‌ی برنامه کالری"}
              </button>
            </>
          )}

          {mode === "manual" && (
            <motion.div animate={{ filter: manualSubmitted ? "blur(6px)" : "blur(0px)", opacity: manualSubmitted ? 0.35 : 1 }} transition={{ duration: 0.3 }}>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-[11px] text-dash-muted sm:text-[12px]">
                  کالری هر وعده رو خودت مشخص کن
                </span>
                {mealDraft.length < 8 && (
                  <button
                    type="button"
                    onClick={addMealDraftRow}
                    className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-dash-green transition hover:brightness-110 sm:text-[12.5px]"
                  >
                    <Plus size={14} />
                    افزودن وعده
                  </button>
                )}
              </div>

              {/* بدون `layout`/AnimatePresence: هر افزودن/حذف/ویرایش یک ردیف
                  کل لیست رو دوباره اندازه می‌گرفت و انیمیت می‌کرد — همون
                  لگ گزارش‌شده‌ی «افزودن وعده‌ی دستی». */}
              <div className="mt-3 flex flex-col gap-2.5">
                {mealDraft.map((row) => {
                    const isEditing = editingKey === row.key;
                    return (
                      <div key={row.key}>
                        {isEditing ? (
                          <div className="calorie-glass-field manual-meal-row border">
                            <button
                              type="button"
                              onClick={() => setEditingKey(null)}
                              aria-label="تایید"
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-transparent text-dash-green"
                            >
                              <Check size={15} strokeWidth={3} />
                            </button>
                            <input
                              className="manual-meal-row-input flex-1"
                              placeholder="اسم وعده"
                              maxLength={20}
                              value={row.label}
                              onChange={(e) => updateMealDraftRow(row.key, { label: e.target.value })}
                            />
                            <span className="manual-meal-row-divider" />
                            <NumberInput
                              className="manual-meal-row-input manual-meal-kcal-input mono"
                              placeholder="۰"
                              value={row.kcal}
                              onChange={(v) => updateMealDraftRow(row.key, { kcal: v })}
                            />
                          </div>
                        ) : (
                          <div className="calorie-glass-field manual-meal-row manual-meal-row-view border">
                            <div className="relative shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  if (menuOpenKey === row.key) { setMenuOpenKey(null); return; }
                                  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                  setMenuPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
                                  setMenuOpenKey(row.key);
                                }}
                                aria-label="گزینه‌های وعده"
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-transparent text-dash-muted transition hover:text-dash-text"
                              >
                                <MoreVertical size={15} />
                              </button>
                              {/* منو با پورتال به body می‌ره: داخل .modal-body
                                  (که خودش اسکرول‌شونده و بلوردار و یه
                                  stacking-context جداست) زیر ردیف‌های بعدی
                                  می‌افتاد و دیده نمی‌شد. */}
                              {menuOpenKey === row.key && menuPos && createPortal(
                                <>
                                  <div className="fixed inset-0 z-[79]" onClick={() => setMenuOpenKey(null)} />
                                  <div className="manual-meal-row-menu" style={{ top: menuPos.top, right: menuPos.right }}>
                                    <button type="button" onClick={() => { setEditingKey(row.key); setMenuOpenKey(null); }}>
                                      ویرایش
                                    </button>
                                    <button type="button" className="manual-meal-row-menu-danger" onClick={() => removeMealDraftRow(row.key)}>
                                      حذف
                                    </button>
                                  </div>
                                </>,
                                document.body
                              )}
                            </div>
                            <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-dash-text">
                              {row.label || "بدون اسم"}
                            </span>
                            <span className="manual-meal-row-divider" />
                            <span className="mono shrink-0 text-[12.5px] font-bold text-dash-text">
                              {row.kcal ? faNum(row.kcal) : "۰"} <span className="text-[10px] font-semibold text-dash-muted">کالری</span>
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                {/* «جمع کالری روزانه» بدون اعراب اضافه، و با چیدمانی که
                    عدد از متن سرریز نمی‌کنه (قبلا روی عددهای بلند بیرون می‌زد). */}
                <div className="manual-meal-total">
                  <span className="text-[11.5px] font-semibold text-dash-muted sm:text-[12.5px]">جمع کالری روزانه</span>
                  <span className="mono manual-meal-total-num">
                    {faNum(mealDraftSum)}<span className="manual-meal-total-unit">کالری</span>
                  </span>
                </div>
              </div>

              {/* هدف درشت‌مغذی‌ها — اختیاری. هر کدوم خالی بمونه یعنی هدفی
                  براش تعیین نشده و کارت درشت‌مغذی‌ها فقط مصرف رو نشون می‌ده. */}
              <label className="calorie-field-label" style={{ marginTop: 16 }}>هدف درشت‌مغذی‌ها (اختیاری — گرم در روز)</label>
              <div className="flex gap-2">
                <NumberInput className="wsearch-newform-name calorie-glass-field flex-1" placeholder="پروتئین" value={proteinTarget} onChange={setProteinTarget} />
                <NumberInput className="wsearch-newform-name calorie-glass-field flex-1" placeholder="کربوهیدرات" value={carbsTarget} onChange={setCarbsTarget} />
                <NumberInput className="wsearch-newform-name calorie-glass-field flex-1" placeholder="چربی" value={fatTarget} onChange={setFatTarget} />
              </div>

              {manualError && <div className="field-error-msg" style={{ display: "block", marginTop: 10 }}>{manualError}</div>}

              <button
                type="button"
                onClick={saveManual}
                disabled={manualSaving}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[13.5px] font-bold disabled:opacity-40"
                style={{ background: "var(--accent)", color: "var(--bg)", boxShadow: "0 8px 22px rgba(var(--accent-rgb),.3)" }}
              >
                {manualSaving && <span className="wsearch-submit-spinner" />}
                {manualSaving ? "در حال ثبت" : "ثبت برنامه کالری"}
              </button>
            </motion.div>
          )}

          <AnimatePresence>
            {manualSubmitted && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2.5"
              >
                <motion.div
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 20 }}
                  className="flex h-14 w-14 items-center justify-center rounded-full"
                  style={{ background: "var(--accent)", boxShadow: "0 0 24px rgba(var(--accent-rgb),.5)" }}
                >
                  <Check className="h-7 w-7" style={{ color: "var(--bg)" }} strokeWidth={3} />
                </motion.div>
                <div className="text-[12.5px] font-bold text-dash-text sm:text-[13.5px]">با موفقیت ثبت شد</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
