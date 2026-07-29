"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { FA_WEEKDAY, isoLocal } from "@/lib/jalali";
import { LEVEL_LABELS, GOAL_LABELS } from "@/lib/exercisePlans";
import { ExercisePlanForm, validateExerciseForm } from "./ExercisePlanForm";
import {
  ExercisePlan, ExercisePlanFormValue, EMPTY_EXERCISE_FORM, EligibilityResult, PHASE_LABELS,
} from "@/lib/exerciseTypes";

const todayName = FA_WEEKDAY[new Date().getDay()];
const todayKey = isoLocal(new Date());

const RULES_TEXT = [
  "این برنامه توسط سیستم (به‌کمک هوش مصنوعی) پیشنهاد داده می‌شه و جایگزین نظر پزشک یا مربی حضوری نیست.",
  "اگه بیماری قلبی، مشکل مفصلی/ستون‌فقرات، بارداری، یا هر شرایط پزشکی خاصی داری، قبل از شروع با پزشک مشورت کن.",
  "اگه حین تمرین درد غیرعادی، سرگیجه یا تنگی‌نفس احساس کردی، فوراً متوقف کن.",
  "تکنیک درست حرکات مهم‌تر از وزنه‌ی سنگین‌تره — در صورت نیاز از مربی باشگاهت کمک بگیر.",
  "مسئولیت اجرای این برنامه و هر آسیب احتمالی بر عهده‌ی خودته.",
];

function RulesStep({ onAccept, onBack, submitting }: { onAccept: () => void; onBack: () => void; submitting: boolean }) {
  const [checked, setChecked] = useState(false);
  return (
    <div>
      <div className="domain-sub" style={{ marginTop: 0 }}>قبل از شروع، این چند مورد رو بخون</div>
      <ul className="exercise-rules-list">
        {RULES_TEXT.map((t) => <li key={t}>{t}</li>)}
      </ul>
      <div className="task" style={{ marginTop: 14, cursor: "pointer" }} onClick={() => setChecked((v) => !v)}>
        <div className={`check${checked ? " on" : ""}`}>
          <svg className="c-check" viewBox="0 0 24 24" fill="none"><path d="M2.5 13l5.5 5.5L21.5 4.5" stroke="var(--bg)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <div className="task-name">این قوانین رو خوندم و قبول دارم</div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button onClick={onBack} className="small" style={{ flex: 1 }}>بازگشت</button>
        <button onClick={onAccept} disabled={!checked || submitting} style={{ flex: 2, borderColor: "var(--accent)", color: "var(--accent)" }}>
          {submitting ? "در حال ساخت برنامه…" : "قبول دارم، برنامه رو بساز"}
        </button>
      </div>
    </div>
  );
}

export function ExercisePanel() {
  const { status } = useSession();
  const [plan, setPlan] = useState<ExercisePlan | null | undefined>(undefined);
  const [todayDone, setTodayDone] = useState(false);

  const [onboardForm, setOnboardForm] = useState<ExercisePlanFormValue>(EMPTY_EXERCISE_FORM);
  const [onboardStep, setOnboardStep] = useState<"form" | "rules">("form");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [newProgramOpen, setNewProgramOpen] = useState(false);
  const [eligibility, setEligibility] = useState<EligibilityResult | "loading" | null>(null);
  const [refreshForm, setRefreshForm] = useState<ExercisePlanFormValue>(EMPTY_EXERCISE_FORM);
  const [refreshStep, setRefreshStep] = useState<"form" | "rules">("form");
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const [subbingItem, setSubbingItem] = useState<string | null>(null);
  const [subError, setSubError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") { setPlan(null); return; }
    fetch("/api/exercise/plan").then((r) => r.json()).then((res) => setPlan(res.plan || null));
  }, [status]);

  useEffect(() => {
    if (!plan) return;
    fetch(`/api/exercise/log?planId=${plan.id}&date=${todayKey}`)
      .then((r) => r.json())
      .then((res) => setTodayDone(!!res.completed));
  }, [plan]);

  async function toggleToday() {
    if (!plan) return;
    const next = !todayDone;
    setTodayDone(next);
    await fetch("/api/exercise/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: plan.id, date: todayKey, completed: next }),
    });
  }

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
    setNewProgramOpen(false);
    onDone(null);
  }

  async function openNewProgramFlow() {
    setNewProgramOpen(true);
    setEligibility("loading");
    setRefreshError(null);
    const res = await fetch("/api/exercise/plan/eligibility");
    const data = await res.json();
    const elig: EligibilityResult = data.eligibility;
    setEligibility(elig);
    if (elig.eligible && plan) {
      setRefreshForm({
        level: plan.level,
        heightCm: plan.heightCm ? String(plan.heightCm) : "",
        weightKg: plan.weightKg ? String(plan.weightKg) : "",
        goal: plan.goal,
        hasLimitation: false,
        gymDays: plan.gymDays || [],
        trainingPhase: plan.trainingPhase || "none",
      });
      setRefreshStep("form");
    }
  }

  async function substituteItem(day: string, item: string) {
    if (!plan) return;
    setSubbingItem(item);
    setSubError(null);
    const res = await fetch("/api/exercise/plan/substitute", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: plan.id, day, oldItem: item }),
    });
    const data = await res.json();
    setSubbingItem(null);
    if (res.ok) setPlan(data.plan);
    else setSubError(data.error || "خطا در جایگزینی");
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
        <RulesStep
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
  const todayPlan = plan.planData.find((d) => d.day === todayName);

  function renderItem(day: string, it: string) {
    const isSubbing = subbingItem === it;
    return (
      <li key={it} className="exercise-item exercise-item-row">
        <span>{it}</span>
        <button
          type="button"
          className="exercise-sub-btn"
          disabled={isSubbing}
          onClick={() => substituteItem(day, it)}
          title="این تجهیزات رو ندارم"
        >
          {isSubbing ? "…" : "این تجهیزات رو ندارم"}
        </button>
      </li>
    );
  }

  return (
    <div>
      <div className="section-note" style={{ marginTop: 6 }}>
        سطح: {LEVEL_LABELS[plan.level]}{plan.goal && ` — هدف: ${GOAL_LABELS[plan.goal]}`}
        {plan.trainingPhase && ` — دوره: ${PHASE_LABELS[plan.trainingPhase]}`}
        {!plan.generatedByAi && " — (نسخه‌ی پایه، بدون هوش مصنوعی)"}
      </div>

      {subError && <div className="field-error-msg" style={{ display: "block", marginTop: 6 }}>{subError}</div>}

      {todayPlan ? (
        <div className="glass-box" style={{ marginTop: 14 }}>
          <div className="task" onClick={toggleToday}>
            <div className={`check${todayDone ? " on" : ""}`}>
              <svg className="c-check" viewBox="0 0 24 24" fill="none"><path d="M2.5 13l5.5 5.5L21.5 4.5" stroke="var(--bg)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div className={`task-name${todayDone ? " done" : ""}`}>امروز ({todayName}) — {todayPlan.focus}</div>
          </div>
          <ul className="exercise-item-list">
            {todayPlan.items.map((it) => renderItem(todayPlan.day, it))}
          </ul>
        </div>
      ) : (
        <div className="item-line" style={{ marginTop: 14 }}>امروز ({todayName}) روز استراحته — چیزی برنامه‌ریزی نشده.</div>
      )}

      <div className="tm-extra">
        <div className="domain-sub">برنامه کامل هفته</div>
        <div className="exercise-week-grid">
          {plan.planData.map((d) => (
            <div key={d.day} className={`exercise-day-card${d.day === todayName ? " today" : ""}`}>
              <div className="exercise-day-head">
                <span>{d.day}</span>
                <span className="exercise-day-focus">{d.focus}</span>
              </div>
              <ul className="exercise-item-list">
                {d.items.map((it) => renderItem(d.day, it))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="tm-extra">
        <div className="domain-sub">برنامه جدید</div>
        {!newProgramOpen && (
          <button type="button" onClick={openNewProgramFlow} style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
            درخواست برنامه جدید
          </button>
        )}

        {newProgramOpen && eligibility === "loading" && (
          <div className="item-line">در حال بررسی واجد شرایط بودنت…</div>
        )}

        {newProgramOpen && eligibility && eligibility !== "loading" && !eligibility.eligible && (
          <div className="exercise-ineligible-box">
            {eligibility.reason === "cooldown" ? (
              <div>هنوز {eligibility.daysRemaining} روز مونده تا بتونی برنامه‌ی جدید بگیری — با همین برنامه کار کن، نتیجه‌اش بهتره.</div>
            ) : (
              <div>
                توی این دو هفته فقط {eligibility.completedSessions} از {eligibility.requiredSessions} جلسه‌ی لازم رو رفتی — برای گرفتن برنامه‌ی جدید
                اول باید منظم‌تر همین برنامه رو دنبال کنی.
              </div>
            )}
            <button type="button" className="small" style={{ marginTop: 10 }} onClick={() => setNewProgramOpen(false)}>بستن</button>
          </div>
        )}

        {newProgramOpen && eligibility && eligibility !== "loading" && eligibility.eligible && refreshStep === "form" && (
          <div style={{ marginTop: 10 }}>
            <div className="section-note">قد/وزن جدیدت رو بررسی و در صورت نیاز به‌روز کن</div>
            <ExercisePlanForm value={refreshForm} onChange={(patch) => setRefreshForm((f) => ({ ...f, ...patch }))} />
            {refreshError && <div className="field-error-msg" style={{ display: "block", marginTop: 10 }}>{refreshError}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button onClick={() => setNewProgramOpen(false)} className="small" style={{ flex: 1 }}>انصراف</button>
              <button
                style={{ flex: 2, borderColor: "var(--accent)", color: "var(--accent)" }}
                onClick={() => {
                  const err = validateExerciseForm(refreshForm);
                  if (err) { setRefreshError(err); return; }
                  setRefreshError(null);
                  setRefreshStep("rules");
                }}
              >
                مرحله بعد
              </button>
            </div>
          </div>
        )}

        {newProgramOpen && eligibility && eligibility !== "loading" && eligibility.eligible && refreshStep === "rules" && (
          <RulesStep
            submitting={submitting}
            onBack={() => setRefreshStep("form")}
            onAccept={() => createPlan(refreshForm, (err) => { if (err) setRefreshError(err); })}
          />
        )}
      </div>

      <div className="disclaimer-note">
        این برنامه پیشنهاد تمرینی است، نه توصیه‌ی پزشکی؛ اجرای آن بر عهده‌ی کاربر است.
      </div>
    </div>
  );
}
