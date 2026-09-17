"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";

/**
 * ویزارد ساختِ مسیر — دقیقاً دو سوال.
 *
 * چرا فقط دوتا: نسخه‌های قبلی هفت گام می‌پرسیدند (سطح، روزهای هفته، دقیقه،
 * ددلاین، زبانِ منابع، بودجه، سبکِ یادگیری، و بعد چند سوالِ تولیدشده‌ی
 * دیگر). بیشترِ آن جواب‌ها حدسی بودند و مسیر را واقعاً عوض نمی‌کردند —
 * فقط یک فرمِ طولانی بینِ کاربر و جوابش بودند. آن چیزی که مسیر را از ریشه
 * عوض می‌کند همین دوتاست: *چی* و *برای چی*. بقیه‌اش کارِ مدل است.
 */

const MAX_TOPIC = 120;
const MAX_GOAL = 300;

const GOAL_CHIPS = [
  "استخدام و کارِ واقعی",
  "ارتقا توی شغلِ فعلی",
  "یه پروژه‌ی شخصی",
  "مدرک/سرتیفیکیت",
  "علاقه و کنجکاوی",
];

// جمله‌های حینِ ساخت. تولید تا ~۵۰ ثانیه طول می‌کشد؛ یک اسپینرِ بی‌حرف در
// این مدت حسِ «هنگ کرده» می‌دهد، پس می‌گوییم دقیقاً الان مشغولِ چه کاری است.
const BUILD_LINES = [
  "دارم هدفت رو تحلیل می‌کنم…",
  "دارم تصمیم می‌گیرم چیا باید بخونی…",
  "دارم ترتیبِ درستِ یادگیری رو می‌چینم…",
  "دارم ابزارها و منابع رو انتخاب می‌کنم…",
  "دارم متنِ کاملِ مسیر رو می‌نویسم…",
  "دارم مسیر رو به مرحله‌ها می‌شکنم…",
];

type Step = "topic" | "goal";

export function RoadmapWizard({ onClose, onCreated }: { onClose: () => void; onCreated?: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("topic");
  const [topic, setTopic] = useState("");
  const [goal, setGoal] = useState("");
  const [status, setStatus] = useState<"idle" | "building" | "success" | "error">("idle");
  const [buildLine, setBuildLine] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const busy = status === "building" || status === "success";

  useEffect(() => { if (!busy) inputRef.current?.focus(); }, [step, busy]);

  useEffect(() => {
    if (status !== "building") return;
    setBuildLine(0);
    const t = setInterval(() => setBuildLine((i) => (i + 1) % BUILD_LINES.length), 4200);
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

    // فقط خودِ fetch داخلِ try است، نه کارهای بعدِ موفقیت. قبلاً try کلِ
    // بلوک را می‌گرفت و یک خطای جانبی *بعد از* ساختِ موفق، به کاربر
    // «ساخته نشد» نشان می‌داد در حالی که مسیر ساخته شده بود.
    let data: any;
    try {
      const res = await fetch("/api/roadmaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), goal: goal.trim() || undefined }),
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
    build();
  }

  const pct = step === "topic" ? 50 : 100;

  return (
    <>
      <div className="wsearch-newform-overlay strong-blur open" onClick={busy ? undefined : onClose} />
      <div className="wsearch-newform dash-scope open">
        <div className="relative z-[1] add-program-glass rm-wiz">
          <div className="wsearch-newform-head">
            <div className="wsearch-newform-title accent">
              {step === "topic" ? "می‌خوای چی یاد بگیری؟" : "هدفت چیه؟"}
            </div>
            {!busy && <button className="nav-close" onClick={onClose} aria-label="بستن">×</button>}
          </div>

          <div className="rm-wiz-progress"><span style={{ width: `${pct}%` }} /></div>

          {busy ? (
            <div className="rm-wiz-loading">
              <span className="wsearch-submit-spinner rm-wiz-spinner" />
              <div className="rm-wiz-loading-title">در حال ساختنِ مسیرت…</div>
              <div className="rm-wiz-loading-sub">{BUILD_LINES[buildLine]}</div>
              <div className="rm-wiz-loading-hint">ممکنه تا یک دقیقه طول بکشه — صفحه رو نبند.</div>
            </div>
          ) : (
            <>
              {step === "topic" ? (
                <>
                  <label>چی می‌خوای یاد بگیری؟</label>
                  <input
                    ref={inputRef}
                    type="text"
                    className="wsearch-newform-name"
                    placeholder="مثلاً امنیت شبکه، ادیت ویدیو، گیتار"
                    value={topic}
                    maxLength={MAX_TOPIC}
                    onChange={(e) => { setTopic(e.target.value); setError(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") next(); }}
                  />
                  <div className="rm-wiz-hint">
                    لازم نیست بدونی از کجا باید شروع کنی — فقط بگو آخرش می‌خوای به چی برسی.
                    خودم تشخیص می‌دم چیا باید بخونی و با چه ترتیبی.
                  </div>
                </>
              ) : (
                <>
                  <label>هدفت از یادگیریش چیه؟</label>
                  <input
                    ref={inputRef}
                    type="text"
                    className="wsearch-newform-name"
                    placeholder="مثلاً می‌خوام تو همین حوزه استخدام بشم"
                    value={goal}
                    maxLength={MAX_GOAL}
                    onChange={(e) => setGoal(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") next(); }}
                  />
                  <div className="rm-wiz-chips">
                    {GOAL_CHIPS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`rm-wiz-chip${goal === c ? " on" : ""}`}
                        onClick={() => setGoal(goal === c ? "" : c)}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <div className="rm-wiz-hint">
                    هدفت مسیر رو کاملاً عوض می‌کنه: مسیرِ «استخدام» با مسیرِ «سرگرمی» یکی نیست.
                    اگه هدفِ مشخصی نداری، خالی بذار و بزن بریم.
                  </div>
                </>
              )}

              {error && <div className="form-inline-error">{error}</div>}

              <div className="wsearch-newform-actions rm-wiz-actions">
                {step === "goal" && (
                  <button
                    type="button"
                    className="rm-wiz-back"
                    onClick={() => { setError(null); setStep("topic"); }}
                    aria-label="برگشت"
                  >
                    <ChevronRight size={16} />
                  </button>
                )}
                <button
                  type="button"
                  className={`wsearch-submit-btn${status === "error" ? " error" : ""}`}
                  onClick={next}
                >
                  {step === "topic" ? "بعدی" : "مسیرم رو بساز"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
