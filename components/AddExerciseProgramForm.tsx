"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { PenLine } from "lucide-react";
import { AiSparkleIcon } from "./AiSparkleIcon";
import { AiExercisePlanWizard } from "./AiExercisePlanWizard";
import dynamic from "next/dynamic";

// همون دلیل ExerciseCatalogCard: این فرم هم کل کاتالوگ حرکات رو می‌کشه و
// فقط توی حالت «ساخت دستی» (mode === "manual") رندر می‌شه.
const ManualExercisePlanForm = dynamic(
  () => import("./ManualExercisePlanForm").then((m) => m.ManualExercisePlanForm),
  { ssr: false }
);
import { ExercisePlan } from "@/lib/exerciseTypes";
import type { ExerciseDay } from "@/lib/exercisePlans";
import { focusNextOnEnter } from "@/lib/formNav";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";

type Mode = "choice" | "ai" | "manual";

// «تغییر برنامه‌ی ورزشی» — این فرم فقط از داشبورد باز می‌شه، یعنی کاربر
// از قبل یک برنامه‌ی فعال داره و داره جایگزینش می‌کنه؛ پس تایتلش «تغییر
// برنامه»ست نه «افزودن برنامه» (اولین برنامه از onboarding ExercisePanel
// ساخته می‌شه، نه اینجا). دو مسیر: ساخت خودکار با هوش‌مصنوعی یا
// وارد‌کردن دستی برنامه‌ی شخصی کاربر. هر دو مسیر (ai/manual) خودشون
// هدر بازگشت/بستن خودشون رو رندر می‌کنن، پس هدر ثابت این کامپوننت فقط
// توی صفحه‌ی انتخاب (choice) دیده می‌شه.
export function AddExerciseProgramForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (plan: ExercisePlan) => void;
}) {
  useLockBodyScroll();
  const [mode, setMode] = useState<Mode>("choice");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  async function submitManual(days: ExerciseDay[]) {
    setSubmitting(true);
    const res = await fetch("/api/exercise/plan/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planData: days, rulesAccepted: true }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error || "خطایی پیش آمد"); return; }
    onCreated(data.plan);
  }

  return (
    <>
      <div className="wsearch-newform-overlay strong-blur open" onClick={onClose} />
      <div className="wsearch-newform dash-scope open">
        <div className="relative z-[1] add-program-glass exercise-add-glass" ref={formRef} onKeyDown={(e) => focusNextOnEnter(e, formRef)}>
          {mode === "choice" && (
            <div className="wsearch-newform-head">
              <div className="wsearch-newform-title accent">تغییر برنامه</div>
              <button className="nav-close" onClick={onClose} aria-label="بستن">×</button>
            </div>
          )}

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
                onClick={() => setMode("manual")}
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
            <AiExercisePlanWizard onCreated={onCreated} onCancel={() => setMode("choice")} onClose={onClose} />
          )}

          {mode === "manual" && (
            <ManualExercisePlanForm
              submitting={submitting}
              onSubmit={submitManual}
              onCancel={() => setMode("choice")}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </>
  );
}
