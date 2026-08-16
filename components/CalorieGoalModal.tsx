"use client";

import { useEffect, useState } from "react";
import { Calculator, ChevronRight, PenLine, Plus, X } from "lucide-react";
import { motion } from "framer-motion";
import { faNum } from "@/lib/jalali";
import { CalorieGoal, CALORIE_GOAL_LABELS, Sex, splitMeals, MealBreakdownItem } from "@/lib/calorieCalc";
import { getBodyMetrics, saveBodyMetrics } from "@/lib/bodyMetrics";
import { SegmentedTabs } from "./SegmentedTabs";
import type { Target } from "./CaloriePanel";

type Mode = "choice" | "smart" | "manual";
type MealDraftRow = { key: string; label: string; kcal: string };

// پاپ‌آپِ «تغییر برنامه» — قبلاً کلیک روش کلِ صفحه‌ی کالری رو با فرم عوض
// می‌کرد (حسِ رفتن به یه صفحه‌ی جدید می‌داد)؛ الان یه پاپ‌آپِ واقعیه که روی
// همون داشبورد باز می‌شه و با بستنش دقیقاً برمی‌گردی به همون‌جا. صفحه‌ی
// انتخابِ اولش دقیقاً هم‌قاعده‌ی «افزودن برنامه»ی بدنسازیه (دو دکمه‌ی
// بزرگ کنارِ هم، طبقِ درخواستِ صریحِ کاربر): «هوشمند» (فرمولِ
// Mifflin-St Jeor روی هدف/جنسیت/قد/وزن) یا «دستی» (خودِ کاربر مستقیماً
// کالریِ هرِ وعده رو تعیین می‌کنه — همون ویرایشگرِ ردیفی‌ای که قبلاً توی
// CalorieMealBreakdownCard بود، حالا فقط اینجاست).
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
  const [mode, setMode] = useState<Mode>("choice");

  const [goal, setGoal] = useState<CalorieGoal>(target.goal || "maintain");
  const [mealsPerDay, setMealsPerDay] = useState(target.mealsPerDay || 4);
  const [sex, setSex] = useState<Sex>(target.sex || "male");
  const [age, setAge] = useState("");
  const [goalHeight, setGoalHeight] = useState(target.heightCm ? String(target.heightCm) : "");
  const [goalWeight, setGoalWeight] = useState(target.weightKg ? String(target.weightKg) : "");
  const [goalError, setGoalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // اگه کاربر قبلاً یه‌جای دیگه (مثلاً فرمِ بدنسازی) قد/وزن/سنش رو وارد کرده،
  // همینجا هم از قبل پر می‌شه — فقط وقتی که خودِ این پاپ‌آپ مقدارِ قبلی نداره
  // (یعنی هدفِ کالری هنوز هیچ‌وقت محاسبه نشده)، تا داده‌ی قبلاً محاسبه‌شده رو بی‌جهت عوض نکنه.
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

  function addMealDraftRow() {
    if (mealDraft.length >= 8) return;
    setMealDraft((rows) => [...rows, { key: `meal_${Date.now()}`, label: "", kcal: "" }]);
  }
  function updateMealDraftRow(key: string, patch: Partial<MealDraftRow>) {
    setMealDraft((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function removeMealDraftRow(key: string) {
    setMealDraft((rows) => rows.filter((r) => r.key !== key));
  }
  const mealDraftSum = mealDraft.reduce((s, r) => s + (+r.kcal || 0), 0);

  async function saveSmart() {
    if (!goal) { setGoalError("انتخاب هدف لازمه"); return; }
    if (!sex) { setGoalError("انتخاب جنسیت لازمه (فقط برای محاسبه‌ی دقیق‌تر کالری)"); return; }
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
      body: JSON.stringify({ mealBreakdown: mealDraft.map((r) => ({ key: r.key, label: r.label.trim(), kcal: +r.kcal })) }),
    });
    const data = await res.json();
    setManualSaving(false);
    if (!res.ok) { setManualError(data.error || "خطایی پیش آمد"); return; }
    onSaved(data.target);
    onClose();
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
            <button type="button" className="exercise-catalog-back-btn" onClick={() => setMode("choice")} aria-label="بازگشت">
              <ChevronRight size={20} />
            </button>
            <button type="button" className="nav-close" onClick={onClose} aria-label="بستن">×</button>
          </div>
        )}
        <div className="modal-body">
          {mode === "smart" && <label className="exercise-wizard-title">محاسبه‌ی هوشمند</label>}
          {mode === "manual" && <label className="exercise-wizard-title">وارد کردن دستی</label>}

          {mode === "choice" && (
            <div className="exercise-choice-row">
              <motion.button
                type="button"
                onClick={() => setMode("smart")}
                className="exercise-choice-btn"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
              >
                <Calculator size={26} style={{ color: "var(--accent)" }} />
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

          {mode === "smart" && (
            <>
              <div className="mt-1 text-[11px] text-dash-muted sm:text-[12px]">
                با فرمول استاندارد تغذیه، بر اساس هدف/جنسیت/قد/وزنت کالری روزانه‌ات رو حساب می‌کنیم
              </div>

              <label className="mt-4 block text-[10.5px] font-semibold text-dash-muted sm:text-[11.5px]">هدف</label>
              <div className="mt-1.5">
                <SegmentedTabs
                  active={goal}
                  onChange={setGoal}
                  options={(Object.keys(CALORIE_GOAL_LABELS) as CalorieGoal[]).map((g) => ({ value: g, label: CALORIE_GOAL_LABELS[g] }))}
                />
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

              <label className="mt-3.5 block text-[10.5px] font-semibold text-dash-muted sm:text-[11.5px]">چند وعده در روز می‌خوای؟</label>
              <div className="mt-1.5">
                <SegmentedTabs
                  active={String(mealsPerDay)}
                  onChange={(v) => setMealsPerDay(Number(v))}
                  options={[2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: faNum(n) }))}
                />
              </div>

              <div className="mt-3.5 flex gap-2.5">
                <div className="flex-1">
                  <label className="block text-[10.5px] font-semibold text-dash-muted sm:text-[11.5px]">قد (سانتی‌متر)</label>
                  <input type="number" className="wsearch-newform-name calorie-glass-field mt-1.5 w-full" value={goalHeight} onChange={(e) => setGoalHeight(e.target.value)} />
                </div>
                <div className="flex-1">
                  <label className="block text-[10.5px] font-semibold text-dash-muted sm:text-[11.5px]">وزن (کیلوگرم)</label>
                  <input type="number" className="wsearch-newform-name calorie-glass-field mt-1.5 w-full" value={goalWeight} onChange={(e) => setGoalWeight(e.target.value)} />
                </div>
                {needsAge && (
                  <div className="flex-1">
                    <label className="block text-[10.5px] font-semibold text-dash-muted sm:text-[11.5px]">سن</label>
                    <input type="number" className="wsearch-newform-name calorie-glass-field mt-1.5 w-full" value={age} onChange={(e) => setAge(e.target.value)} />
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
                {saving ? "در حال محاسبه…" : "محاسبه‌ی برنامه کالری"}
              </button>
            </>
          )}

          {mode === "manual" && (
            <>
              <div className="mt-1 text-[11px] text-dash-muted sm:text-[12px]">
                کالریِ هر وعده رو خودت مشخص کن — جمعِ همه‌شون کالری روزانه‌ی هدفت می‌شه
              </div>

              <div className="mt-3.5 flex flex-col gap-2.5">
                {mealDraft.map((row) => (
                  <div key={row.key} className="flex items-center gap-1.5">
                    <input
                      className="wsearch-newform-name calorie-glass-field flex-[2]"
                      placeholder="اسم وعده"
                      value={row.label}
                      onChange={(e) => updateMealDraftRow(row.key, { label: e.target.value })}
                    />
                    <input
                      type="number"
                      className="wsearch-newform-name calorie-glass-field flex-1"
                      placeholder="کالری"
                      value={row.kcal}
                      onChange={(e) => updateMealDraftRow(row.key, { kcal: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => removeMealDraftRow(row.key)}
                      aria-label="حذف وعده"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-transparent text-[13px] text-dash-muted transition hover:text-[#E05252]"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}

                {mealDraft.length < 8 && (
                  <button
                    type="button"
                    onClick={addMealDraftRow}
                    className="flex items-center justify-center gap-1 self-start text-[11px] font-semibold text-dash-green transition hover:brightness-110 sm:text-[12.5px]"
                  >
                    <Plus size={14} />
                    افزودن وعده
                  </button>
                )}

                <div className="text-[10.5px] text-dash-muted sm:text-[11.5px]">جمع: {faNum(mealDraftSum)} کالری</div>
              </div>

              {manualError && <div className="field-error-msg" style={{ display: "block", marginTop: 10 }}>{manualError}</div>}

              <button
                type="button"
                onClick={saveManual}
                disabled={manualSaving}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[13.5px] font-bold disabled:opacity-40"
                style={{ background: "var(--accent)", color: "var(--bg)", boxShadow: "0 8px 22px rgba(var(--accent-rgb),.3)" }}
              >
                {manualSaving ? "در حال ثبت…" : "ثبت برنامه‌ی کالری"}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
