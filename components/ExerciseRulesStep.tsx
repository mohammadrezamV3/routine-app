"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";

export const EXERCISE_RULES_TEXT = [
  "این برنامه توسط سیستم (به‌کمک هوش مصنوعی) پیشنهاد داده می‌شه و جایگزین نظر پزشک یا مربی حضوری نیست.",
  "اگه بیماری قلبی، مشکل مفصلی/ستون‌فقرات، بارداری، یا هر شرایط پزشکی خاصی داری، قبل از شروع با پزشک مشورت کن.",
  "اگه حین تمرین درد غیرعادی، سرگیجه یا تنگی‌نفس احساس کردی، فوراً متوقف کن.",
  "تکنیک درست حرکات مهم‌تر از وزنه‌ی سنگین‌تره — در صورت نیاز از مربی باشگاهت کمک بگیر.",
  "مسئولیت اجرای این برنامه و هر آسیب احتمالی بر عهده‌ی خودته.",
];

const EXERCISE_RULES_SEEN_KEY = "exercise-program-rules-seen";

/** ثانیه‌هایی که کاربر باید صرفِ خواندنِ قوانین کند، قبل از فعال‌شدنِ دکمه‌ی ثبت. */
const READ_SECONDS = 30;

/** فقط بارِ اولی که کاربر با AI برنامه‌ای می‌سازه این مرحله نشون داده می‌شه. */
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
  onClose,
}: {
  onAccept: () => void;
  onBack: () => void;
  submitting: boolean;
  onClose?: () => void;
}) {
  const [checked, setChecked] = useState(false);
  // شمارشِ معکوسِ ۳۰ثانیه‌ای — تا تموم نشه دکمه‌ی ثبت فعال نمی‌شه، تا کاربر
  // واقعاً فرصتِ یک‌دور خوندنِ قوانین رو داشته باشه (نه فقط تیکِ سریع).
  const [remaining, setRemaining] = useState(READ_SECONDS);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => setRemaining((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [remaining > 0]);

  const timerDone = remaining <= 0;
  const canSubmit = checked && timerDone && !submitting;

  return (
    <div>
      <div className="exercise-wizard-head">
        <button type="button" className="exercise-catalog-back-btn" onClick={onBack} aria-label="بازگشت">
          <ChevronRight size={20} />
        </button>
        {onClose && <button type="button" className="nav-close" onClick={onClose} aria-label="بستن">×</button>}
      </div>

      {/* همه‌ی قوانین داخلِ یک باکسِ واحد، با تایتلِ سبز */}
      <div className="exercise-rules-box">
        <div className="exercise-rules-box-title">قبل از شروع، این چند مورد رو بخون</div>
        <ul className="exercise-rules-list">
          {EXERCISE_RULES_TEXT.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </div>

      <div className="task" style={{ marginTop: 16, cursor: "pointer" }} onClick={() => setChecked((v) => !v)}>
        <div className={`check${checked ? " on" : ""}`}>
          <svg className="c-check" viewBox="0 0 24 24" fill="none"><path d="M2.5 13l5.5 5.5L21.5 4.5" stroke="var(--bg)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <div className="task-name">این قوانین رو خوندم و قبول دارم</div>
      </div>

      <div className="exercise-rules-actions">
        <button type="button" onClick={onAccept} disabled={!canSubmit} className="exercise-rules-accept-btn">
          {submitting ? (
            <>
              <span className="wsearch-submit-spinner" />
              در حال ساخت برنامه
            </>
          ) : !timerDone ? (
            <>
              <span className="mono" dir="ltr">{remaining}</span>
              ثانیه تا فعال‌شدن
            </>
          ) : (
            "قبول دارم، برنامه رو بساز"
          )}
        </button>
      </div>
    </div>
  );
}
