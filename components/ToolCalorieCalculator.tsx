"use client";

import { useEffect, useState } from "react";
import { SegmentedTabs } from "./SegmentedTabs";
import { NumberInput } from "./NumberInput";
import { ACTIVITY_LEVELS, activityLabel, calcCalorieTool, type ActivityKey, type CalorieToolResult } from "@/lib/calorieTool";
import { CALORIE_GOAL_LABELS, type CalorieGoal, type Sex } from "@/lib/calorieCalc";
import { fmtNum } from "@/lib/riskCalc";
import { tr } from "@/lib/i18n";

const LS_KEY = "arion:tool:calorie";

const goalLabel = (g: CalorieGoal) =>
  g === "lose" ? tr("کاهش وزن", "Weight loss") : g === "gain" ? tr("افزایش وزن", "Weight gain") : tr("حفظ وزن", "Maintain weight");

function Ltr({ children }: { children: React.ReactNode }) {
  return <bdi dir="ltr" className="tl-ltr">{children}</bdi>;
}

export function ToolCalorieCalculator() {
  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [activity, setActivity] = useState<ActivityKey>("light");
  const [goal, setGoal] = useState<CalorieGoal>("maintain");
  const [res, setRes] = useState<CalorieToolResult | null>(null);

  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(LS_KEY) || "{}") || {};
      if (p.sex === "male" || p.sex === "female") setSex(p.sex);
      if (typeof p.age === "string") setAge(p.age);
      if (typeof p.height === "string") setHeight(p.height);
      if (typeof p.weight === "string") setWeight(p.weight);
      if (ACTIVITY_LEVELS.some((a) => a.key === p.activity)) setActivity(p.activity);
      if (p.goal in CALORIE_GOAL_LABELS) setGoal(p.goal);
    } catch { /* نادیده */ }
  }, []);

  function calculate(e?: React.FormEvent) {
    e?.preventDefault();
    setRes(calcCalorieTool({ sex, age: Number(age), heightCm: Number(height), weightKg: Number(weight), activity, goal }));
    try { localStorage.setItem(LS_KEY, JSON.stringify({ sex, age, height, weight, activity, goal })); } catch { /* نادیده */ }
  }

  const ok = res && res.ok ? res : null;
  return (
    <form className="tl-calc" onSubmit={calculate} noValidate>
      <div className="tl-form">
        <SegmentedTabs<Sex>
          active={sex}
          onChange={setSex}
          ariaLabel={tr("جنسیت", "Gender")}
          options={[{ value: "male", label: tr("مرد", "Male") }, { value: "female", label: tr("زن", "Female") }]}
        />
        <div className="tl-row">
          <div>
            <label className="exercise-form-label" htmlFor="tl-cal-age">{tr("سن (سال)", "Age (years)")}</label>
            <NumberInput id="tl-cal-age" dir="ltr" className="wsearch-newform-name trade-glass-field"
              value={age} onChange={setAge} placeholder="30" />
          </div>
          <div>
            <label className="exercise-form-label" htmlFor="tl-cal-h">{tr("قد (سانتی‌متر)", "Height (cm)")}</label>
            <NumberInput id="tl-cal-h" decimal dir="ltr" className="wsearch-newform-name trade-glass-field"
              value={height} onChange={setHeight} placeholder="175" />
          </div>
        </div>
        <div>
          <label className="exercise-form-label" htmlFor="tl-cal-w">{tr("وزن (کیلوگرم)", "Weight (kg)")}</label>
          <NumberInput id="tl-cal-w" decimal dir="ltr" className="wsearch-newform-name trade-glass-field"
            value={weight} onChange={setWeight} placeholder="75" />
        </div>
        <div>
          <label className="exercise-form-label" htmlFor="tl-cal-act">{tr("سطح فعالیت", "Activity level")}</label>
          <select id="tl-cal-act" className="wsearch-newform-name trade-glass-field" value={activity}
            onChange={(e) => setActivity(e.target.value as ActivityKey)}>
            {ACTIVITY_LEVELS.map((a) => <option key={a.key} value={a.key}>{activityLabel(a)}</option>)}
          </select>
        </div>
        <div>
          <span className="exercise-form-label">{tr("هدف", "Goal")}</span>
          <SegmentedTabs<CalorieGoal>
            active={goal}
            onChange={setGoal}
            ariaLabel={tr("هدف", "Goal")}
            options={[
              { value: "lose", label: tr("کاهش وزن", "Lose weight") },
              { value: "maintain", label: tr("حفظ وزن", "Maintain") },
              { value: "gain", label: tr("افزایش وزن", "Gain weight") },
            ]}
          />
        </div>
        {res && !res.ok && <div className="trade-form-error" role="alert">{res.error}</div>}
        <button type="submit" className="trade-primary-btn tl-btn">{tr("محاسبه", "Calculate")}</button>
      </div>

      <div className="tl-out" aria-live="polite">
        {!ok && <p className="tl-note">{tr("مشخصات را وارد کن و روی محاسبه بزن.", "Enter your details, then press Calculate.")}</p>}
        {ok && (
          <div className="tl-fade" key={`${ok.target}-${ok.bmr}`}>
            <div className="tl-tiles">
              <div className="trade-stat-tile tl-tile strong wide">
                <div className="tl-tile-label">{tr("کالری هدف روزانه", "Daily target calories")} ({tr(CALORIE_GOAL_LABELS[goal], goalLabel(goal))})</div>
                <div className="tl-tile-value"><Ltr>{fmtNum(ok.target, 0)}</Ltr> {tr("کیلوکالری", "kcal")}</div>
              </div>
              <div className="trade-stat-tile tl-tile">
                <div className="tl-tile-label">{tr("BMR (متابولیسم پایه)", "BMR (basal metabolism)")}</div>
                <div className="tl-tile-value"><Ltr>{fmtNum(ok.bmr, 0)}</Ltr></div>
              </div>
              <div className="trade-stat-tile tl-tile">
                <div className="tl-tile-label">{tr("TDEE (مصرف روزانه)", "TDEE (daily expenditure)")}</div>
                <div className="tl-tile-value"><Ltr>{fmtNum(ok.tdee, 0)}</Ltr></div>
              </div>
              <div className="trade-stat-tile tl-tile">
                <div className="tl-tile-label">{tr("پروتئین", "Protein")}</div>
                <div className="tl-tile-value"><Ltr>{ok.proteinG}</Ltr> {tr("گرم", "g")}</div>
              </div>
              <div className="trade-stat-tile tl-tile">
                <div className="tl-tile-label">{tr("چربی", "Fat")}</div>
                <div className="tl-tile-value"><Ltr>{ok.fatG}</Ltr> {tr("گرم", "g")}</div>
              </div>
              <div className="trade-stat-tile tl-tile wide">
                <div className="tl-tile-label">{tr("کربوهیدرات (باقی‌مانده)", "Carbohydrates (remainder)")}</div>
                <div className="tl-tile-value"><Ltr>{ok.carbsG}</Ltr> {tr("گرم", "g")}</div>
              </div>
            </div>
            {ok.floored && (
              <p className="tl-warn" style={{ marginTop: 10 }}>
                {tr("عدد هدف به حداقل ایمن رسانده شد تا از نیاز پایه‌ی بدن کمتر نشود.", "The target was raised to the safe minimum so it does not fall below your basal needs.")}
              </p>
            )}
            <p className="tl-note" style={{ marginTop: 10 }}>
              {tr("این اعداد برآورد هستند، نه نسخه‌ی پزشکی. بعد از 2 تا 3 هفته روند وزنت را ببین و عدد را کمی تنظیم کن.", "These numbers are estimates, not medical advice. After 2 to 3 weeks, check your weight trend and adjust the number a little.")}
            </p>
          </div>
        )}
      </div>
    </form>
  );
}
