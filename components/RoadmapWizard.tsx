"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { HOURS_OPTIONS, LEVEL_OPTIONS, type HoursValue, type LevelValue } from "@/lib/roadmapPlan";
import { Spinner } from "./Spinner";
import { tr, pick } from "@/lib/i18n";

/**
 * ویزارد ساخت مسیر — سه گام کوتاه.
 *
 * ۱) چی (اجباری)  ۲) برای چی  ۳) سطح + وقت هفتگی + پیش‌زمینه.
 * گام سوم کاملا اختیاری‌ست، ولی همین دوتا عدد مستقیم مدت‌زمان و عمق هر
 * مرحله را عوض می‌کنند: مسیر «صفر مطلق با هفته‌ای ۳ ساعت» با «متوسط با
 * هفته‌ای ۲۰ ساعت» حتی تعداد مرحله‌هایش هم یکی نیست. به‌جای متن آزاد
 * چیپ‌اند تا یک کلیک باشند و سرور هم فقط مقدار معتبر بپذیرد.
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

type Step = "topic" | "goal" | "profile";
const STEPS: Step[] = ["topic", "goal", "profile"];
const titles = (): Record<Step, string> => ({
  topic: tr("می‌خوای چی یاد بگیری؟", "What do you want to learn?"),
  goal: tr("هدفت چیه؟", "What is your goal?"),
  profile: tr("از خودت بگو", "Tell us about yourself"),
});

export function RoadmapWizard({
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
  const [level, setLevel] = useState<LevelValue | "">("");
  const [hours, setHours] = useState<HoursValue | "">("");
  const [background, setBackground] = useState("");
  const [status, setStatus] = useState<"idle" | "building" | "success" | "error">("idle");
  const [buildLine, setBuildLine] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const busy = status === "building" || status === "success";
  const stepIndex = STEPS.indexOf(step);

  useEffect(() => { if (!busy) inputRef.current?.focus(); }, [step, busy]);

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
    if (step === "goal") {
      setError(null);
      setStep("profile");
      return;
    }
    build();
  }

  function back() {
    setError(null);
    setStep(STEPS[Math.max(0, stepIndex - 1)]);
  }

  return (
    <>
      <div className="wsearch-newform-overlay strong-blur open" onClick={busy ? undefined : onClose} />
      <div className="wsearch-newform dash-scope open">
        <div className="relative z-[1] add-program-glass rp-wiz">
          <div className="wsearch-newform-head">
            <div className="wsearch-newform-title accent">{busy ? tr("در حال ساخت مسیرت", "Building your path") : titles()[step]}</div>
            {!busy && <button className="nav-close" onClick={onClose} aria-label={tr("بستن", "Close")}>×</button>}
          </div>

          <div className="rp-wiz-steps" aria-hidden>
            {STEPS.map((s, i) => (
              <span key={s} className={i <= stepIndex || busy ? "on" : ""} />
            ))}
          </div>

          {busy ? (
            <div className="rp-wiz-loading">
              <Spinner size={22} className="rp-wiz-spinner" />
              <div className="rp-wiz-loading-title">«{topic.trim()}»</div>
              <ul className="rp-wiz-phases">
                {BUILD_LINES.map((line, i) => (
                  <li key={i} className={i < buildLine ? "done" : i === buildLine ? "now" : ""}>{pick(line)}</li>
                ))}
              </ul>
              <div className="rp-wiz-loading-hint">{tr("چند ثانیه — بعدش ساخت در پس‌زمینه ادامه پیدا می‌کنه.", "A few seconds — then the build continues in the background.")}</div>
            </div>
          ) : (
            <>
              {step === "topic" && (
                <>
                  <label>{tr("چی می‌خوای یاد بگیری؟", "What do you want to learn?")}</label>
                  <input
                    ref={inputRef}
                    type="text"
                    className="wsearch-newform-name"
                    placeholder={tr("مثلا امنیت شبکه، ادیت ویدیو، گیتار، React", "e.g. network security, video editing, guitar, React")}
                    value={topic}
                    maxLength={MAX_TOPIC}
                    onChange={(e) => { setTopic(e.target.value); setError(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") next(); }}
                  />
                  <div className="rp-wiz-hint">
                    {tr(`لازم نیست بدونی از کجا شروع کنی. خودم تشخیص می‌دم چیا باید بخونی، با چه ترتیبی،
                    با چه ابزاری — و برای هر مرحله سرفصل‌های ریز، کارهای عملی، پروژه و منبع می‌نویسم.`, "You do not need to know where to start. I will work out what you need to study, in what order and with which tools — and write detailed topics, practical tasks, a project and resources for every stage.")}
                  </div>
                </>
              )}

              {step === "goal" && (
                <>
                  <label>{tr("هدفت از یادگیریش چیه؟", "Why do you want to learn it?")}</label>
                  <input
                    ref={inputRef}
                    type="text"
                    className="wsearch-newform-name"
                    placeholder={tr("مثلا می‌خوام تا یک سال دیگه تو همین حوزه استخدام بشم", "e.g. I want to get hired in this field within a year")}
                    value={goal}
                    maxLength={MAX_GOAL}
                    onChange={(e) => setGoal(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") next(); }}
                  />
                  <div className="rp-wiz-chips">
                    {GOAL_CHIPS.map((chip) => {
                      const c = pick(chip);
                      return (
                      <button
                        key={chip.fa}
                        type="button"
                        className={`rp-wiz-chip${goal === c ? " on" : ""}`}
                        onClick={() => setGoal(goal === c ? "" : c)}
                      >
                        {c}
                      </button>
                      );
                    })}
                  </div>
                  <div className="rp-wiz-hint">{tr("هدفت مسیر رو از ریشه عوض می‌کنه. اگه هدف مشخصی نداری خالی بذار.", "Your goal changes the path completely. If you do not have a specific goal, leave it empty.")}</div>
                </>
              )}

              {step === "profile" && (
                <>
                  <label>{tr("الان چقدر بلدی؟", "How much do you know now?")}</label>
                  <div className="rp-wiz-chips">
                    {LEVEL_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        className={`rp-wiz-chip${level === o.value ? " on" : ""}`}
                        onClick={() => setLevel(level === o.value ? "" : o.value)}
                      >
                        {pick(o.label)}
                      </button>
                    ))}
                  </div>

                  <label className="rp-wiz-label">{tr("هفته‌ای چقدر وقت می‌ذاری؟", "How much time can you spend per week?")}</label>
                  <div className="rp-wiz-chips">
                    {HOURS_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        className={`rp-wiz-chip${hours === o.value ? " on" : ""}`}
                        onClick={() => setHours(hours === o.value ? "" : o.value)}
                      >
                        {pick(o.label)}
                      </button>
                    ))}
                  </div>

                  <label className="rp-wiz-label">{tr("چیز مرتبطی بلدی؟", "Do you know anything related?")} <span className="rp-wiz-optional">{tr("(اختیاری)", "(optional)")}</span></label>
                  <input
                    ref={inputRef}
                    type="text"
                    className="wsearch-newform-name"
                    placeholder={tr("مثلا پایتون در حد مقدماتی، انگلیسی خوب", "e.g. basic Python, good English")}
                    value={background}
                    maxLength={MAX_BACKGROUND}
                    onChange={(e) => setBackground(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") next(); }}
                  />
                  <div className="rp-wiz-hint">{tr("مدت هر مرحله رو با همین وقت هفتگی حساب می‌کنم و چیزی که بلدی رو دوباره درس نمی‌دم.", "I calculate each stage's length from this weekly time, and I will not re-teach what you already know.")}</div>
                </>
              )}

              {error && <div className="form-inline-error">{error}</div>}

              <div className="wsearch-newform-actions rp-wiz-actions">
                {step !== "topic" && (
                  <button type="button" className="rp-wiz-back" onClick={back} aria-label={tr("برگشت", "Back")}>
                    <ChevronRight size={16} className="dir-flip" />
                  </button>
                )}
                <button
                  type="button"
                  className={`wsearch-submit-btn${status === "error" ? " error" : ""}`}
                  onClick={next}
                >
                  {step === "profile" ? tr("مسیرم رو بساز", "Build my path") : tr("بعدی", "Next")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
