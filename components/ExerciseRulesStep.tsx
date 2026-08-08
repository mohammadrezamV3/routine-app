"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

const AI_INTRO = "این برنامه توسط سیستم (به‌کمک هوش مصنوعی) پیشنهاد داده می‌شه و جایگزین نظر پزشک یا مربی حضوری نیست.";
const MANUAL_INTRO = "این برنامه رو خودت وارد کردی — سیستم فقط ذخیره‌ش می‌کنه و جایگزین نظر پزشک یا مربی حضوری نیست.";

export const EXERCISE_RULES_TEXT = [
  AI_INTRO,
  "اگه بیماری قلبی، مشکل مفصلی/ستون‌فقرات، بارداری، یا هر شرایط پزشکی خاصی داری، قبل از شروع با پزشک مشورت کن.",
  "اگه حین تمرین درد غیرعادی، سرگیجه یا تنگی‌نفس احساس کردی، فوراً متوقف کن.",
  "تکنیک درست حرکات مهم‌تر از وزنه‌ی سنگین‌تره — در صورت نیاز از مربی باشگاهت کمک بگیر.",
  "مسئولیت اجرای این برنامه و هر آسیب احتمالی بر عهده‌ی خودته.",
];

const EXERCISE_RULES_SEEN_KEY = "exercise-program-rules-seen";

/** فقط بارِ اولی که کاربر برنامه‌ای می‌سازه (AI یا دستی) این مرحله نشون داده می‌شه. */
export function hasSeenExerciseRules(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(EXERCISE_RULES_SEEN_KEY) === "1";
}

export function markExerciseRulesSeen() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(EXERCISE_RULES_SEEN_KEY, "1");
}

export function ExerciseRulesStep({
  onAccept,
  onBack,
  submitting,
  source = "ai",
}: {
  onAccept: () => void;
  onBack: () => void;
  submitting: boolean;
  source?: "ai" | "manual";
}) {
  const [checked, setChecked] = useState(false);
  const rules = source === "manual" ? [MANUAL_INTRO, ...EXERCISE_RULES_TEXT.slice(1)] : EXERCISE_RULES_TEXT;
  return (
    <div>
      <div className="exercise-catalog-back-btn" style={{ marginBottom: 12, cursor: "pointer" }} onClick={onBack}>
        <ChevronRight size={18} />
        بازگشت
      </div>
      <div className="domain-sub" style={{ marginTop: 0 }}>قبل از شروع، این چند مورد رو بخون</div>
      <ul className="exercise-rules-list">
        {rules.map((t) => <li key={t}>{t}</li>)}
      </ul>
      <div className="task" style={{ marginTop: 14, cursor: "pointer" }} onClick={() => setChecked((v) => !v)}>
        <div className={`check${checked ? " on" : ""}`}>
          <svg className="c-check" viewBox="0 0 24 24" fill="none"><path d="M2.5 13l5.5 5.5L21.5 4.5" stroke="var(--bg)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <div className="task-name">این قوانین رو خوندم و قبول دارم</div>
      </div>
      <button
        onClick={onAccept}
        disabled={!checked || submitting}
        style={{ width: "100%", marginTop: 14, borderColor: "var(--accent)", color: "var(--accent)" }}
      >
        {submitting ? "در حال ساخت برنامه…" : "قبول دارم، برنامه رو بساز"}
      </button>
    </div>
  );
}
