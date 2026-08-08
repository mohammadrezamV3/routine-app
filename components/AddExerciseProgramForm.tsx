"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { PenLine } from "lucide-react";
import { AiSparkleIcon } from "./AiSparkleIcon";
import { AiExercisePlanWizard } from "./AiExercisePlanWizard";
import { ManualExercisePlanForm } from "./ManualExercisePlanForm";
import { ExerciseRulesStep, hasSeenExerciseRules, markExerciseRulesSeen } from "./ExerciseRulesStep";
import { ExercisePlan } from "@/lib/exerciseTypes";
import { ExerciseDay } from "@/lib/exercisePlans";
import { focusNextOnEnter } from "@/lib/formNav";

type Mode = "choice" | "ai" | "manual-form" | "manual-rules";

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
  const [manualDays, setManualDays] = useState<ExerciseDay[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  async function submitManual(days: ExerciseDay[]) {
    markExerciseRulesSeen();
    setSubmitting(true);
    const res = await fetch("/api/exercise/plan/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planData: days, rulesAccepted: true }),
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
                onClick={() => setMode("ai")}
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

          {mode === "ai" && (
            <AiExercisePlanWizard onCreated={onCreated} onCancel={() => setMode("choice")} />
          )}

          {mode === "manual-form" && (
            <ManualExercisePlanForm
              submitting={false}
              onSubmit={(days) => {
                setManualDays(days);
                setError(null);
                if (hasSeenExerciseRules()) submitManual(days);
                else setMode("manual-rules");
              }}
            />
          )}

          {mode === "manual-rules" && (
            <ExerciseRulesStep
              source="manual"
              submitting={submitting}
              onBack={() => setMode("manual-form")}
              onAccept={() => manualDays && submitManual(manualDays)}
            />
          )}
        </div>
      </div>
    </>
  );
}
