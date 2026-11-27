"use client";

import { useState } from "react";
import { NumberInput } from "@/components/NumberInput";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import {
  activityMultiplier, calcBmr, calcDailyTargetKcal, CALORIE_GOAL_LABELS, type CalorieGoal, type Sex,
} from "@/lib/calorieCalc";
import { fmtNum } from "@/lib/riskCalc";
import { numErr, toolNum } from "@/lib/toolInput";
import { tr } from "@/lib/i18n";

type ActivityKey = "0" | "2" | "4" | "6" | "7";

// گرم پروتئین به‌ازای هر کیلوگرم وزن، بازه‌ی رایج توصیه‌های تغذیه‌ی ورزشی
const PROTEIN_PER_KG: Record<CalorieGoal, [number, number]> = {
  lose: [1.6, 2.2],
  maintain: [1.2, 1.8],
  gain: [1.6, 2.2],
};

type Result = {
  sig: string;
  bmr: number;
  tdee: number;
  targets: Record<CalorieGoal, number>;
  goal: CalorieGoal;
  weightKg: number;
};

export function ToolCalorieCalc() {
  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [activity, setActivity] = useState<ActivityKey>("2");
  const [goal, setGoal] = useState<CalorieGoal>("maintain");
  const [res, setRes] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sig = [sex, age, height, weight, activity, goal].join("|");

  function calculate() {
    const err = numErr(age, "ageYears") || numErr(height, "heightCm") || numErr(weight, "weightKg");
    if (err) { setError(err); setRes(null); return; }
    setError(null);
    const a = toolNum(age), h = toolNum(height), w = toolNum(weight);
    const days = Number(activity);
    const bmr = calcBmr(sex, w, h, a);
    const tdee = bmr * activityMultiplier(days);
    const base = { sex, weightKg: w, heightCm: h, age: a, gymDaysPerWeek: days };
    setRes({
      sig, bmr, tdee, goal, weightKg: w,
      targets: {
        lose: calcDailyTargetKcal({ ...base, goal: "lose" }),
        maintain: calcDailyTargetKcal({ ...base, goal: "maintain" }),
        gain: calcDailyTargetKcal({ ...base, goal: "gain" }),
      },
    });
  }

  const stale = !!res && res.sig !== sig;
  const protein = res ? PROTEIN_PER_KG[res.goal] : null;
  const goals: CalorieGoal[] = ["lose", "maintain", "gain"];

  return (
    <div>
      <div className="stl-form">
        <div className="stl-field">
          <span className="stl-label">{tr("جنسیت", "Sex")}</span>
          <SegmentedTabs<Sex>
            ariaLabel={tr("جنسیت", "Sex")}
            active={sex}
            onChange={setSex}
            options={[{ value: "male", label: tr("مرد", "Male") }, { value: "female", label: tr("زن", "Female") }]}
          />
        </div>
        <div className="stl-field">
          <label className="stl-label" htmlFor="cal-age">{tr("سن", "Age")}</label>
          <div className="stl-unit">
            <NumberInput id="cal-age" className="wsearch-newform-name" dir="ltr" limit="ageYears" value={age} onChange={setAge} placeholder="30" />
            <span>{tr("سال", "years")}</span>
          </div>
        </div>
        <div className="stl-field">
          <label className="stl-label" htmlFor="cal-height">{tr("قد", "Height")}</label>
          <div className="stl-unit">
            <NumberInput id="cal-height" className="wsearch-newform-name" dir="ltr" limit="heightCm" value={height} onChange={setHeight} placeholder="175" />
            <span>{tr("سانتی‌متر", "cm")}</span>
          </div>
        </div>
        <div className="stl-field">
          <label className="stl-label" htmlFor="cal-weight">{tr("وزن", "Weight")}</label>
          <div className="stl-unit">
            <NumberInput id="cal-weight" className="wsearch-newform-name" dir="ltr" limit="weightKg" value={weight} onChange={setWeight} placeholder="75" />
            <span>{tr("کیلوگرم", "kg")}</span>
          </div>
        </div>
        <div className="stl-field wide">
          <span className="stl-label">{tr("روز ورزش یا فعالیت سنگین در هفته", "Training or hard activity days per week")}</span>
          <SegmentedTabs<ActivityKey>
            ariaLabel={tr("سطح فعالیت", "Activity level")}
            active={activity}
            onChange={setActivity}
            options={[
              { value: "0", label: tr("بدون ورزش", "None") },
              { value: "2", label: "1-2" },
              { value: "4", label: "3-4" },
              { value: "6", label: "5-6" },
              { value: "7", label: tr("هر روز", "Daily") },
            ]}
          />
          <span className="stl-hint">
            {tr("اگر کارت پشت میز است «بدون ورزش» و اگر کار فیزیکی سنگین داری «هر روز» را انتخاب کن.", "Pick “None” for a desk job and “Daily” for heavy physical work or daily training.")}
          </span>
        </div>
        <div className="stl-field wide">
          <span className="stl-label">{tr("هدف", "Goal")}</span>
          <SegmentedTabs<CalorieGoal>
            ariaLabel={tr("هدف", "Goal")}
            active={goal}
            onChange={setGoal}
            options={goals.map((g) => ({ value: g, label: CALORIE_GOAL_LABELS[g] }))}
          />
        </div>
      </div>

      <div className="stl-actions">
        <button type="button" className="btn btn-primary btn-lg" onClick={calculate}>{tr("محاسبه", "Calculate")}</button>
      </div>
      {error && <p className="stl-error" role="alert">{error}</p>}

      {res && protein && (
        <div className={`stl-result${stale ? " stale" : ""}`} aria-live="polite">
          <div className="stl-tiles three">
            <div className="stl-tile">
              <div className="stl-tile-label">{tr("BMR (متابولیسم پایه)", "BMR (basal metabolism)")}</div>
              <div className="stl-tile-value"><span className="stl-ltr">{fmtNum(Math.round(res.bmr), 0)}</span> <small>{tr("کیلوکالری", "kcal")}</small></div>
            </div>
            <div className="stl-tile">
              <div className="stl-tile-label">{tr("TDEE (کالری نگهداری)", "TDEE (maintenance)")}</div>
              <div className="stl-tile-value"><span className="stl-ltr">{fmtNum(Math.round(res.tdee), 0)}</span> <small>{tr("کیلوکالری", "kcal")}</small></div>
            </div>
            <div className="stl-tile strong">
              <div className="stl-tile-label">{tr("کالری روزانه برای هدف تو", "Daily calories for your goal")}</div>
              <div className="stl-tile-value"><span className="stl-ltr">{fmtNum(res.targets[res.goal], 0)}</span> <small>{tr("کیلوکالری", "kcal")}</small></div>
              <div className="stl-tile-note">{CALORIE_GOAL_LABELS[res.goal]}</div>
            </div>
          </div>

          <div className="stl-tiles three">
            {goals.map((g) => (
              <div key={g} className={`stl-tile${g === res.goal ? " strong" : ""}`}>
                <div className="stl-tile-label">{CALORIE_GOAL_LABELS[g]}</div>
                <div className="stl-tile-value"><span className="stl-ltr">{fmtNum(res.targets[g], 0)}</span></div>
              </div>
            ))}
          </div>

          <div className="stl-tile">
            <div className="stl-tile-label">{tr("پروتئین پیشنهادی در روز", "Suggested daily protein")}</div>
            <div className="stl-tile-value">
              <span className="stl-ltr">{fmtNum(Math.round(res.weightKg * protein[0]), 0)} – {fmtNum(Math.round(res.weightKg * protein[1]), 0)}</span> {tr("گرم", "g")}
            </div>
            <div className="stl-tile-note">
              {tr(`حدود ${fmtNum(protein[0], 1)} تا ${fmtNum(protein[1], 1)} گرم به‌ازای هر کیلوگرم وزن بدن`, `About ${fmtNum(protein[0], 1)} to ${fmtNum(protein[1], 1)} g per kg of body weight`)}
            </div>
          </div>
          <p className="stl-note">
            {tr(
              "این اعداد تخمین‌اند. هدف روزانه هیچ‌وقت زیر BMR و زیر حداقل ایمن رایج (1200 برای زن و 1500 برای مرد) نمی‌رود. بعد از دو تا سه هفته، روند وزنت را ببین و عدد را کمی تنظیم کن.",
              "These numbers are estimates. The daily target never goes below your BMR or the common safe minimum (1200 for women, 1500 for men). After two or three weeks, check your weight trend and adjust slightly.",
            )}
          </p>
        </div>
      )}
    </div>
  );
}
