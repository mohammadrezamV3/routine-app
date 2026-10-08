"use client";

import { useEffect, useState } from "react";
import { NumberInput } from "./NumberInput";
import { BMI_CATEGORIES, bmiScalePercent, calcBmi, type BmiResult } from "@/lib/bmi";
import { fmtNum } from "@/lib/riskCalc";

const LS_KEY = "arion:tool:bmi";
// رنگ‌های مقیاس: فقط نشانگر وضعیت (کم‌وزن تا چاقی)
const SCALE_COLORS = ["#4C8DDB", "#3FAE7A", "#E0A64C", "#E07A4C", "#D9534F", "#B03A3A"];
const SCALE_FLEX = [3.5, 6.5, 5, 5, 5]; // 15..40: 15-18.5، 18.5-25، 25-30، 30-35، 35-40

function Ltr({ children }: { children: React.ReactNode }) {
  return <bdi dir="ltr" className="tl-ltr">{children}</bdi>;
}

export function ToolBmiCalculator() {
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [res, setRes] = useState<BmiResult | null>(null);

  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(LS_KEY) || "{}") || {};
      if (typeof p.height === "string") setHeight(p.height);
      if (typeof p.weight === "string") setWeight(p.weight);
    } catch { /* نادیده */ }
  }, []);

  function calculate(e?: React.FormEvent) {
    e?.preventDefault();
    setRes(calcBmi(Number(height), Number(weight)));
    try { localStorage.setItem(LS_KEY, JSON.stringify({ height, weight })); } catch { /* نادیده */ }
  }

  const ok = res && res.ok ? res : null;
  return (
    <form className="tl-calc" onSubmit={calculate} noValidate>
      <div className="tl-form">
        <div className="tl-row">
          <div>
            <label className="exercise-form-label" htmlFor="tl-bmi-h">قد (سانتی‌متر)</label>
            <NumberInput id="tl-bmi-h" decimal dir="ltr" className="wsearch-newform-name trade-glass-field"
              value={height} onChange={setHeight} placeholder="170" />
          </div>
          <div>
            <label className="exercise-form-label" htmlFor="tl-bmi-w">وزن (کیلوگرم)</label>
            <NumberInput id="tl-bmi-w" decimal dir="ltr" className="wsearch-newform-name trade-glass-field"
              value={weight} onChange={setWeight} placeholder="70" />
          </div>
        </div>
        {res && !res.ok && <div className="trade-form-error" role="alert">{res.error}</div>}
        <button type="submit" className="trade-primary-btn tl-btn">محاسبه</button>
      </div>

      <div className="tl-out" aria-live="polite">
        {!ok && <p className="tl-note">قد و وزن را وارد کن و روی محاسبه بزن.</p>}
        {ok && (
          <div className="tl-fade" key={`${ok.bmi}`}>
            <div className="tl-tiles">
              <div className="trade-stat-tile tl-tile strong">
                <div className="tl-tile-label">BMI شما</div>
                <div className="tl-tile-value"><Ltr>{fmtNum(ok.bmi, 1)}</Ltr></div>
              </div>
              <div className="trade-stat-tile tl-tile">
                <div className="tl-tile-label">وضعیت</div>
                <div className="tl-tile-value">{ok.category.label}</div>
              </div>
              <div className="trade-stat-tile tl-tile wide">
                <div className="tl-tile-label">بازه‌ی وزن طبیعی برای قد شما</div>
                <div className="tl-tile-value"><Ltr>{fmtNum(ok.minKg, 1)}</Ltr> تا <Ltr>{fmtNum(ok.maxKg, 1)}</Ltr> کیلوگرم</div>
              </div>
            </div>

            <div className="tl-scale-wrap">
              <div className="tl-scale" role="img" aria-label={`BMI ${fmtNum(ok.bmi, 1)} در بازه ${ok.category.label}`}>
                {BMI_CATEGORIES.slice(0, 5).map((c, i) => (
                  <span key={c.key} style={{ flex: SCALE_FLEX[i], background: SCALE_COLORS[i] }} />
                ))}
              </div>
              <div className="tl-scale-pin" style={{ left: `${bmiScalePercent(ok.bmi)}%` }} aria-hidden="true">
                <b>{fmtNum(ok.bmi, 1)}</b>
              </div>
            </div>
            <div className="tl-scale-labels"><span>15</span><span>18.5</span><span>25</span><span>30</span><span>35</span><span>40</span></div>

            <p className="tl-note" style={{ marginTop: 10 }}>
              {ok.diffKg === 0
                ? "وزن شما داخل بازه‌ی وزن طبیعی است."
                : ok.diffKg > 0
                  ? <>تا رسیدن به کف بازه‌ی وزن طبیعی حدود <Ltr>{fmtNum(ok.diffKg, 1)}</Ltr> کیلوگرم فاصله هست.</>
                  : <>تا رسیدن به سقف بازه‌ی وزن طبیعی حدود <Ltr>{fmtNum(Math.abs(ok.diffKg), 1)}</Ltr> کیلوگرم فاصله هست.</>}
              {" "}BMI یک شاخص غربالگری است و جایگزین نظر پزشک نیست.
            </p>
          </div>
        )}
      </div>
    </form>
  );
}
