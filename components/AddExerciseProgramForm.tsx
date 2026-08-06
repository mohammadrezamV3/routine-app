"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { PenLine } from "lucide-react";
import { AiSparkleIcon } from "./AiSparkleIcon";
import { ExercisePlanForm, validateExerciseForm } from "./ExercisePlanForm";
import { ManualExercisePlanForm } from "./ManualExercisePlanForm";
import { ExerciseRulesStep } from "./ExerciseRulesStep";
import { ExercisePlanFormValue, EMPTY_EXERCISE_FORM, ExercisePlan } from "@/lib/exerciseTypes";
import { ExerciseDay } from "@/lib/exercisePlans";
import { focusNextOnEnter } from "@/lib/formNav";

type Mode = "choice" | "ai-form" | "ai-rules" | "manual-form" | "manual-rules";

// «افزودن برنامه‌ی ورزشی جدید» — طبقِ درخواست، دو مسیر داره: ساختِ خودکار
// با هوش‌مصنوعی (سمتِ راست، فرمِ سطح/هدف/روزهای باشگاه که از قبل بود) یا
// وارد‌کردنِ دستیِ برنامه‌ی شخصیِ کاربر (سمتِ چپ). همون قوانین/دیسکلایمر
// قبل از فعال‌شدن، برای هر دو مسیر لازمه.
export function AddExerciseProgramForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (plan: ExercisePlan) => void;
}) {
  const [mode, setMode] = useState<Mode>("choice");
  const [aiForm, setAiForm] = useState<ExercisePlanFormValue>(EMPTY_EXERCISE_FORM);
  const [manualDays, setManualDays] = useState<ExerciseDay[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  async function submitAi() {
    setSubmitting(true);
    const res = await fetch("/api/exercise/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level: aiForm.level,
        heightCm: aiForm.heightCm ? +aiForm.heightCm : undefined,
        weightKg: aiForm.weightKg ? +aiForm.weightKg : undefined,
        goal: aiForm.goal,
        hasPhysicalLimitation: aiForm.hasLimitation,
        gymDays: aiForm.gymDays,
        trainingPhase: aiForm.trainingPhase,
        rulesAccepted: true,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error || "خطایی پیش آمد"); setMode("ai-form"); return; }
    onCreated(data.plan);
  }

  async function submitManual() {
    if (!manualDays) return;
    setSubmitting(true);
    const res = await fetch("/api/exercise/plan/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planData: manualDays, rulesAccepted: true }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error || "خطایی پیش آمد"); setMode("manual-form"); return; }
    onCreated(data.plan);
  }

  return (
    <>
      <div className="wsearch-newform-overlay strong-blur open" onClick={onClose} />
      <div className="wsearch-newform dash-scope open">
        <div className="relative z-[1] add-program-glass exercise-add-glass" ref={formRef} onKeyDown={(e) => focusNextOnEnter(e, formRef)}>
          <div className="wsearch-newform-head">
            <div className="wsearch-newform-title accent">افزودن برنامه</div>
            <button className="nav-close" onClick={onClose} aria-label="بستن">×</button>
          </div>

          {error && <div className="field-error-msg" style={{ display: "block", marginBottom: 10 }}>{error}</div>}

          {mode === "choice" && (
            <div className="exercise-choice-row">
              <motion.button
                type="button"
                onClick={() => setMode("ai-form")}
                className="exercise-choice-btn"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
              >
                <AiSparkleIcon size={26} />
                <span>ساخت با هوش مصنوعی</span>
              </motion.button>
              <div className="exercise-choice-divider" />
              <motion.button
                type="button"
                onClick={() => setMode("manual-form")}
                className="exercise-choice-btn"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
              >
                <PenLine size={22} />
                <span>وارد کردن برنامه‌ی خودم</span>
              </motion.button>
            </div>
          )}

          {mode === "ai-form" && (
            <div>
              <ExercisePlanForm value={aiForm} onChange={(patch) => setAiForm((f) => ({ ...f, ...patch }))} />
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button onClick={() => setMode("choice")} className="small" style={{ flex: 1 }}>بازگشت</button>
                <button
                  style={{ flex: 2, borderColor: "var(--accent)", color: "var(--accent)" }}
                  onClick={() => {
                    const err = validateExerciseForm(aiForm);
                    if (err) { setError(err); return; }
                    setError(null);
                    setMode("ai-rules");
                  }}
                >
                  مرحله بعد
                </button>
              </div>
            </div>
          )}

          {mode === "ai-rules" && (
            <ExerciseRulesStep submitting={submitting} onBack={() => setMode("ai-form")} onAccept={submitAi} />
          )}

          {mode === "manual-form" && (
            <ManualExercisePlanForm
              submitting={false}
              onSubmit={(days) => { setManualDays(days); setError(null); setMode("manual-rules"); }}
            />
          )}

          {mode === "manual-rules" && (
            <ExerciseRulesStep source="manual" submitting={submitting} onBack={() => setMode("manual-form")} onAccept={submitManual} />
          )}
        </div>
      </div>
    </>
  );
}
