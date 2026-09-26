"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { HOURS_OPTIONS, LEVEL_OPTIONS, type HoursValue, type LevelValue } from "@/lib/roadmapPlan";

/**
 * ویزاردِ ساختِ مسیر — سه گامِ کوتاه.
 *
 * ۱) چی (اجباری)  ۲) برای چی  ۳) سطح + وقتِ هفتگی + پیش‌زمینه.
 * گامِ سوم کاملاً اختیاری‌ست، ولی همین دوتا عدد مستقیم مدت‌زمان و عمقِ هر
 * مرحله را عوض می‌کنند: مسیرِ «صفرِ مطلق با هفته‌ای ۳ ساعت» با «متوسط با
 * هفته‌ای ۲۰ ساعت» حتی تعدادِ مرحله‌هایش هم یکی نیست. به‌جای متنِ آزاد
 * چیپ‌اند تا یک کلیک باشند و سرور هم فقط مقدارِ معتبر بپذیرد.
 */

const MAX_TOPIC = 120;
const MAX_GOAL = 300;
const MAX_BACKGROUND = 300;

const GOAL_CHIPS = [
  "استخدام و کارِ واقعی",
  "ارتقا توی شغلِ فعلی",
  "فریلنسری و درآمد",
  "ساختنِ یه پروژه‌ی شخصی",
  "گرفتنِ مدرک/سرتیفیکیت",
  "علاقه و کنجکاوی",
];

// ساخت دوفازی است و تا ~۵۵ ثانیه طول می‌کشد؛ جمله‌ها همان فازهای واقعی‌اند
// تا کاربر بداند الان دقیقاً چه اتفاقی می‌افتد، نه یک اسپینرِ بی‌حرف.
const BUILD_LINES = [
  "دارم هدفت رو تحلیل می‌کنم…",
  "دارم پیش‌نیازها رو از هم جدا می‌کنم…",
  "دارم مسیر رو به مرحله‌ها می‌بُرم…",
  "دارم برای هر مرحله سرفصل‌های ریز می‌نویسم…",
  "دارم کارهای عملی و پروژه‌ها رو طراحی می‌کنم…",
  "دارم منابع و ابزارهای هر مرحله رو انتخاب می‌کنم…",
  "دارم معیارهای تموم‌شدنِ هر مرحله رو می‌نویسم…",
  "دارم نامه‌ی راهنمای مسیر رو می‌نویسم…",
];

type Step = "topic" | "goal" | "profile";
const STEPS: Step[] = ["topic", "goal", "profile"];
const TITLES: Record<Step, string> = {
  topic: "می‌خوای چی یاد بگیری؟",
  goal: "هدفت چیه؟",
  profile: "از خودت بگو",
};

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

    // فقط خودِ fetch داخلِ try است؛ خطای جانبی *بعد از* ساختِ موفق نباید
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
        flashError(data?.error || "ساختِ مسیر انجام نشد — دوباره امتحان کن");
        return;
      }
    } catch {
      flashError("ارتباط با سرور برقرار نشد — دوباره امتحان کن");
      return;
    }

    setStatus("success");
    onCreated?.();
    router.push(`/roadmaps/custom/${data.id}`);
  }

  function next() {
    if (busy) return;
    if (step === "topic") {
      if (!topic.trim()) return flashError("بگو چی می‌خوای یاد بگیری");
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
            <div className="wsearch-newform-title accent">{busy ? "در حال ساختِ مسیرت" : TITLES[step]}</div>
            {!busy && <button className="nav-close" onClick={onClose} aria-label="بستن">×</button>}
          </div>

          <div className="rp-wiz-steps" aria-hidden>
            {STEPS.map((s, i) => (
              <span key={s} className={i <= stepIndex || busy ? "on" : ""} />
            ))}
          </div>

          {busy ? (
            <div className="rp-wiz-loading">
              <span className="wsearch-submit-spinner rp-wiz-spinner" />
              <div className="rp-wiz-loading-title">«{topic.trim()}»</div>
              <ul className="rp-wiz-phases">
                {BUILD_LINES.map((line, i) => (
                  <li key={i} className={i < buildLine ? "done" : i === buildLine ? "now" : ""}>{line}</li>
                ))}
              </ul>
              <div className="rp-wiz-loading-hint">تا حدودِ یک دقیقه طول می‌کشه — صفحه رو نبند.</div>
            </div>
          ) : (
            <>
              {step === "topic" && (
                <>
                  <label>چی می‌خوای یاد بگیری؟</label>
                  <input
                    ref={inputRef}
                    type="text"
                    className="wsearch-newform-name"
                    placeholder="مثلاً امنیت شبکه، ادیت ویدیو، گیتار، React"
                    value={topic}
                    maxLength={MAX_TOPIC}
                    onChange={(e) => { setTopic(e.target.value); setError(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") next(); }}
                  />
                  <div className="rp-wiz-hint">
                    لازم نیست بدونی از کجا شروع کنی. خودم تشخیص می‌دم چیا باید بخونی، با چه ترتیبی،
                    با چه ابزاری — و برای هر مرحله سرفصل‌های ریز، کارهای عملی، پروژه و منبع می‌نویسم.
                  </div>
                </>
              )}

              {step === "goal" && (
                <>
                  <label>هدفت از یادگیریش چیه؟</label>
                  <input
                    ref={inputRef}
                    type="text"
                    className="wsearch-newform-name"
                    placeholder="مثلاً می‌خوام تا یک سال دیگه تو همین حوزه استخدام بشم"
                    value={goal}
                    maxLength={MAX_GOAL}
                    onChange={(e) => setGoal(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") next(); }}
                  />
                  <div className="rp-wiz-chips">
                    {GOAL_CHIPS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`rp-wiz-chip${goal === c ? " on" : ""}`}
                        onClick={() => setGoal(goal === c ? "" : c)}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <div className="rp-wiz-hint">هدفت مسیر رو از ریشه عوض می‌کنه. اگه هدفِ مشخصی نداری خالی بذار.</div>
                </>
              )}

              {step === "profile" && (
                <>
                  <label>الان چقدر بلدی؟</label>
                  <div className="rp-wiz-chips">
                    {LEVEL_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        className={`rp-wiz-chip${level === o.value ? " on" : ""}`}
                        onClick={() => setLevel(level === o.value ? "" : o.value)}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>

                  <label className="rp-wiz-label">هفته‌ای چقدر وقت می‌ذاری؟</label>
                  <div className="rp-wiz-chips">
                    {HOURS_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        className={`rp-wiz-chip${hours === o.value ? " on" : ""}`}
                        onClick={() => setHours(hours === o.value ? "" : o.value)}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>

                  <label className="rp-wiz-label">چیزِ مرتبطی بلدی؟ <span className="rp-wiz-optional">(اختیاری)</span></label>
                  <input
                    ref={inputRef}
                    type="text"
                    className="wsearch-newform-name"
                    placeholder="مثلاً پایتون در حدِ مقدماتی، انگلیسیِ خوب"
                    value={background}
                    maxLength={MAX_BACKGROUND}
                    onChange={(e) => setBackground(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") next(); }}
                  />
                  <div className="rp-wiz-hint">مدتِ هر مرحله رو با همین وقتِ هفتگی حساب می‌کنم و چیزی که بلدی رو دوباره درس نمی‌دم.</div>
                </>
              )}

              {error && <div className="form-inline-error">{error}</div>}

              <div className="wsearch-newform-actions rp-wiz-actions">
                {step !== "topic" && (
                  <button type="button" className="rp-wiz-back" onClick={back} aria-label="برگشت">
                    <ChevronRight size={16} />
                  </button>
                )}
                <button
                  type="button"
                  className={`wsearch-submit-btn${status === "error" ? " error" : ""}`}
                  onClick={next}
                >
                  {step === "profile" ? "مسیرم رو بساز" : "بعدی"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
