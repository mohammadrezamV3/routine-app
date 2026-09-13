"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ROADMAP_DAYS, RoadmapSchedule, addMinutes, addRoadmapToRoutine } from "@/lib/roadmapSchedule";
import { faNum } from "@/lib/jalali";

const MAX_LEN = 120;
const MAX_GOAL_LEN = 200;
const MINUTE_CHOICES = [30, 45, 60, 90, 120];

/**
 * ویزارد ساختِ رودمپ — یک پاپ‌آپ دو گامی، نه یک صفحه‌ی جدا.
 *
 * گامِ ۱: چه می‌خواهی یاد بگیری + هدفت از یادگیریش چیه (اختیاری، ولی
 * صریحاً به مدل داده می‌شود تا مسیر را برای همان هدف بچیند — یک نفر که
 * می‌خواهد برای مصاحبه‌ی کاری آماده شود مسیرش با کسی که فقط کنجکاو است فرق دارد).
 * گامِ ۲: چه روزهایی، هر بار چند دقیقه، از چه ساعتی.
 *
 * گامِ دوم صرفاً تزئینی نیست: همین مقادیر هم به مدل داده می‌شوند (تا
 * جلسه‌ها دقیقاً به اندازه‌ی همان وقت بریده شوند، نه سرفصل‌های کلی) و هم
 * بعد از ساخت، جلسه‌ها را در «روتین من» می‌نشانند.
 *
 * دکمه‌ی «بساز» طبقِ درخواستِ صریح («لودینگش توی همون باکس باشه» +
 * «دیزاینش مثل بقیه‌ی بخش‌های اپ») دیگه یک لودینگِ جداگانه‌ی زیرِ دکمه
 * نیست — همون الگوی سه‌حالته‌ی wsearch-submit-btn (اسپینر/موفق/خطا) که
 * MedicationForm/AddProgramForm هم استفاده می‌کنن؛ خطای اعتبارسنجی
 * («حداقل یک روز رو انتخاب کن») هم دیگه فقط یک متنِ ریز نیست، دکمه لرزش
 * می‌خوره (wnsShake) تا واقعاً دیده بشه.
 */
export function RoadmapWizard({ onClose, onCreated }: { onClose: () => void; onCreated?: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<"topic" | "schedule">("topic");
  const [topic, setTopic] = useState("");
  const [goal, setGoal] = useState("");
  const [jsDays, setJsDays] = useState<number[]>([]);
  const [minutes, setMinutes] = useState(60);
  const [startTime, setStartTime] = useState("18:00");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function toggleDay(d: number) {
    setJsDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
    setError(null);
  }

  function goSchedule() {
    if (!topic.trim()) { setError("اول بگو چی می‌خوای یاد بگیری"); return; }
    setError(null);
    setStep("schedule");
  }

  // خطای اعتبارسنجی/شکستِ ارسال — هر دو یک حالتِ کوتاهِ «error» روی دکمه‌ن
  // (لرزش + قرمز) که خودش بعد از نیم‌ثانیه به idle برمی‌گرده، دقیقاً هم‌الگوی
  // بقیه‌ی دکمه‌های wsearch-submit-btn توی اپ.
  function flashError(msg: string) {
    setError(msg);
    setStatus("error");
    setTimeout(() => setStatus("idle"), 500);
  }

  async function submit() {
    if (status === "loading") return;
    if (!jsDays.length) { flashError("حداقل یک روز رو انتخاب کن"); return; }
    setError(null);
    setStatus("loading");

    const schedule: RoadmapSchedule = { jsDays: [...jsDays].sort((a, b) => a - b), minutesPerDay: minutes, startTime };

    try {
      const res = await fetch("/api/roadmaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), goal: goal.trim() || undefined, schedule }),
      });
      const data = await res.json();
      if (!res.ok) {
        flashError(data.error || "خطایی پیش آمد — دوباره امتحان کن");
        return;
      }
      setStatus("success");
      // نشاندنِ جلسه‌ها در «روتین من». اگر این مرحله شکست بخورد، خودِ رودمپ
      // ساخته شده و نباید کاربر را سرِ همان نگه داریم — بعداً از صفحه‌ی
      // رودمپ هم می‌شود دوباره اضافه‌اش کرد.
      await addRoadmapToRoutine(data.roadmap.id, data.roadmap.title, schedule).catch(() => {});
      onCreated?.();
      router.push(`/roadmaps/custom/${data.roadmap.id}`);
    } catch {
      flashError("ارتباط با سرور برقرار نشد — دوباره امتحان کن");
    }
  }

  const endTime = addMinutes(startTime, minutes);
  const loading = status === "loading";

  return (
    <>
      <div className="wsearch-newform-overlay strong-blur open" onClick={loading ? undefined : onClose} />
      <div className="wsearch-newform dash-scope open">
        <div className="relative z-[1] add-program-glass">
          <div className="wsearch-newform-head">
            <div className="wsearch-newform-title accent">
              {step === "topic" ? "چی می‌خوای یاد بگیری؟" : "چقدر وقت می‌ذاری؟"}
            </div>
            {!loading && <button className="nav-close" onClick={onClose} aria-label="بستن">×</button>}
          </div>

          {step === "topic" ? (
            <>
              <label>موضوع</label>
              <input
                ref={inputRef}
                type="text"
                className="wsearch-newform-name"
                placeholder="مثلا: طراحی UI/UX، زبان اسپانیایی، گیتار…"
                value={topic}
                maxLength={MAX_LEN}
                onChange={(e) => { setTopic(e.target.value); setError(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") goSchedule(); }}
              />

              {/* طبقِ درخواستِ صریح: یک فیلدِ جدید برای هدفِ یادگیری — تا مدل
                  بتونه مسیر رو دقیقاً برای همون هدف بچینه (مثلاً «برای مصاحبه‌ی
                  کاری» یه مسیرِ متفاوت از «فقط سرگرمی» می‌سازه). اختیاریه، پس
                  دکمه‌ی «بعدی» بهش گیر نمی‌ده. */}
              <label>هدفت از یادگیریش چیه؟ (اختیاری)</label>
              <input
                type="text"
                className="wsearch-newform-name"
                placeholder="می‌خوای راه چیو یاد بگیری؟"
                value={goal}
                maxLength={MAX_GOAL_LEN}
                onChange={(e) => setGoal(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") goSchedule(); }}
              />

              {error && <div className="form-inline-error">{error}</div>}

              <div className="wsearch-newform-actions">
                <button type="button" className="wsearch-submit-btn" onClick={goSchedule}>بعدی</button>
              </div>
            </>
          ) : (
            <>
              <label>چه روزهایی؟</label>
              <div className="rm-wizard-days">
                {ROADMAP_DAYS.map((d) => (
                  <span
                    key={d.jsDay}
                    className={`day-pill${jsDays.includes(d.jsDay) ? " on" : ""}`}
                    onClick={() => toggleDay(d.jsDay)}
                  >
                    {d.label}
                  </span>
                ))}
              </div>

              <label>هر جلسه چند دقیقه؟</label>
              <div className="rm-wizard-chips">
                {MINUTE_CHOICES.map((m) => (
                  <span key={m} className={`day-pill${minutes === m ? " on" : ""}`} onClick={() => setMinutes(m)}>
                    {faNum(m)} دقیقه
                  </span>
                ))}
              </div>

              <label>ساعت شروع</label>
              <input
                type="time"
                className="wsearch-newform-name mono"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                dir="ltr"
              />
              <div className="rm-wizard-hint">
                هر جلسه از <b className="mono">{startTime}</b> تا <b className="mono">{endTime}</b> — هفته‌ای{" "}
                <b>{faNum(jsDays.length)}</b> جلسه
              </div>

              {error && <div className="form-inline-error">{error}</div>}

              <div className="wsearch-newform-actions rm-wizard-actions">
                <button type="button" className="wsearch-add-btn" onClick={() => setStep("topic")} disabled={loading}>برگشت</button>
                <button type="button" className={`wsearch-submit-btn${status !== "idle" ? " " + status : ""}`} onClick={submit} disabled={status !== "idle"}>
                  {status === "loading" ? (
                    <span className="wsearch-submit-spinner" />
                  ) : status === "success" ? "ساخته شد" : "بساز"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
