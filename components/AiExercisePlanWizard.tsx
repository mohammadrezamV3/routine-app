"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ChevronRight } from "lucide-react";
import { FA_WEEKDAY, FA_WEEKDAY_SHORT, CAL_WEEK_ORDER } from "@/lib/jalali";
import { LEVEL_LABELS, ExerciseLevel } from "@/lib/exercisePlans";
import { ExercisePlanFormValue, EMPTY_EXERCISE_FORM, ExercisePlan } from "@/lib/exerciseTypes";
import { ExerciseRulesStep, hasSeenExerciseRules, markExerciseRulesSeen } from "./ExerciseRulesStep";
import { focusNextOnEnter } from "@/lib/formNav";
import { getBodyMetrics, saveBodyMetrics } from "@/lib/bodyMetrics";
import { NumberInput } from "./NumberInput";
import { SegmentedTabs } from "./SegmentedTabs";
import { TickButton } from "./TickButton";
import { Spinner } from "./Spinner";
import { TickOption } from "./TickOption";
import { MUSCLE_KEYS, MUSCLE_LABELS, type MuscleKey } from "@/lib/exerciseSplit";

// توضیح هر سطح — زیر انتخاب سطح، تا کاربر بدونه انتخابش چی رو عوض می‌کنه
const LEVEL_HINTS: Record<ExerciseLevel, string> = {
  beginner: "کمتر از 6 ماه تمرین منظم. حرکات پایه و ساده‌تر، حجم کمتر (حدود 10 تا 14 ست برای هر عضله در هفته) و تمرکز روی فرم درست؛ هر ست 2 تا 3 تکرار مونده به ناتوانی تموم می‌شه.",
  intermediate: "6 ماه تا 2 سال تمرین منظم. ترکیب حرکات چندمفصلی و تک‌مفصلی، حجم متوسط (14 تا 20 ست در هفته) و شدت بیشتر؛ 1 تا 2 تکرار مونده به ناتوانی.",
  advanced: "بیش از 2 سال تمرین منظم و تسلط کامل روی فرم. حجم بالا (16 تا 24 ست در هفته)، تنوع حرکات و تکنیک‌های پیشرفته، و شدت نزدیک به ناتوانی.",
};

type SplitReview = { issues: string[]; suggestion: { day: string; muscles: MuscleKey[] }[] | null };

type Step = "hw" | "goal" | "gear" | "days" | "description" | "rules";
const STEP_INDEX: Record<Step, number> = { hw: 0, goal: 1, gear: 2, days: 3, description: 4, rules: 4 };
const STEP_DOTS = [0, 1, 2, 3, 4];
const EQUIPMENT_OPTIONS = ["باشگاه", "خانه"];

// فرم «افزودن برنامه با AI» — چهار مرحله (قد/وزن → هدف → روزها+سطح →
// توضیح آزاد) به‌جای یک فرم تک‌صفحه‌ای. حداقل روزهای لازم برای هر هدف فقط
// توی مرحله‌ی «روزها» چک می‌شه چون تازه اونجاست که هم هدف (از مرحله‌ی قبل) و
// هم سطح (همین مرحله) هر دو مشخصن. توضیح آزاد به سرور فرستاده می‌شه و اول از
// همه AI بررسی می‌کنه این خواسته واقع‌بینانه‌ست یا نه — اگه نه، پیام رد AI
// مثل یه چت‌بات همینجا (زیر همون مرحله‌ی توضیح) نشون داده می‌شه.
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
  const [fieldErrors, setFieldErrors] = useState<{ heightCm?: string; weightKg?: string; trainingMonth?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [review, setReview] = useState<SplitReview | null>(null);
  const stepRef = useRef<HTMLDivElement>(null);

  function patch(p: Partial<ExercisePlanFormValue>) {
    setForm((f) => ({ ...f, ...p }));
  }

  // مثل پاپ‌آپ «تغییر برنامه»ی کالری — اگه قد/وزن قبلا یه‌جای دیگه ثبت
  // شده، همینجا هم از قبل پر می‌شه
  useEffect(() => {
    getBodyMetrics().then(({ data }) => {
      if (!data) return;
      setForm((f) => ({
        ...f,
        heightCm: f.heightCm || (data.heightCm ? String(data.heightCm) : f.heightCm),
        weightKg: f.weightKg || (data.weightKg ? String(data.weightKg) : f.weightKg),
      }));
    });
  }, []);
  function toggleDay(day: string) {
    patch({ gymDays: form.gymDays.includes(day) ? form.gymDays.filter((d) => d !== day) : [...form.gymDays, day] });
  }
  function toggleMuscle(day: string, m: MuscleKey) {
    const cur = form.customSplit[day] ?? [];
    patch({ customSplit: { ...form.customSplit, [day]: cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m] } });
  }
  // روزهای باشگاه به ترتیب تقویم (شنبه اول) — ترتیب نمایش و ارسال تقسیم
  const orderedGymDays = CAL_WEEK_ORDER.map((i) => FA_WEEKDAY[i]).filter((d) => form.gymDays.includes(d));
  const splitPayload = () => orderedGymDays.map((day) => ({ day, muscles: form.customSplit[day] ?? [] }));

  async function submit(chosenSplit?: { day: string; muscles: string[] }[]) {
    if (!form.goal.trim()) return;
    markExerciseRulesSeen();
    setSubmitting(true);
    setRejection(null);
    setError(null);
    // تقسیم دلخواه: اول بررسی مربی؛ اگه ایرادی بود کاربر بین پیشنهاد مربی و
    // تقسیم خودش انتخاب می‌کنه، بعد ساخته می‌شه
    let customSplit: { day: string; muscles: string[] }[] | undefined = chosenSplit;
    if (form.advancedSplit && !chosenSplit) {
      const r = await fetch("/api/exercise/plan/split-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: form.level, gymDays: form.gymDays, split: splitPayload(), goal: form.goal.trim(), hasPhysicalLimitation: form.hasLimitation }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setSubmitting(false); setError(d.error || "بررسی تقسیم ناموفق بود"); setStep("description"); return; }
      if (d.issues?.length) { setSubmitting(false); setReview({ issues: d.issues, suggestion: d.suggestion ?? null }); setStep("description"); return; }
      customSplit = splitPayload();
    }
    setReview(null);
    const res = await fetch("/api/exercise/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level: form.level,
        heightCm: form.heightCm ? +form.heightCm : undefined,
        weightKg: form.weightKg ? +form.weightKg : undefined,
        goal: form.goal.trim(),
        trainingMonth: form.trainingMonth ? +form.trainingMonth : undefined,
        equipment: form.equipment.trim(),
        hasPhysicalLimitation: form.hasLimitation,
        limitationDetails: form.hasLimitation ? form.limitationDetails.trim() || undefined : undefined,
        gymDays: form.gymDays,
        description: form.description.trim() || undefined,
        rulesAccepted: true,
        ...(customSplit ? { customSplit } : {}),
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error || "خطایی پیش آمد"); setStep("description"); return; }
    if (data.feasible === false) { setRejection(data.message); setStep("description"); return; }
    if (form.heightCm && form.weightKg) saveBodyMetrics({ heightCm: +form.heightCm, weightKg: +form.weightKg });
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
      if (!form.goal.trim()) { setError("نوشتن هدف تمرین لازمه"); return; }
      setStep("gear");
    } else if (step === "gear") {
      if (!form.trainingMonth) { setFieldErrors({ trainingMonth: "چندمین ماه تمرینت رو وارد کن" }); return; }
      setFieldErrors({});
      if (!form.equipment) { setError("یکی از گزینه‌ها رو انتخاب کن"); return; }
      setStep("days");
    } else if (step === "days") {
      if (form.gymDays.length === 0) { setError("حداقل یک روز باشگاه رو انتخاب کن"); return; }
      if (form.advancedSplit) {
        const empty = orderedGymDays.filter((d) => !(form.customSplit[d] ?? []).length);
        if (empty.length) { setError(`برای ${empty.join("، ")} حداقل یک عضله انتخاب کن`); return; }
      }
      setReview(null);
      setStep("description");
    } else if (step === "description") {
      if (hasSeenExerciseRules()) submit();
      else setStep("rules");
    }
  }

  function goBack() {
    setError(null);
    if (step === "goal") setStep("hw");
    else if (step === "gear") setStep("goal");
    else if (step === "days") setStep("gear");
    else if (step === "description") { setRejection(null); setReview(null); setStep("days"); }
    else if (step === "rules") setStep("description");
    else if (step === "hw" && onCancel) onCancel();
  }

  if (step === "rules") {
    return <ExerciseRulesStep submitting={submitting} onBack={goBack} onAccept={() => submit()} onClose={onClose} />;
  }

  const showBack = step !== "hw" || !!onCancel;

  return (
    <div key={step} className="auth-step" ref={stepRef} onKeyDown={(e) => focusNextOnEnter(e, stepRef, goNext)}>
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
          <label className="exercise-wizard-title exercise-wizard-title-hw">قد و وزن خود را وارد کنید</label>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label className="exercise-form-label">قد (سانتی‌متر)</label>
              <NumberInput className="wsearch-newform-name" value={form.heightCm} onChange={(v) => patch({ heightCm: v })} />
              {fieldErrors.heightCm && (
                <div className="field-error-msg field-error-msg-inline">
                  <AlertCircle size={12} />
                  {fieldErrors.heightCm}
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <label className="exercise-form-label">وزن (کیلوگرم)</label>
              <NumberInput className="wsearch-newform-name" value={form.weightKg} onChange={(v) => patch({ weightKg: v })} />
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
          <textarea
            dir="rtl"
            className="exercise-desc-textarea"
            rows={3}
            placeholder="با کلمات خودت بنویس — مثلا «می‌خوام حجم عضلات بالاتنه‌م زیاد بشه» یا «می‌خوام چربی کم کنم و فرم بدنم بهتر بشه»"
            value={form.goal}
            onChange={(e) => patch({ goal: e.target.value })}
          />
        </>
      )}

      {step === "gear" && (
        <>
          <label className="exercise-wizard-title">چندمین ماهته که تمرین می‌کنی؟</label>
          <NumberInput className="wsearch-newform-name" placeholder="مثلا 3" value={form.trainingMonth} onChange={(v) => patch({ trainingMonth: v })} />
          {fieldErrors.trainingMonth && (
            <div className="field-error-msg field-error-msg-inline">
              <AlertCircle size={12} />
              {fieldErrors.trainingMonth}
            </div>
          )}

          <label className="exercise-form-label" style={{ marginTop: 14 }}>کجا تمرین می‌کنی؟</label>
          <SegmentedTabs
            className="seg-flush"
            ariaLabel="کجا تمرین می‌کنی؟"
            options={EQUIPMENT_OPTIONS.map((eq) => ({ value: eq, label: eq }))}
            active={form.equipment || null}
            onChange={(eq) => patch({ equipment: eq })}
          />
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

          <label className="exercise-form-label">سطح</label>
          <SegmentedTabs
            className="seg-flush"
            ariaLabel="سطح"
            options={(["beginner", "intermediate", "advanced"] as ExerciseLevel[]).map((l) => ({ value: l, label: LEVEL_LABELS[l] }))}
            active={form.level}
            onChange={(l) => patch({ level: l })}
          />
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={form.level}
              className="ex-level-hint"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
            >
              {LEVEL_HINTS[form.level]}
            </motion.p>
          </AnimatePresence>

          <TickOption className="ex-adv-toggle" checked={form.advancedSplit} onChange={(v) => patch({ advancedSplit: v })}>
            تنظیمات پیشرفته: عضله‌های هر روز رو خودم انتخاب می‌کنم
          </TickOption>
          <AnimatePresence initial={false}>
            {form.advancedSplit && (
              <motion.div
                className="ex-adv"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ height: { duration: 0.28, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.2 } }}
              >
                {orderedGymDays.length === 0 ? (
                  <p className="ex-level-hint">اول روزهای باشگاه رو انتخاب کن.</p>
                ) : (
                  <>
                    <p className="ex-level-hint">برای هر روز عضله‌هایی که می‌خوای تمرین کنی رو بزن. قبل از ساخت، مربی تقسیمت رو بررسی می‌کنه.</p>
                    {orderedGymDays.map((day) => (
                      <div key={day} className="ex-adv-day">
                        <span className="ex-adv-day-name">{day}</span>
                        <div className="ex-muscle-chips" role="group" aria-label={`عضله‌های ${day}`}>
                          {MUSCLE_KEYS.map((m) => {
                            const on = (form.customSplit[day] ?? []).includes(m);
                            return (
                              <span key={m} role="checkbox" aria-checked={on} tabIndex={0} className={`day-pill${on ? " on" : ""}`}
                                onClick={() => toggleMuscle(day, m)}
                                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleMuscle(day, m); } }}>
                                {MUSCLE_LABELS[m]}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {step === "description" && (
        <>
          <label className="exercise-wizard-title">دوست داری برنامه‌ات چطوری باشه؟ (اختیاری)</label>
          <textarea
            dir="rtl"
            className="exercise-desc-textarea"
            rows={4}
            placeholder="مثلا می‌خوام بیشتر روی بالاتنه کار کنم، یا فقط با وزن بدن، یا حرکاتی که صدا کمتری دارن…"
            value={form.description}
            onChange={(e) => patch({ description: e.target.value })}
          />

          <div className="task" style={{ marginTop: 16, cursor: "pointer" }} onClick={() => patch({ hasLimitation: !form.hasLimitation })}>
            <TickButton as="span" className="mt-0.5" size={22} checked={form.hasLimitation} />
            <div className="task-name">محدودیت جسمی دارم</div>
          </div>

          <AnimatePresence initial={false}>
            {form.hasLimitation && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ height: { duration: 0.24, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.18 } }}
                style={{ overflow: "hidden" }}
              >
                <textarea
                  dir="rtl"
                  className="exercise-desc-textarea"
                  style={{ marginTop: 10 }}
                  rows={3}
                  placeholder="محدودیتت رو توضیح بده — مثلا کمردرد، مشکل زانو، یا هر چیزی که مربی/هوش‌مصنوعی موقع انتخاب حرکت باید بدونه"
                  value={form.limitationDetails}
                  onChange={(e) => patch({ limitationDetails: e.target.value })}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {rejection && (
            <div className="exercise-feasibility-reject">
              <div className="exercise-feasibility-reject-badge">هوش مصنوعی</div>
              {rejection}
            </div>
          )}

          <AnimatePresence initial={false}>
            {review && (
              <motion.div
                className="exercise-feasibility-reject ex-review"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.22 }}
              >
                <div className="exercise-feasibility-reject-badge">بررسی مربی</div>
                <ul className="ex-review-issues">
                  {review.issues.map((x) => <li key={x}>{x}</li>)}
                </ul>
                {review.suggestion && (
                  <>
                    <div className="ex-review-sub">پیشنهاد مربی:</div>
                    <ul className="ex-review-split">
                      {review.suggestion.map((d) => (
                        <li key={d.day}><b>{d.day}:</b> {d.muscles.map((m) => MUSCLE_LABELS[m]).join("، ")}</li>
                      ))}
                    </ul>
                  </>
                )}
                <div className="ex-review-actions">
                  {review.suggestion && (
                    <button type="button" className="exercise-wizard-next-btn" disabled={submitting}
                      onClick={() => { const s = review.suggestion!; patch({ customSplit: Object.fromEntries(s.map((d) => [d.day, d.muscles])) }); submit(s); }}>
                      برنامه با پیشنهاد مربی
                    </button>
                  )}
                  <button type="button" className="account-outline-btn" disabled={submitting} onClick={() => submit(splitPayload())}>
                    همون تقسیم خودم
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {error && (
        <div className="field-error-msg field-error-msg-inline" style={{ marginTop: 10 }}>
          <AlertCircle size={12} />
          {error}
        </div>
      )}

      <div className="exercise-wizard-dots">
        {STEP_DOTS.map((i) => (
          <span key={i} className={`exercise-wizard-dot${i === STEP_INDEX[step] ? " on" : ""}`} />
        ))}
      </div>

      <div style={{ display: review ? "none" : "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={goNext} disabled={submitting} className="exercise-wizard-next-btn">
          {submitting ? (
            <Spinner size={15} />
          ) : step === "description" && rejection ? (
            "ویرایش و امتحان دوباره"
          ) : (
            "مرحله بعد"
          )}
        </button>
      </div>
    </div>
  );
}
