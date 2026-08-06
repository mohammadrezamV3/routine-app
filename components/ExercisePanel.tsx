"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ExercisePlanForm, validateExerciseForm } from "./ExercisePlanForm";
import { ExerciseRulesStep } from "./ExerciseRulesStep";
import { ExerciseDashboard } from "./ExerciseDashboard";
import { ExercisePlan, ExercisePlanFormValue, EMPTY_EXERCISE_FORM } from "@/lib/exerciseTypes";

export function ExercisePanel() {
  const { status } = useSession();
  const [plan, setPlan] = useState<ExercisePlan | null | undefined>(undefined);

  const [onboardForm, setOnboardForm] = useState<ExercisePlanFormValue>(EMPTY_EXERCISE_FORM);
  const [onboardStep, setOnboardStep] = useState<"form" | "rules">("form");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") { setPlan(null); return; }
    fetch("/api/exercise/plan").then((r) => r.json()).then((res) => setPlan(res.plan || null));
  }, [status]);

  async function createPlan(form: ExercisePlanFormValue, onDone: (err: string | null) => void) {
    setSubmitting(true);
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
        trainingPhase: form.trainingPhase,
        rulesAccepted: true,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { onDone(data.error || "خطایی پیش آمد"); return; }
    setPlan(data.plan);
    onDone(null);
  }

  if (status === "unauthenticated") {
    return (
      <div>
        <div className="section-note" style={{ marginTop: 10 }}>برای استفاده از برنامه ورزشی اول وارد حساب بشو.</div>
        <Link href="/auth/login" className="nav-link" style={{ display: "inline-block", marginTop: 10 }}>ورود / ثبت‌نام →</Link>
      </div>
    );
  }

  if (plan === undefined) {
    return <div className="item-line" style={{ marginTop: 10 }}>در حال بارگذاری…</div>;
  }

  // ------------- بدون برنامه فعال: onboarding -------------
  if (!plan) {
    if (onboardStep === "rules") {
      return (
        <ExerciseRulesStep
          submitting={submitting}
          onBack={() => setOnboardStep("form")}
          onAccept={() => createPlan(onboardForm, (err) => { if (err) setError(err); })}
        />
      );
    }
    return (
      <div>
        <div className="section-note" style={{ marginTop: 10 }}>برنامه‌ات رو بر اساس روزهای باشگاه، سطح، هدف و دوره‌ی تمرینی‌ات می‌سازیم</div>
        <ExercisePlanForm value={onboardForm} onChange={(patch) => setOnboardForm((f) => ({ ...f, ...patch }))} />
        {error && <div className="field-error-msg" style={{ display: "block", marginTop: 10 }}>{error}</div>}
        <button
          onClick={() => {
            const err = validateExerciseForm(onboardForm);
            if (err) { setError(err); return; }
            setError(null);
            setOnboardStep("rules");
          }}
          style={{ marginTop: 16, borderColor: "var(--accent)", color: "var(--accent)" }}
        >
          مرحله بعد
        </button>
        <div className="disclaimer-note">
          این برنامه پیشنهاد تمرینی است، نه توصیه‌ی پزشکی؛ اجرای آن بر عهده‌ی کاربر است.
        </div>
      </div>
    );
  }

  // ------------- دارای برنامه فعال -------------
  return (
    <div>
      <ExerciseDashboard plan={plan} onPlanChange={setPlan} />
      <div className="disclaimer-note">
        <span className="disclaimer-warn">توجه: </span>
        این برنامه پیشنهاد تمرینی است، نه توصیه‌ی پزشکی؛ اجرای آن بر عهده‌ی کاربر است.
      </div>
    </div>
  );
}
