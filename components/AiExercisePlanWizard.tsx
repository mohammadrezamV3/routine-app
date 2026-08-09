"use client";

import { useState } from "react";
import { AlertCircle, ChevronRight } from "lucide-react";
import { FA_WEEKDAY, FA_WEEKDAY_SHORT, CAL_WEEK_ORDER } from "@/lib/jalali";
import {
  LEVEL_LABELS, GOAL_OPTION_LABELS, GOAL_FALLBACK_MAP, getRequiredDaysCount,
  ExerciseLevel, ExerciseGoalOption,
} from "@/lib/exercisePlans";
import { ExercisePlanFormValue, EMPTY_EXERCISE_FORM, ExercisePlan } from "@/lib/exerciseTypes";
import { ExerciseRulesStep, hasSeenExerciseRules, markExerciseRulesSeen } from "./ExerciseRulesStep";

type Step = "hw" | "goal" | "days" | "description" | "rules";
const STEP_INDEX: Record<Step, number> = { hw: 0, goal: 1, days: 2, description: 3, rules: 3 };

// فرمِ «افزودن برنامه با AI» — چهار مرحله (قد/وزن → هدف → روزها+سطح →
// توضیح آزاد) به‌جای یک فرمِ تک‌صفحه‌ای. حداقلِ روزهای لازم برای هر هدف فقط
// توی مرحله‌ی «روزها» چک می‌شه چون تازه اونجاست که هم هدف (از مرحله‌ی قبل) و
// هم سطح (همین مرحله) هر دو مشخصن. توضیحِ آزاد به سرور فرستاده می‌شه و اول از
// همه AI بررسی می‌کنه این خواسته واقع‌بینانه‌ست یا نه — اگه نه، پیامِ ردِ AI
// مثلِ یه چت‌بات همینجا (زیرِ همون مرحله‌ی توضیح) نشون داده می‌شه.
export function AiExercisePlanWizard({
  onCreated,
  onCancel,
  onClose,
}: {
  onCreated: (plan: ExercisePlan) => void;
  onCancel?: () => void;
  onClose?: () => void;
}) {
  const [step, setStep] = useState<Step>("hw");
  const [form, setForm] = useState<ExercisePlanFormValue>(EMPTY_EXERCISE_FORM);
  const [fieldErrors, setFieldErrors] = useState<{ heightCm?: string; weightKg?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function patch(p: Partial<ExercisePlanFormValue>) {
    setForm((f) => ({ ...f, ...p }));
  }
  function toggleDay(day: string) {
    patch({ gymDays: form.gymDays.includes(day) ? form.gymDays.filter((d) => d !== day) : [...form.gymDays, day] });
  }

  const requiredDays = form.goal ? getRequiredDaysCount(GOAL_FALLBACK_MAP[form.goal], form.level) : null;

  async function submit() {
    if (!form.goal) return;
    markExerciseRulesSeen();
    setSubmitting(true);
    setRejection(null);
    setError(null);
    const res = await fetch("/api/exercise/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level: form.level,
        heightCm: form.heightCm ? +form.heightCm : undefined,
        weightKg: form.weightKg ? +form.weightKg : undefined,
        goal: form.goal,
        hasPhysicalLimitation: form.hasLimitation,
        gymDays: form.gymDays,
        description: form.description.trim() || undefined,
        rulesAccepted: true,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error || "خطایی پیش آمد"); setStep("description"); return; }
    if (data.feasible === false) { setRejection(data.message); setStep("description"); return; }
    onCreated(data.plan);
  }

  function goNext() {
    setError(null);
    if (step === "hw") {
      const fe: typeof fieldErrors = {};
      if (!form.heightCm) fe.heightCm = "قد رو وارد کن";
      if (!form.weightKg) fe.weightKg = "وزن رو وارد کن";
      if (fe.heightCm || fe.weightKg) { setFieldErrors(fe); return; }
      setFieldErrors({});
      setStep("goal");
    } else if (step === "goal") {
      if (!form.goal) { setError("انتخاب هدف تمرین لازمه"); return; }
      setStep("days");
    } else if (step === "days") {
      if (form.gymDays.length === 0) { setError("حداقل یک روز باشگاه رو انتخاب کن"); return; }
      if (form.goal) {
        const req = getRequiredDaysCount(GOAL_FALLBACK_MAP[form.goal], form.level);
        if (form.gymDays.length < req) { setError(`این هدف حداقل ${req} روز در هفته لازم داره`); return; }
      }
      setStep("description");
    } else if (step === "description") {
      if (hasSeenExerciseRules()) submit();
      else setStep("rules");
    }
  }

  function goBack() {
    setError(null);
    if (step === "goal") setStep("hw");
    else if (step === "days") setStep("goal");
    else if (step === "description") { setRejection(null); setStep("days"); }
    else if (step === "rules") setStep("description");
    else if (step === "hw" && onCancel) onCancel();
  }

  if (step === "rules") {
    return <ExerciseRulesStep submitting={submitting} onBack={goBack} onAccept={submit} onClose={onClose} />;
  }

  const showBack = step !== "hw" || !!onCancel;

  return (
    <div key={step} className="auth-step">
      {(showBack || onClose) && (
        <div className="exercise-wizard-head">
          {showBack ? (
            <button type="button" className="exercise-catalog-back-btn" onClick={goBack} aria-label="بازگشت">
              <ChevronRight size={20} />
            </button>
          ) : <span />}
          {onClose && <button type="button" className="nav-close" onClick={onClose} aria-label="بستن">×</button>}
        </div>
      )}

      {step === "hw" && (
        <>
          <label className="exercise-wizard-title">قد و وزن خود را وارد کنید</label>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label className="exercise-form-label">قد (سانتی‌متر)</label>
              <input type="number" className="wsearch-newform-name" value={form.heightCm} onChange={(e) => patch({ heightCm: e.target.value })} />
              {fieldErrors.heightCm && (
                <div className="field-error-msg field-error-msg-inline">
                  <AlertCircle size={12} />
                  {fieldErrors.heightCm}
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <label className="exercise-form-label">وزن (کیلوگرم)</label>
              <input type="number" className="wsearch-newform-name" value={form.weightKg} onChange={(e) => patch({ weightKg: e.target.value })} />
              {fieldErrors.weightKg && (
                <div className="field-error-msg field-error-msg-inline">
                  <AlertCircle size={12} />
                  {fieldErrors.weightKg}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {step === "goal" && (
        <>
          <label className="exercise-wizard-title">هدف تمرینت چیه؟</label>
          <div className="day-picker" style={{ flexWrap: "wrap" }}>
            {(Object.keys(GOAL_OPTION_LABELS) as ExerciseGoalOption[]).map((g) => (
              <span
                key={g}
                className={`day-pill${form.goal === g ? " on" : ""}`}
                onClick={() => patch({ goal: g })}
                style={{ flex: "1 1 calc(50% - 4px)" }}
              >
                {GOAL_OPTION_LABELS[g]}
              </span>
            ))}
          </div>
        </>
      )}

      {step === "days" && (
        <>
          <label className="exercise-wizard-title">کدوم روزها میخوای بری باشگاه؟</label>
          <div className="exercise-day-select-row">
            {CAL_WEEK_ORDER.map((i) => (
              <span
                key={FA_WEEKDAY[i]}
                className={`day-pill${form.gymDays.includes(FA_WEEKDAY[i]) ? " on" : ""}`}
                onClick={() => toggleDay(FA_WEEKDAY[i])}
              >
                {FA_WEEKDAY_SHORT[i]}
              </span>
            ))}
          </div>

          <label className="exercise-form-label">
            سطح
            {requiredDays !== null && (
              <span style={{ color: "var(--muted2)", fontWeight: 400 }}> (این هدف حداقل {requiredDays} روز لازم داره)</span>
            )}
          </label>
          <div className="day-picker">
            {(["beginner", "intermediate", "advanced"] as ExerciseLevel[]).map((l) => (
              <span key={l} className={`day-pill${form.level === l ? " on" : ""}`} onClick={() => patch({ level: l })}>
                {LEVEL_LABELS[l]}
              </span>
            ))}
          </div>
        </>
      )}

      {step === "description" && (
        <>
          <label className="exercise-wizard-title">دوست داری برنامه‌ت چطوری باشه؟ (اختیاری)</label>
          <textarea
            dir="rtl"
            className="exercise-desc-textarea"
            rows={4}
            placeholder="مثلاً می‌خوام بیشتر روی بالاتنه کار کنم، یا فقط با وزن بدن، یا حرکاتی که صدا کمتری دارن…"
            value={form.description}
            onChange={(e) => patch({ description: e.target.value })}
          />

          <div className="task" style={{ marginTop: 16, cursor: "pointer" }} onClick={() => patch({ hasLimitation: !form.hasLimitation })}>
            <div className={`check${form.hasLimitation ? " on" : ""}`}>
              <svg className="c-check" viewBox="0 0 24 24" fill="none"><path d="M2.5 13l5.5 5.5L21.5 4.5" stroke="var(--bg)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div className="task-name">محدودیت جسمی دارم (بدون جزئیات، فقط برای احتیاط بیشتر)</div>
          </div>

          {rejection && (
            <div className="exercise-feasibility-reject">
              <div className="exercise-feasibility-reject-badge">هوش مصنوعی</div>
              {rejection}
            </div>
          )}
        </>
      )}

      {error && (
        <div className="field-error-msg field-error-msg-inline" style={{ marginTop: 10 }}>
          <AlertCircle size={12} />
          {error}
        </div>
      )}

      <div className="exercise-wizard-dots">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`exercise-wizard-dot${i === STEP_INDEX[step] ? " on" : ""}`} />
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={goNext} disabled={submitting} className="exercise-wizard-next-btn">
          {step === "description" ? (submitting ? "در حال ساخت برنامه…" : rejection ? "ویرایش و امتحان دوباره" : "مرحله بعد") : "مرحله بعد"}
        </button>
      </div>
    </div>
  );
}
