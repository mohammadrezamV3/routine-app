"use client";

import { useState } from "react";
import { faNum } from "@/lib/jalali";
import { CalorieGoal, CALORIE_GOAL_LABELS, Sex } from "@/lib/calorieCalc";
import { SegmentedTabs } from "./SegmentedTabs";
import type { Target } from "./CaloriePanel";

// پاپ‌آپِ «تغییر برنامه» — قبلاً کلیک روش کلِ صفحه‌ی کالری رو با فرم عوض
// می‌کرد (حسِ رفتن به یه صفحه‌ی جدید می‌داد)؛ الان یه پاپ‌آپِ واقعیه که روی
// همون داشبورد باز می‌شه و با بستنش دقیقاً برمی‌گردی به همون‌جا.
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
  const [goal, setGoal] = useState<CalorieGoal>(target.goal || "maintain");
  const [mealsPerDay, setMealsPerDay] = useState(target.mealsPerDay || 4);
  const [sex, setSex] = useState<Sex>(target.sex || "male");
  const [age, setAge] = useState("");
  const [goalHeight, setGoalHeight] = useState(target.heightCm ? String(target.heightCm) : "");
  const [goalWeight, setGoalWeight] = useState(target.weightKg ? String(target.weightKg) : "");
  const [goalError, setGoalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
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
    onSaved(data.target);
    onClose();
  }

  return (
    <>
      <div className="modal-overlay open" onClick={onClose} />
      <div className="modal-panel liquid-glass-panel dash-scope open">
        <div className="modal-head">
          <div className="modal-title">تغییر برنامه کالری</div>
          <button className="nav-close" onClick={onClose} aria-label="بستن">×</button>
        </div>
        <div className="modal-body">
          <div className="text-[11px] text-dash-muted sm:text-[12px]">برنامه کالری‌ات رو دوباره حساب کن</div>

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
              <input type="number" className="wsearch-newform-name mt-1.5 w-full" value={goalHeight} onChange={(e) => setGoalHeight(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="block text-[10.5px] font-semibold text-dash-muted sm:text-[11.5px]">وزن (کیلوگرم)</label>
              <input type="number" className="wsearch-newform-name mt-1.5 w-full" value={goalWeight} onChange={(e) => setGoalWeight(e.target.value)} />
            </div>
            {needsAge && (
              <div className="flex-1">
                <label className="block text-[10.5px] font-semibold text-dash-muted sm:text-[11.5px]">سن</label>
                <input type="number" className="wsearch-newform-name mt-1.5 w-full" value={age} onChange={(e) => setAge(e.target.value)} />
              </div>
            )}
          </div>

          {goalError && <div className="field-error-msg" style={{ display: "block", marginTop: 10 }}>{goalError}</div>}

          <div className="mt-4 flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-2xl border py-2.5 text-[12px] font-semibold text-dash-muted" style={{ borderColor: "var(--line)" }}>
              انصراف
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="flex-[2] rounded-2xl border py-2.5 text-[12.5px] font-bold disabled:opacity-40"
              style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
            >
              {saving ? "در حال محاسبه…" : "محاسبه‌ی برنامه کالری"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
