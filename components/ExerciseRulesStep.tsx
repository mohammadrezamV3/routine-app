"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { TickButton } from "./TickButton";
import { Spinner } from "./Spinner";
import { tr } from "@/lib/i18n";

export const exerciseRulesText = () => [
  tr("این برنامه توسط سیستم (به‌کمک هوش مصنوعی) پیشنهاد داده می‌شه و جایگزین نظر پزشک یا مربی حضوری نیست.", "This plan is suggested by the system (with the help of AI) and does not replace a doctor or an in-person coach."),
  tr("اگه بیماری قلبی، مشکل مفصلی/ستون‌فقرات، بارداری، یا هر شرایط پزشکی خاصی داری، قبل از شروع با پزشک مشورت کن.", "If you have a heart condition, joint or spine problems, are pregnant, or have any other medical condition, talk to a doctor before you start."),
  tr("اگه حین تمرین درد غیرعادی، سرگیجه یا تنگی‌نفس احساس کردی، فورا متوقف کن.", "If you feel unusual pain, dizziness or shortness of breath during training, stop immediately."),
  tr("تکنیک درست حرکات مهم‌تر از وزنه‌ی سنگین‌تره — در صورت نیاز از مربی باشگاهت کمک بگیر.", "Correct technique matters more than heavier weight. Ask your gym coach for help if needed."),
  tr("مسئولیت اجرای این برنامه و هر آسیب احتمالی بر عهده‌ی خودته.", "You are responsible for following this plan and for any injury that may result."),
];

const EXERCISE_RULES_SEEN_KEY = "exercise-program-rules-seen";

/** ثانیه‌هایی که کاربر باید صرف خواندن قوانین کند، قبل از فعال‌شدن دکمه‌ی ثبت. */
const READ_SECONDS = 30;

/** فقط بار اولی که کاربر با AI برنامه‌ای می‌سازه این مرحله نشون داده می‌شه. */
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
  // شمارش معکوس ۳۰ثانیه‌ای — تا تموم نشه دکمه‌ی ثبت فعال نمی‌شه، تا کاربر
  // واقعا فرصت یک‌دور خوندن قوانین رو داشته باشه (نه فقط تیک سریع).
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
        <button type="button" className="exercise-catalog-back-btn" onClick={onBack} aria-label={tr("بازگشت", "Back")}>
          <ChevronRight size={20} className="dir-flip" />
        </button>
        {onClose && <button type="button" className="nav-close" onClick={onClose} aria-label={tr("بستن", "Close")}>×</button>}
      </div>

      {/* همه‌ی قوانین داخل یک باکس واحد، با تایتل سبز */}
      <div className="exercise-rules-box">
        <div className="exercise-rules-box-title">{tr("قبل از شروع، این چند مورد رو بخون", "Read these few points before you start")}</div>
        <ul className="exercise-rules-list">
          {exerciseRulesText().map((t) => <li key={t}>{t}</li>)}
        </ul>
      </div>

      <div className="task" style={{ marginTop: 16, cursor: "pointer" }} onClick={() => setChecked((v) => !v)}>
        <TickButton as="span" className="mt-0.5" size={22} shape="square" checked={checked} />
        <div className="task-name">{tr("این قوانین رو خوندم و قبول دارم", "I have read these rules and agree")}</div>
      </div>

      <div className="exercise-rules-actions">
        <button type="button" onClick={onAccept} disabled={!canSubmit} className="exercise-rules-accept-btn">
          {submitting ? (
            <Spinner size={15} />
          ) : !timerDone ? (
            <>
              <span className="mono" dir="ltr">{remaining}</span>
              {tr("ثانیه تا فعال‌شدن", "seconds until it unlocks")}
            </>
          ) : (
            tr("قبول دارم، برنامه رو بساز", "I agree, build my plan")
          )}
        </button>
      </div>
    </div>
  );
}
