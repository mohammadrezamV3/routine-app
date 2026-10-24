"use client";

import { withOnlineOnly } from "@/components/OnlineOnly";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, X } from "lucide-react";
import { HOURS_OPTIONS, LEVEL_OPTIONS, type HoursValue, type LevelValue } from "@/lib/roadmapPlan";
import { LockBodyScroll } from "./LockBodyScroll";
import { SegmentedTabs } from "./SegmentedTabs";
import { Spinner } from "./Spinner";
import { faNum } from "@/lib/jalali";
import { tr, pick } from "@/lib/i18n";

/**
 * ویزارد ساخت مسیر — چهار صفحه‌ی کوتاه، هر صفحه یک سوال.
 *
 * ۱) چی (اجباری)  ۲) برای چی  ۳) سطح + وقت هفتگی  ۴) پیش‌زمینه (اختیاری).
 * گام‌های ۲ تا ۴ اختیاری‌اند، ولی سطح و وقت هفتگی مستقیم مدت‌زمان و عمق
 * هر مرحله را عوض می‌کنند: مسیر «صفر مطلق با هفته‌ای ۳ ساعت» با «متوسط با
 * هفته‌ای ۲۰ ساعت» حتی تعداد مرحله‌هایش هم یکی نیست. به‌جای متن آزاد
 * SegmentedTabs تا یک کلیک باشند و سرور هم فقط مقدار معتبر بپذیرد.
 *
 * فقط ظاهر عوض شده؛ بدنه‌ی درخواست `POST /api/roadmaps` و ورودی‌ها همان قبلی‌ست.
 */

const MAX_TOPIC = 120;
const MAX_GOAL = 300;
const MAX_BACKGROUND = 300;

const GOAL_CHIPS = [
  { fa: "استخدام و کار واقعی", en: "Getting hired and real work" },
  { fa: "ارتقا توی شغل فعلی", en: "Moving up in my current job" },
  { fa: "فریلنسری و درآمد", en: "Freelancing and income" },
  { fa: "ساختن یه پروژه‌ی شخصی", en: "Building a personal project" },
  { fa: "گرفتن مدرک/سرتیفیکیت", en: "Earning a degree/certificate" },
  { fa: "علاقه و کنجکاوی", en: "Interest and curiosity" },
];

// برچسب کوتاه تب‌ها (جا برای چهار تب کنار هم)؛ متن کامل هر گزینه زیر تب‌ها
// همان برچسب اصلی lib/roadmapPlan است.
const LEVEL_SHORT: Record<LevelValue, { fa: string; en: string }> = {
  zero: { fa: "صفر", en: "Zero" },
  basic: { fa: "مقدماتی", en: "Basic" },
  mid: { fa: "متوسط", en: "Mid" },
  pro: { fa: "حرفه‌ای", en: "Pro" },
};
const HOURS_SHORT: Record<HoursValue, string> = { "3": "<5", "8": "5-10", "15": "10-20", "25": "20+" };

// ساخت دوفازی است و تا ~۵۵ ثانیه طول می‌کشد؛ جمله‌ها همان فازهای واقعی‌اند
// تا کاربر بداند الان دقیقا چه اتفاقی می‌افتد، نه یک اسپینر بی‌حرف.
const BUILD_LINES = [
  { fa: "دارم هدفت رو تحلیل می‌کنم…", en: "Analysing your goal…" },
  { fa: "دارم پیش‌نیازها رو از هم جدا می‌کنم…", en: "Separating out the prerequisites…" },
  { fa: "دارم مسیر رو به مرحله‌ها می‌برم…", en: "Splitting the path into stages…" },
  { fa: "دارم برای هر مرحله سرفصل‌های ریز می‌نویسم…", en: "Writing detailed topics for each stage…" },
  { fa: "دارم کارهای عملی و پروژه‌ها رو طراحی می‌کنم…", en: "Designing practical tasks and projects…" },
  { fa: "دارم منابع و ابزارهای هر مرحله رو انتخاب می‌کنم…", en: "Choosing resources and tools for each stage…" },
  { fa: "دارم معیارهای تموم‌شدن هر مرحله رو می‌نویسم…", en: "Writing the finish line for each stage…" },
  { fa: "دارم نامه‌ی راهنمای مسیر رو می‌نویسم…", en: "Writing the guide letter for your path…" },
];

type Step = "topic" | "goal" | "pace" | "background";
const STEPS: Step[] = ["topic", "goal", "pace", "background"];

const questions = (): Record<Step, string> => ({
  topic: tr("می‌خوای چی یاد بگیری؟", "What do you want to learn?"),
  goal: tr("هدفت از یادگیریش چیه؟", "Why do you want to learn it?"),
  pace: tr("الان کجایی و چقدر وقت داری؟", "Where are you now, and how much time do you have?"),
  background: tr("چیز مرتبطی بلدی؟", "Do you know anything related?"),
});

function RoadmapWizardInner({
  onClose,
  onCreated,
  initialTopic = "",
}: {
  onClose: () => void;
  onCreated?: () => void;
  initialTopic?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("topic");
  const [topic, setTopic] = useState(initialTopic);
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState<LevelValue | null>(null);
  const [hours, setHours] = useState<HoursValue | null>(null);
  const [background, setBackground] = useState("");
  const [status, setStatus] = useState<"idle" | "building" | "success" | "error">("idle");
  const [buildLine, setBuildLine] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef({ busy: false, onClose });

  const busy = status === "building" || status === "success";
  const stepIndex = STEPS.indexOf(step);
  closeRef.current = { busy, onClose };

  useEffect(() => { if (!busy) inputRef.current?.focus({ preventScroll: true }); }, [step, busy]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape" || closeRef.current.busy) return;
      closeRef.current.onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (status !== "building") return;
    setBuildLine(0);
    const t = setInterval(() => setBuildLine((i) => Math.min(i + 1, BUILD_LINES.length - 1)), 6500);
    return () => clearInterval(t);
  }, [status]);

  function flashError(msg: string) {
    setError(msg);
    setStatus("error");
    setTimeout(() => setStatus("idle"), 500);
  }

  async function build() {
    if (busy) return;
    setStatus("building");
    setError(null);

    // فقط خود fetch داخل try است؛ خطای جانبی *بعد از* ساخت موفق نباید
    // به کاربر «ساخته نشد» نشان بدهد.
    let data: any;
    try {
      const res = await fetch("/api/roadmaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          goal: goal.trim() || undefined,
          level: level || undefined,
          weeklyHours: hours || undefined,
          background: background.trim() || undefined,
        }),
      });
      data = await res.json().catch(() => null);
      if (!res.ok) {
        flashError(data?.error || tr("ساخت مسیر انجام نشد — دوباره امتحان کن", "The path could not be built — please try again"));
        return;
      }
    } catch {
      flashError(tr("ارتباط با سرور برقرار نشد — دوباره امتحان کن", "Could not reach the server — please try again"));
      return;
    }

    // ساخت در پس‌زمینه‌ی سرور ادامه دارد — کاربر فورا به لیست برمی‌گردد و
    // کارت همین رودمپ پیشرفت را نشان می‌دهد (نه ماندن پشت صفحه‌ی ساخت).
    setStatus("success");
    onCreated?.();
    onClose();
    router.push("/roadmaps");
  }

  function next() {
    if (busy) return;
    if (step === "topic") {
      if (!topic.trim()) return flashError(tr("بگو چی می‌خوای یاد بگیری", "Tell us what you want to learn"));
      setError(null);
      setStep("goal");
      return;
    }
    if (step === "goal") { setError(null); setStep("pace"); return; }
    if (step === "pace") { setError(null); setStep("background"); return; }
    build();
  }

  function back() {
    setError(null);
    setStep(STEPS[Math.max(0, stepIndex - 1)]);
  }

  const levelFull = LEVEL_OPTIONS.find((o) => o.value === level);
  const hoursFull = HOURS_OPTIONS.find((o) => o.value === hours);
  const isLast = step === "background";

  if (typeof document === "undefined") return null;
  return createPortal(
    <>
      <LockBodyScroll />
      <div className="modal-overlay open rmx-wz-overlay" onClick={busy ? undefined : onClose} />
      <div className="rmx-wz" role="dialog" aria-modal="true" aria-label={tr("ساخت مسیر یادگیری", "Build a learning path")}>
        {busy ? (
          <div className="rmx-wz-build">
            <Spinner size={28} className="rmx-wz-spinner" label={null} />
            <h2 className="rmx-wz-build-title">{tr("در حال ساخت مسیرت", "Building your path")}</h2>
            <div className="rmx-wz-build-topic">«{topic.trim()}»</div>
            <ul className="rmx-wz-phases" role="status" aria-live="polite">
              {BUILD_LINES.map((line, i) => (
                <li key={i} className={i < buildLine ? "is-done" : i === buildLine ? "is-now" : ""}>
                  <span className="rmx-wz-phase-dot">{i < buildLine && <Check size={10} strokeWidth={3} />}</span>
                  {pick(line)}
                </li>
              ))}
            </ul>
            <p className="rmx-wz-note">{tr("چند ثانیه — بعدش ساخت در پس‌زمینه ادامه پیدا می‌کنه.", "A few seconds — then the build continues in the background.")}</p>
          </div>
        ) : (
          <>
            <div className="rmx-wz-top">
              <span className="rmx-wz-count" dir="ltr">{faNum(stepIndex + 1)} / {faNum(STEPS.length)}</span>
              <button type="button" className="btn btn-ghost btn-icon btn-bare btn-sm" onClick={onClose} aria-label={tr("بستن", "Close")}>
                <X size={18} />
              </button>
            </div>
            <div className="rmx-wz-bars" aria-hidden="true">
              {STEPS.map((s, i) => <span key={s} className={i <= stepIndex ? "on" : ""} />)}
            </div>

            <div className="rmx-wz-step" key={step}>
              <h2 className="rmx-wz-q">{questions()[step]}</h2>

              {step === "topic" && (
                <>
                  <input
                    ref={inputRef}
                    type="text"
                    className="wsearch-newform-name rmx-field"
                    aria-label={questions().topic}
                    placeholder={tr("مثلا امنیت شبکه، ادیت ویدیو، گیتار، React", "e.g. network security, video editing, guitar, React")}
                    value={topic}
                    maxLength={MAX_TOPIC}
                    onChange={(e) => { setTopic(e.target.value); setError(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") next(); }}
                  />
                  <p className="rmx-wz-hint">
                    {tr("لازم نیست بدونی از کجا شروع کنی. خودم تشخیص می‌دم چیا باید بخونی، با چه ترتیبی، با چه ابزاری — و برای هر مرحله سرفصل، کار عملی، پروژه و منبع می‌نویسم.", "You do not need to know where to start. I will work out what you need to study, in what order and with which tools — and write topics, practical tasks, a project and resources for every stage.")}
                  </p>
                </>
              )}

              {step === "goal" && (
                <>
                  <input
                    ref={inputRef}
                    type="text"
                    className="wsearch-newform-name rmx-field"
                    aria-label={questions().goal}
                    placeholder={tr("مثلا می‌خوام تا یک سال دیگه تو همین حوزه استخدام بشم", "e.g. I want to get hired in this field within a year")}
                    value={goal}
                    maxLength={MAX_GOAL}
                    onChange={(e) => setGoal(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") next(); }}
                  />
                  <div className="rmx-chips">
                    {GOAL_CHIPS.map((chip) => {
                      const c = pick(chip);
                      return (
                        <button key={chip.fa} type="button" className={`rmx-chip${goal === c ? " on" : ""}`} onClick={() => setGoal(goal === c ? "" : c)}>
                          {c}
                        </button>
                      );
                    })}
                  </div>
                  <p className="rmx-wz-hint">{tr("هدفت مسیر رو از ریشه عوض می‌کنه. اگه هدف مشخصی نداری خالی بذار.", "Your goal changes the path completely. If you do not have a specific goal, leave it empty.")}</p>
                </>
              )}

              {step === "pace" && (
                <>
                  <div className="rmx-wz-group">
                    <span className="rmx-wz-label">{tr("سطح فعلی", "Current level")}</span>
                    <SegmentedTabs<LevelValue>
                      className="seg-flush rmx-seg"
                      ariaLabel={tr("سطح فعلی", "Current level")}
                      active={level}
                      onChange={setLevel}
                      options={LEVEL_OPTIONS.map((o) => ({ value: o.value, label: pick(LEVEL_SHORT[o.value]) }))}
                    />
                    <span className="rmx-wz-caption">{levelFull ? pick(levelFull.label) : tr("اختیاری — یکی رو انتخاب کن", "Optional — pick one")}</span>
                  </div>
                  <div className="rmx-wz-group">
                    <span className="rmx-wz-label">{tr("ساعت در هفته", "Hours per week")}</span>
                    <SegmentedTabs<HoursValue>
                      className="seg-flush rmx-seg"
                      ariaLabel={tr("ساعت در هفته", "Hours per week")}
                      active={hours}
                      onChange={setHours}
                      options={HOURS_OPTIONS.map((o) => ({ value: o.value, label: <bdi dir="ltr">{HOURS_SHORT[o.value]}</bdi> }))}
                    />
                    <span className="rmx-wz-caption">{hoursFull ? pick(hoursFull.label) : tr("مدت هر مرحله با همین وقت هفتگی حساب می‌شه", "Each stage's length is calculated from this weekly time")}</span>
                  </div>
                </>
              )}

              {step === "background" && (
                <>
                  <input
                    ref={inputRef}
                    type="text"
                    className="wsearch-newform-name rmx-field"
                    aria-label={questions().background}
                    placeholder={tr("مثلا پایتون در حد مقدماتی، انگلیسی خوب", "e.g. basic Python, good English")}
                    value={background}
                    maxLength={MAX_BACKGROUND}
                    onChange={(e) => setBackground(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") next(); }}
                  />
                  <p className="rmx-wz-hint">{tr("اختیاریه. چیزی که بلدی رو دوباره درس نمی‌دم.", "Optional. I will not re-teach what you already know.")}</p>
                </>
              )}
            </div>

            {error && <div className="form-inline-error rmx-wz-error" role="alert">{error}</div>}

            <div className="rmx-wz-actions">
              {step === "topic" ? (
                <button type="button" className="btn btn-ghost" onClick={onClose}>{tr("انصراف", "Cancel")}</button>
              ) : (
                <button type="button" className="btn btn-ghost" onClick={back}>{tr("قبلی", "Back")}</button>
              )}
              <button type="button" className={`btn btn-primary${status === "error" ? " rmx-shake" : ""}`} onClick={next}>
                {isLast ? tr("مسیرم رو بساز", "Build my path") : tr("بعدی", "Next")}
                {!isLast && <ArrowLeft size={16} className="dir-flip" />}
              </button>
            </div>
          </>
        )}
      </div>
    </>,
    document.body,
  );
}


// آفلاین پیام «اینترنت لازمه» (components/OnlineOnly.tsx)
export const RoadmapWizard = withOnlineOnly(RoadmapWizardInner, "ai-roadmap");
