"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { FA_WEEKDAY, isoLocal } from "@/lib/jalali";
import { EXERCISE_TEMPLATES, LEVEL_LABELS, ExerciseDay } from "@/lib/exercisePlans";

const todayName = FA_WEEKDAY[new Date().getDay()];
const todayKey = isoLocal(new Date());

type Plan = {
  id: string;
  level: "beginner" | "intermediate" | "advanced";
  heightCm: number | null;
  weightKg: number | null;
  goal: string | null;
  planData: ExerciseDay[];
};

export function ExercisePanel() {
  const { status } = useSession();
  const [plan, setPlan] = useState<Plan | null | undefined>(undefined);
  const [todayDone, setTodayDone] = useState(false);

  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [goal, setGoal] = useState("");
  const [hasLimitation, setHasLimitation] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  async function submitPlan() {
    if (!accepted) { setError("برای ادامه باید سلب مسئولیت رو تایید کنی"); return; }
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/exercise/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level,
        heightCm: heightCm ? +heightCm : undefined,
        weightKg: weightKg ? +weightKg : undefined,
        goal: goal || undefined,
        hasPhysicalLimitation: hasLimitation,
        disclaimerAccepted: accepted,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error || "خطایی پیش آمد"); return; }
    setPlan(data.plan);
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

  if (!plan) {
    return (
      <div>
        <div className="section-note" style={{ marginTop: 10 }}>برنامه‌ات رو بر اساس سطح، قد و وزن می‌سازیم</div>

        <label style={{ display: "block", fontSize: 11, color: "var(--muted2)", margin: "14px 0 6px" }}>سطح</label>
        <div className="day-picker">
          {(["beginner", "intermediate", "advanced"] as const).map((l) => (
            <span key={l} className={`day-pill${level === l ? " on" : ""}`} onClick={() => setLevel(l)} style={{ flex: "1 1 auto", padding: "9px 14px" }}>
              {LEVEL_LABELS[l]}
            </span>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 11, color: "var(--muted2)", marginBottom: 6 }}>قد (سانتی‌متر)</label>
            <input type="number" className="wsearch-newform-name" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 11, color: "var(--muted2)", marginBottom: 6 }}>وزن (کیلوگرم)</label>
            <input type="number" className="wsearch-newform-name" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
          </div>
        </div>

        <label style={{ display: "block", fontSize: 11, color: "var(--muted2)", margin: "14px 0 6px" }}>هدف (اختیاری)</label>
        <input type="text" className="wsearch-newform-name" placeholder="مثلاً کاهش وزن، افزایش قدرت..." value={goal} onChange={(e) => setGoal(e.target.value)} />

        <div className="task" style={{ marginTop: 14, cursor: "pointer" }} onClick={() => setHasLimitation((v) => !v)}>
          <div className={`check${hasLimitation ? " on" : ""}`}>
            <svg className="c-check" viewBox="0 0 24 24" fill="none"><path d="M2.5 13l5.5 5.5L21.5 4.5" stroke="var(--bg)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div className="task-name">محدودیت جسمی دارم (بدون جزئیات، فقط برای احتیاط بیشتر)</div>
        </div>

        <div className="task" style={{ cursor: "pointer" }} onClick={() => setAccepted((v) => !v)}>
          <div className={`check${accepted ? " on" : ""}`}>
            <svg className="c-check" viewBox="0 0 24 24" fill="none"><path d="M2.5 13l5.5 5.5L21.5 4.5" stroke="var(--bg)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div className="task-name">
            این برنامه پیشنهادیه، نه توصیه پزشکی؛ قبل از شروع با پزشک مشورت می‌کنم و مسئولیت اجرا با خودمه.
          </div>
        </div>

        {error && <div className="field-error-msg" style={{ display: "block", marginTop: 10 }}>{error}</div>}

        <button onClick={submitPlan} disabled={submitting} style={{ marginTop: 16, borderColor: "var(--accent)", color: "var(--accent)" }}>
          {submitting ? "در حال ساخت…" : "ساخت برنامه"}
        </button>
      </div>
    );
  }

  const todayPlan = plan.planData.find((d) => d.day === todayName);

  return (
    <div>
      <div className="section-note" style={{ marginTop: 6 }}>سطح: {LEVEL_LABELS[plan.level]}</div>

      {todayPlan ? (
        <div className="glass-box" style={{ marginTop: 14 }}>
          <div className="task" onClick={toggleToday}>
            <div className={`check${todayDone ? " on" : ""}`}>
              <svg className="c-check" viewBox="0 0 24 24" fill="none"><path d="M2.5 13l5.5 5.5L21.5 4.5" stroke="var(--bg)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div>
              <div className={`task-name${todayDone ? " done" : ""}`}>امروز ({todayName}) — {todayPlan.focus}</div>
              <div className="task-time">{todayPlan.items.join(" · ")}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="item-line" style={{ marginTop: 14 }}>امروز ({todayName}) روز استراحته — چیزی برنامه‌ریزی نشده.</div>
      )}

      <div className="tm-extra">
        <div className="domain-sub">برنامه کامل هفته</div>
        <ul>
          {plan.planData.map((d) => (
            <li key={d.day}><b>{d.day}</b> — {d.focus}: {d.items.join("، ")}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
