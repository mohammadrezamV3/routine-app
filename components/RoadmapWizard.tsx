"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ROADMAP_DAYS, RoadmapSchedule, addMinutes, addRoadmapToRoutine } from "@/lib/roadmapSchedule";
import { faNum } from "@/lib/jalali";
import { Spinner } from "@/components/Spinner";

const LOADING_STEPS = [
  "در حال تحلیل موضوع…",
  "در حال بریدنِ مسیر به جلسه‌های هم‌اندازه‌ی وقتت…",
  "در حال نوشتنِ قدم‌های هر جلسه و منابعش…",
  "چند لحظه دیگه تمومه…",
];

const MAX_LEN = 120;
const MINUTE_CHOICES = [30, 45, 60, 90, 120];

/**
 * ویزارد ساختِ رودمپ — یک پاپ‌آپ دو گامی، نه یک صفحه‌ی جدا.
 *
 * گامِ ۱: چه می‌خواهی یاد بگیری.
 * گامِ ۲: چه روزهایی، هر بار چند دقیقه، از چه ساعتی.
 *
 * گامِ دوم صرفاً تزئینی نیست: همین مقادیر هم به مدل داده می‌شوند (تا
 * جلسه‌ها دقیقاً به اندازه‌ی همان وقت بریده شوند، نه سرفصل‌های کلی) و هم
 * بعد از ساخت، جلسه‌ها را در «روتین من» می‌نشانند.
 */
export function RoadmapWizard({ onClose, onCreated }: { onClose: () => void; onCreated?: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<"topic" | "schedule">("topic");
  const [topic, setTopic] = useState("");
  const [jsDays, setJsDays] = useState<number[]>([]);
  const [minutes, setMinutes] = useState(60);
  const [startTime, setStartTime] = useState("18:00");
  const [loading, setLoading] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!loading) { setStepIdx(0); return; }
    const id = setInterval(() => setStepIdx((i) => Math.min(i + 1, LOADING_STEPS.length - 1)), 2600);
    return () => clearInterval(id);
  }, [loading]);

  function toggleDay(d: number) {
    setJsDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
    setError(null);
  }

  function goSchedule() {
    if (!topic.trim()) { setError("اول بگو چی می‌خوای یاد بگیری"); return; }
    setError(null);
    setStep("schedule");
  }

  async function submit() {
    if (loading) return;
    if (!jsDays.length) { setError("حداقل یک روز رو انتخاب کن"); return; }
    setError(null);
    setLoading(true);

    const schedule: RoadmapSchedule = { jsDays: [...jsDays].sort((a, b) => a - b), minutesPerDay: minutes, startTime };

    try {
      const res = await fetch("/api/roadmaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), schedule }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoading(false);
        setError(data.error || "خطایی پیش آمد — دوباره امتحان کن");
        return;
      }
      // نشاندنِ جلسه‌ها در «روتین من». اگر این مرحله شکست بخورد، خودِ رودمپ
      // ساخته شده و نباید کاربر را سرِ همان نگه داریم — بعداً از صفحه‌ی
      // رودمپ هم می‌شود دوباره اضافه‌اش کرد.
      await addRoadmapToRoutine(data.roadmap.id, data.roadmap.title, schedule).catch(() => {});
      onCreated?.();
      router.push(`/roadmaps/custom/${data.roadmap.id}`);
    } catch {
      setLoading(false);
      setError("ارتباط برقرار نشد — دوباره امتحان کن");
    }
  }

  const endTime = addMinutes(startTime, minutes);

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

              {loading ? (
                <div className="rm-wizard-loading">
                  <Spinner size={18} />
                  <span>{LOADING_STEPS[stepIdx]}</span>
                </div>
              ) : (
                <div className="wsearch-newform-actions rm-wizard-actions">
                  <button type="button" className="wsearch-add-btn" onClick={() => setStep("topic")}>برگشت</button>
                  <button type="button" className="wsearch-submit-btn" onClick={submit}>بساز</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
