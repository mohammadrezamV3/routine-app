"use client";

import { useState } from "react";
import { NumberInput } from "@/components/NumberInput";
import { bmiCategory, bmiCategoryLabel, calcBmi, healthyWeightRange, kgToHealthy, roundBmi } from "@/lib/bmi";
import { fmtNum } from "@/lib/riskCalc";
import { numErr, toolNum } from "@/lib/toolInput";
import { tr } from "@/lib/i18n";

// محور نمودار: BMI از 15 تا 40 (بیرون از این بازه به لبه چسبانده می‌شود)
const SCALE_MIN = 15;
const SCALE_MAX = 40;
const SEGMENTS = [
  { to: 18.5, op: 0.18 },
  { to: 25, op: 0.4 },
  { to: 30, op: 0.6 },
  { to: 35, op: 0.8 },
  { to: 40, op: 1 },
];

export function ToolBmiCalc() {
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [res, setRes] = useState<{ sig: string; h: number; w: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sig = `${height}|${weight}`;

  function calculate() {
    const err = numErr(height, "heightCm") || numErr(weight, "weightKg");
    if (err) { setError(err); setRes(null); return; }
    setError(null);
    setRes({ sig, h: toolNum(height), w: toolNum(weight) });
  }

  const bmi = res ? calcBmi(res.h, res.w) : null;
  const cat = bmi != null ? bmiCategory(bmi) : null;
  const range = res ? healthyWeightRange(res.h) : null;
  const delta = res ? kgToHealthy(res.h, res.w) : null;
  const stale = !!res && res.sig !== sig;
  const pct = bmi != null ? Math.min(1, Math.max(0, (bmi - SCALE_MIN) / (SCALE_MAX - SCALE_MIN))) * 100 : 0;

  return (
    <div>
      <div className="stl-form">
        <div className="stl-field">
          <label className="stl-label" htmlFor="bmi-height">{tr("قد", "Height")}</label>
          <div className="stl-unit">
            <NumberInput id="bmi-height" className="wsearch-newform-name" dir="ltr" limit="heightCm" value={height} onChange={setHeight} placeholder="175" />
            <span>{tr("سانتی‌متر", "cm")}</span>
          </div>
        </div>
        <div className="stl-field">
          <label className="stl-label" htmlFor="bmi-weight">{tr("وزن", "Weight")}</label>
          <div className="stl-unit">
            <NumberInput id="bmi-weight" className="wsearch-newform-name" dir="ltr" limit="weightKg" value={weight} onChange={setWeight} placeholder="70" />
            <span>{tr("کیلوگرم", "kg")}</span>
          </div>
        </div>
      </div>

      <div className="stl-actions">
        <button type="button" className="btn btn-primary btn-lg" onClick={calculate}>{tr("محاسبه", "Calculate")}</button>
      </div>
      {error && <p className="stl-error" role="alert">{error}</p>}

      {res && bmi != null && cat && (
        <div className={`stl-result${stale ? " stale" : ""}`} aria-live="polite">
          <div className="stl-tiles">
            <div className="stl-tile strong">
              <div className="stl-tile-label">{tr("BMI شما", "Your BMI")}</div>
              <div className="stl-tile-value"><span className="stl-ltr">{fmtNum(roundBmi(bmi), 1)}</span></div>
            </div>
            <div className="stl-tile">
              <div className="stl-tile-label">{tr("دسته‌بندی WHO", "WHO category")}</div>
              <div className="stl-tile-value">{bmiCategoryLabel(cat)}</div>
            </div>
          </div>

          <div>
            <div className="stl-scale" dir="ltr" aria-hidden="true" style={{ color: "var(--accent)" }}>
              {SEGMENTS.map((s, i) => {
                const from = i === 0 ? SCALE_MIN : SEGMENTS[i - 1].to;
                return <i key={s.to} style={{ width: `${((s.to - from) / (SCALE_MAX - SCALE_MIN)) * 100}%`, background: "currentColor", opacity: s.op }} />;
              })}
            </div>
            <div className="stl-marker" dir="ltr" aria-hidden="true"><b style={{ insetInlineStart: `${pct}%`, left: `${pct}%` }} /></div>
            <div className="stl-note" dir="ltr" style={{ display: "flex", justifyContent: "space-between", marginBlockStart: 12 }}>
              <span>15</span><span>18.5</span><span>25</span><span>30</span><span>35</span><span>40</span>
            </div>
          </div>

          {range && (
            <div className="stl-tile">
              <div className="stl-tile-label">{tr("محدوده‌ی وزن سالم برای قد شما", "Healthy weight range for your height")}</div>
              <div className="stl-tile-value">
                <span className="stl-ltr">{fmtNum(range.minKg, 1)} – {fmtNum(range.maxKg, 1)}</span> {tr("کیلوگرم", "kg")}
              </div>
              <div className="stl-tile-note">
                {delta === 0 && tr("وزن شما داخل این محدوده است.", "Your weight is inside this range.")}
                {delta != null && delta > 0 && tr(`تا ابتدای محدوده‌ی سالم حدود ${fmtNum(delta, 1)} کیلوگرم فاصله دارید.`, `You are about ${fmtNum(delta, 1)} kg below the start of the healthy range.`)}
                {delta != null && delta < 0 && tr(`تا انتهای محدوده‌ی سالم حدود ${fmtNum(-delta, 1)} کیلوگرم فاصله دارید.`, `You are about ${fmtNum(-delta, 1)} kg above the end of the healthy range.`)}
              </div>
            </div>
          )}
          <p className="stl-note">
            {tr(
              "BMI فقط برای بزرگسالان بالای 18 سال است و چربی و عضله را از هم جدا نمی‌کند؛ برای ورزشکاران عضلانی، زنان باردار و سالمندان به‌تنهایی معیار خوبی نیست.",
              "BMI is meant for adults over 18 and does not separate fat from muscle. It is not a good standalone measure for muscular athletes, pregnant women and older adults.",
            )}
          </p>
        </div>
      )}
    </div>
  );
}
