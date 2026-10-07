"use client";

import { useEffect, useState } from "react";
import { SegmentedTabs } from "./SegmentedTabs";
import { NumberInput } from "./NumberInput";
import { ACTIVITY_LEVELS, calcCalorieTool, type ActivityKey, type CalorieToolResult } from "@/lib/calorieTool";
import { CALORIE_GOAL_LABELS, type CalorieGoal, type Sex } from "@/lib/calorieCalc";
import { fmtNum } from "@/lib/riskCalc";

const LS_KEY = "arion:tool:calorie";

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
          ariaLabel="جنسیت"
          options={[{ value: "male", label: "مرد" }, { value: "female", label: "زن" }]}
        />
        <div className="tl-row">
          <div>
            <label className="exercise-form-label" htmlFor="tl-cal-age">سن (سال)</label>
            <NumberInput id="tl-cal-age" dir="ltr" className="wsearch-newform-name trade-glass-field"
              value={age} onChange={setAge} placeholder="30" />
          </div>
          <div>
            <label className="exercise-form-label" htmlFor="tl-cal-h">قد (سانتی‌متر)</label>
            <NumberInput id="tl-cal-h" decimal dir="ltr" className="wsearch-newform-name trade-glass-field"
              value={height} onChange={setHeight} placeholder="175" />
          </div>
        </div>
        <div>
          <label className="exercise-form-label" htmlFor="tl-cal-w">وزن (کیلوگرم)</label>
          <NumberInput id="tl-cal-w" decimal dir="ltr" className="wsearch-newform-name trade-glass-field"
            value={weight} onChange={setWeight} placeholder="75" />
        </div>
        <div>
          <label className="exercise-form-label" htmlFor="tl-cal-act">سطح فعالیت</label>
          <select id="tl-cal-act" className="wsearch-newform-name trade-glass-field" value={activity}
            onChange={(e) => setActivity(e.target.value as ActivityKey)}>
            {ACTIVITY_LEVELS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
          </select>
        </div>
        <div>
          <span className="exercise-form-label">هدف</span>
          <SegmentedTabs<CalorieGoal>
            active={goal}
            onChange={setGoal}
            ariaLabel="هدف"
            options={[
              { value: "lose", label: "کاهش وزن" },
              { value: "maintain", label: "حفظ وزن" },
              { value: "gain", label: "افزایش وزن" },
            ]}
          />
        </div>
        {res && !res.ok && <div className="trade-form-error" role="alert">{res.error}</div>}
        <button type="submit" className="trade-primary-btn tl-btn">محاسبه</button>
      </div>

      <div className="tl-out" aria-live="polite">
        {!ok && <p className="tl-note">مشخصات را وارد کن و روی محاسبه بزن.</p>}
        {ok && (
          <div className="tl-fade" key={`${ok.target}-${ok.bmr}`}>
            <div className="tl-tiles">
              <div className="trade-stat-tile tl-tile strong wide">
                <div className="tl-tile-label">کالری هدف روزانه ({CALORIE_GOAL_LABELS[goal]})</div>
                <div className="tl-tile-value"><Ltr>{fmtNum(ok.target, 0)}</Ltr> کیلوکالری</div>
              </div>
              <div className="trade-stat-tile tl-tile">
                <div className="tl-tile-label">BMR (متابولیسم پایه)</div>
                <div className="tl-tile-value"><Ltr>{fmtNum(ok.bmr, 0)}</Ltr></div>
              </div>
              <div className="trade-stat-tile tl-tile">
                <div className="tl-tile-label">TDEE (مصرف روزانه)</div>
                <div className="tl-tile-value"><Ltr>{fmtNum(ok.tdee, 0)}</Ltr></div>
              </div>
              <div className="trade-stat-tile tl-tile">
                <div className="tl-tile-label">پروتئین</div>
                <div className="tl-tile-value"><Ltr>{ok.proteinG}</Ltr> گرم</div>
              </div>
              <div className="trade-stat-tile tl-tile">
                <div className="tl-tile-label">چربی</div>
                <div className="tl-tile-value"><Ltr>{ok.fatG}</Ltr> گرم</div>
              </div>
              <div className="trade-stat-tile tl-tile wide">
                <div className="tl-tile-label">کربوهیدرات (باقی‌مانده)</div>
                <div className="tl-tile-value"><Ltr>{ok.carbsG}</Ltr> گرم</div>
              </div>
            </div>
            {ok.floored && (
              <p className="tl-warn" style={{ marginTop: 10 }}>
                عدد هدف به حداقل ایمن رسانده شد تا از نیاز پایه‌ی بدن کمتر نشود.
              </p>
            )}
            <p className="tl-note" style={{ marginTop: 10 }}>
              این اعداد برآورد هستند، نه نسخه‌ی پزشکی. بعد از 2 تا 3 هفته روند وزنت را ببین و عدد را کمی تنظیم کن.
            </p>
          </div>
        )}
      </div>
    </form>
  );
}
