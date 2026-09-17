"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ROADMAP_DAYS, RoadmapSchedule, addMinutes, addRoadmapToRoutine } from "@/lib/roadmapSchedule";
import { faNum } from "@/lib/jalali";
import { SegmentedTabs } from "./SegmentedTabs";

/**
 * ویزارد ساختِ مسیر — دو مرحله‌ایِ واقعی.
 *
 * چرا این‌شکلی: کاربر معمولاً خودش هم نمی‌داند برای رسیدن به خواسته‌اش باید
 * چه چیزهایی بخواند. پس اول چیزهایی که *خودش می‌داند* را می‌پرسیم (موضوع،
 * هدف، سطح، وقت، ترجیح‌ها)، بعد همین‌ها را به مدل می‌دهیم تا **خودش**
 * سوال‌های تخصصیِ همان موضوع را بسازد (بلدی لینوکس؟ تیمِ آبی یا تستِ نفوذ؟)،
 * و آخر با جوابِ آن سوال‌ها مسیر ساخته می‌شود.
 *
 * همه‌ی گام‌ها داخلِ همین یک باکس‌اند (هیچ صفحه‌ی جدیدی باز نمی‌شود) و هر دو
 * انتظارِ شبکه — ساختِ سوال‌ها و ساختِ مسیر — لودینگشان هم داخلِ همین باکس
 * است، نه یک اسپینرِ سراسری.
 */

const MAX_TOPIC = 120;
const MAX_GOAL = 200;
const MAX_FREE = 200;
const MINUTE_CHOICES = [30, 45, 60, 90, 120];
const DEADLINE_CHOICES = [1, 3, 6, 12];

const LEVELS = ["از صفر", "یه چیزایی بلدم", "متوسط", "پیشرفته"] as const;
const RESOURCE_LANGS = ["فقط فارسی", "فارسی و انگلیسی"] as const;
const BUDGETS = ["فقط رایگان", "پولی هم اوکیه"] as const;
const LEARN_STYLES = ["ویدیو", "کتاب و مستند", "پروژه‌محور", "فرقی نمی‌کنه"] as const;

const GOAL_CHIPS = ["استخدام و کارِ واقعی", "ارتقا توی شغلِ فعلی", "یه پروژه‌ی شخصی", "مدرک/سرتیفیکیت", "علاقه و کنجکاوی"];

type Question = { id: string; q: string; why?: string; options: string[]; multi: boolean; allowFree: boolean };

// گام‌هایی که خودِ کاربر پر می‌کند (قبل از سوال‌های مدل) — شمارنده‌ی بالای
// فرم از همین می‌آید.
type Step = "topic" | "goal" | "level" | "time" | "prefs" | "intro" | "questions";
const FORM_STEPS: Step[] = ["topic", "goal", "level", "time", "prefs"];

// جمله‌های حینِ ساخت. تولید تا ~۵۰ ثانیه طول می‌کشد؛ یک اسپینرِ بی‌حرف در
// این مدت حسِ «هنگ کرده» می‌دهد، پس می‌گوییم دقیقاً الان مشغولِ چه کاری است.
const BUILD_LINES = [
  "دارم هدفت رو تحلیل می‌کنم…",
  "دارم مسیرِ یادگیری رو می‌چینم…",
  "دارم پیش‌نیازها رو به هم وصل می‌کنم…",
  "دارم سرفصل‌ها و تمرین‌ها رو می‌نویسم…",
  "دارم نقشه رو اعتبارسنجی می‌کنم…",
  "دارم آخرین جزئیات رو مرتب می‌کنم…",
];

export function RoadmapWizard({ onClose, onCreated }: { onClose: () => void; onCreated?: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("topic");

  // ── چیزهایی که خودِ کاربر می‌گوید
  const [topic, setTopic] = useState("");
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("از صفر");
  const [jsDays, setJsDays] = useState<number[]>([]);
  const [minutes, setMinutes] = useState(60);
  const [startTime, setStartTime] = useState("18:00");
  const [deadlineMonths, setDeadlineMonths] = useState<number | null>(null);
  const [resourceLang, setResourceLang] = useState<(typeof RESOURCE_LANGS)[number]>("فارسی و انگلیسی");
  const [budget, setBudget] = useState<(typeof BUDGETS)[number]>("فقط رایگان");
  const [learnStyle, setLearnStyle] = useState<(typeof LEARN_STYLES)[number]>("فرقی نمی‌کنه");

  // ── چیزهایی که مدل می‌پرسد
  const [intro, setIntro] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [freeText, setFreeText] = useState<Record<string, string>>({});

  const [status, setStatus] = useState<"idle" | "asking" | "building" | "success" | "error">("idle");
  const [buildLine, setBuildLine] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const busy = status === "asking" || status === "building";

  useEffect(() => { if (step === "topic") inputRef.current?.focus(); }, [step]);

  // چرخشِ جمله‌های حینِ ساخت
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

  function toggleDay(d: number) {
    setJsDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
    setError(null);
  }

  const profileBody = useCallback(() => {
    const schedule: RoadmapSchedule = {
      jsDays: [...jsDays].sort((a, b) => a - b),
      minutesPerDay: minutes,
      startTime,
    };
    return {
      topic: topic.trim(),
      goal: goal.trim() || undefined,
      level,
      deadlineMonths: deadlineMonths ?? undefined,
      resourceLang,
      budget,
      learnStyle,
      schedule,
    };
  }, [topic, goal, level, deadlineMonths, resourceLang, budget, learnStyle, jsDays, minutes, startTime]);

  /** گامِ آخرِ فرم → گرفتنِ سوال‌ها از مدل */
  async function askQuestions() {
    if (busy) return;
    setError(null);
    setStatus("asking");
    try {
      const res = await fetch("/api/roadmaps/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileBody()),
      });
      const data = await res.json();
      if (!res.ok) { flashError(data?.error || "ساخت سوال‌ها انجام نشد — دوباره امتحان کن"); return; }
      setIntro(typeof data.intro === "string" ? data.intro : "");
      setQuestions(Array.isArray(data.questions) ? data.questions : []);
      setQIndex(0);
      setStatus("idle");
      setStep("intro");
    } catch {
      flashError("ارتباط با سرور برقرار نشد — دوباره امتحان کن");
    }
  }

  /** بعد از آخرین سوال → ساختِ خودِ مسیر */
  async function build() {
    if (busy) return;
    setError(null);
    setStatus("building");

    const answers = questions
      .map((q) => {
        const parts = [...(picked[q.id] || [])];
        const free = (freeText[q.id] || "").trim();
        if (free) parts.push(free);
        return { q: q.q, a: parts.join("، ") };
      })
      .filter((x) => x.a);

    const schedule: RoadmapSchedule = {
      jsDays: [...jsDays].sort((a, b) => a - b),
      minutesPerDay: minutes,
      startTime,
    };

    let data: any;
    try {
      const res = await fetch("/api/roadmaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profileBody(), answers }),
      });
      data = await res.json();
      if (!res.ok) { flashError(data?.error || "ساختِ مسیر انجام نشد — دوباره امتحان کن"); return; }
    } catch {
      flashError("ارتباط با سرور برقرار نشد — دوباره امتحان کن");
      return;
    }

    // از این‌جا به بعد مسیر روی سرور قطعاً ساخته شده — هر خطای بعدی
    // (نشاندن در روتین، ناوبری) نباید به کاربر «ساخته نشد» نشون بده.
    setStatus("success");
    await addRoadmapToRoutine(data.roadmap.id, data.roadmap.title, schedule).catch(() => {});
    onCreated?.();
    router.push(`/roadmaps/custom/${data.roadmap.id}`);
  }

  // ── ناوبریِ گام‌ها
  function next() {
    if (step === "topic") {
      if (!topic.trim()) { flashError("اول بگو چی می‌خوای یاد بگیری"); return; }
      setError(null); setStep("goal"); return;
    }
    if (step === "goal") { setError(null); setStep("level"); return; }
    if (step === "level") { setError(null); setStep("time"); return; }
    if (step === "time") {
      if (!jsDays.length) { flashError("حداقل یک روز رو انتخاب کن"); return; }
      setError(null); setStep("prefs"); return;
    }
    if (step === "prefs") { askQuestions(); return; }
  }

  function back() {
    if (busy) return;
    setError(null);
    if (step === "goal") return setStep("topic");
    if (step === "level") return setStep("goal");
    if (step === "time") return setStep("level");
    if (step === "prefs") return setStep("time");
    if (step === "intro") return setStep("prefs");
    if (step === "questions") {
      if (qIndex > 0) return setQIndex((i) => i - 1);
      return setStep("intro");
    }
  }

  function answerNext() {
    if (qIndex + 1 < questions.length) { setQIndex((i) => i + 1); setError(null); return; }
    build();
  }

  function toggleOption(q: Question, opt: string) {
    setPicked((prev) => {
      const cur = prev[q.id] || [];
      if (q.multi) {
        return { ...prev, [q.id]: cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt] };
      }
      return { ...prev, [q.id]: cur.includes(opt) ? [] : [opt] };
    });
    setError(null);
  }

  const stepIndex = FORM_STEPS.indexOf(step);
  const totalSteps = FORM_STEPS.length + 1 + (questions.length || 0);
  const currentStep =
    step === "intro" ? FORM_STEPS.length + 1
      : step === "questions" ? FORM_STEPS.length + 2 + qIndex
        : stepIndex + 1;
  const pct = Math.round((currentStep / Math.max(totalSteps, 1)) * 100);

  const q = step === "questions" ? questions[qIndex] : null;
  const endTime = addMinutes(startTime, minutes);
  const showBack = step !== "topic" && !busy;

  return (
    <>
      <div className="wsearch-newform-overlay strong-blur open" onClick={busy ? undefined : onClose} />
      <div className="wsearch-newform dash-scope open">
        <div className="relative z-[1] add-program-glass rm-wiz">
          <div className="wsearch-newform-head">
            <div className="wsearch-newform-title accent">{headTitle(step, qIndex, questions.length)}</div>
            {!busy && <button className="nav-close" onClick={onClose} aria-label="بستن">×</button>}
          </div>

          {/* نوارِ پیشرفتِ ویزارد — کاربر باید بداند چقدر مانده، وگرنه یک
              فرمِ چندگامی حسِ «تمامی ندارد» می‌دهد. */}
          <div className="rm-wiz-progress"><span style={{ width: `${pct}%` }} /></div>

          {status === "asking" ? (
            <div className="rm-wiz-loading">
              <span className="wsearch-submit-spinner rm-wiz-spinner" />
              <div className="rm-wiz-loading-title">دارم سوال‌های مخصوصِ «{topic.trim()}» رو آماده می‌کنم…</div>
              <div className="rm-wiz-loading-sub">چند لحظه — این‌ها همون سوال‌هایی‌ان که مسیرت رو دقیق می‌کنن.</div>
            </div>
          ) : status === "building" || status === "success" ? (
            <div className="rm-wiz-loading">
              <span className="wsearch-submit-spinner rm-wiz-spinner" />
              <div className="rm-wiz-loading-title">در حال ساختنِ مسیرت…</div>
              <div className="rm-wiz-loading-sub">{BUILD_LINES[buildLine]}</div>
              <div className="rm-wiz-loading-hint">ممکنه تا یک دقیقه طول بکشه — صفحه رو نبند.</div>
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
                    placeholder="می‌خوای راه چیو یاد بگیری؟"
                    value={topic}
                    maxLength={MAX_TOPIC}
                    onChange={(e) => { setTopic(e.target.value); setError(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") next(); }}
                  />
                  <div className="rm-wiz-hint">
                    لازم نیست بدونی از کجا باید شروع کنی — فقط بگو آخرش می‌خوای به چی برسی.
                    مثلاً «امنیت شبکه»، «ادیت ویدیو»، «گیتار».
                  </div>
                </>
              )}

              {step === "goal" && (
                <>
                  <label>هدفت از یادگیریش چیه؟</label>
                  <input
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
                  </div>
                </>
              )}

              {step === "level" && (
                <>
                  <label>الان چقدر از این موضوع بلدی؟</label>
                  <SegmentedTabs
                    active={level}
                    onChange={setLevel}
                    options={LEVELS.map((l) => ({ value: l, label: l }))}
                  />
                  <div className="rm-wiz-hint">
                    راستش رو بگو — اگه بگی بلدی و نباشی، مسیر از جایی شروع می‌شه که گم می‌شی.
                  </div>
                </>
              )}

              {step === "time" && (
                <>
                  <label>چه روزهایی وقت داری؟</label>
                  <div className="rm-wiz-days">
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
                  <div className="rm-wiz-days">
                    {MINUTE_CHOICES.map((m) => (
                      <span key={m} className={`day-pill${minutes === m ? " on" : ""}`} onClick={() => setMinutes(m)}>
                        {faNum(m)}
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

                  <label>تا کِی می‌خوای برسی؟ (اختیاری)</label>
                  <div className="rm-wiz-days">
                    {DEADLINE_CHOICES.map((m) => (
                      <span
                        key={m}
                        className={`day-pill${deadlineMonths === m ? " on" : ""}`}
                        onClick={() => setDeadlineMonths(deadlineMonths === m ? null : m)}
                      >
                        {faNum(m)} ماه
                      </span>
                    ))}
                  </div>

                  <div className="rm-wiz-hint">
                    هر جلسه از <b className="mono">{startTime}</b> تا <b className="mono">{endTime}</b> — هفته‌ای{" "}
                    <b>{faNum(jsDays.length)}</b> جلسه.
                    {deadlineMonths ? ` مسیر طوری چیده می‌شه که تا ${faNum(deadlineMonths)} ماه دیگه جا بشه.` : ""}
                  </div>
                </>
              )}

              {step === "prefs" && (
                <>
                  <label>منابع به چه زبونی باشن؟</label>
                  <SegmentedTabs
                    active={resourceLang}
                    onChange={setResourceLang}
                    options={RESOURCE_LANGS.map((l) => ({ value: l, label: l }))}
                  />

                  <label>بودجه‌ات برای منابع؟</label>
                  <SegmentedTabs
                    active={budget}
                    onChange={setBudget}
                    options={BUDGETS.map((b) => ({ value: b, label: b }))}
                  />

                  <label>بیشتر با چی راحتی؟</label>
                  <SegmentedTabs
                    active={learnStyle}
                    onChange={setLearnStyle}
                    options={LEARN_STYLES.map((s) => ({ value: s, label: s }))}
                  />

                  <div className="rm-wiz-hint">
                    بعدِ این، چند تا سوالِ مخصوصِ خودِ «{topic.trim()}» ازت می‌پرسم تا مسیر واقعاً مالِ خودت بشه.
                  </div>
                </>
              )}

              {step === "intro" && (
                <div className="rm-wiz-intro">
                  {intro && <div className="rm-wiz-intro-quote">{intro}</div>}
                  <div className="rm-wiz-intro-count">
                    حالا <b>{faNum(questions.length)}</b> تا سوال ازت می‌پرسم
                  </div>
                  <div className="rm-wiz-intro-sub">
                    این سوال‌ها مخصوصِ همین موضوعن. جوابشون مشخص می‌کنه از کجا شروع کنی و چی رو رد کنی —
                    پس مسیری که می‌سازم دقیقاً اندازه‌ی خودته، نه یه مسیرِ کلی.
                  </div>
                </div>
              )}

              {step === "questions" && q && (
                <div className="rm-wiz-q">
                  <div className="rm-wiz-q-num">سوال {faNum(qIndex + 1)} از {faNum(questions.length)}</div>
                  <div className="rm-wiz-q-text">{q.q}</div>
                  {q.why && <div className="rm-wiz-q-why">{q.why}</div>}

                  {!!q.options.length && (
                    <div className="rm-wiz-chips">
                      {q.options.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          className={`rm-wiz-chip${(picked[q.id] || []).includes(opt) ? " on" : ""}`}
                          onClick={() => toggleOption(q, opt)}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                  {q.multi && <div className="rm-wiz-q-multi">می‌تونی چندتا رو انتخاب کنی</div>}

                  {q.allowFree && (
                    <input
                      type="text"
                      className="wsearch-newform-name"
                      style={{ marginTop: 10 }}
                      placeholder="یا خودت بنویس…"
                      value={freeText[q.id] || ""}
                      maxLength={MAX_FREE}
                      onChange={(e) => setFreeText((p) => ({ ...p, [q.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") answerNext(); }}
                    />
                  )}
                </div>
              )}

              {error && <div className="form-inline-error">{error}</div>}

              <div className="wsearch-newform-actions rm-wiz-actions">
                {showBack && (
                  <button type="button" className="rm-wiz-back" onClick={back} aria-label="برگشت">
                    <ChevronRight size={16} />
                  </button>
                )}
                <button
                  type="button"
                  className={`wsearch-submit-btn${status === "error" ? " error" : ""}`}
                  onClick={step === "intro" ? () => setStep("questions") : step === "questions" ? answerNext : next}
                  disabled={busy}
                >
                  {nextLabel(step, qIndex, questions.length)}
                </button>
              </div>

              {step === "questions" && q && (
                <button type="button" className="rm-wiz-skip" onClick={answerNext}>
                  این رو نمی‌دونم — رد کن
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function headTitle(step: Step, qIndex: number, qCount: number): string {
  switch (step) {
    case "topic": return "می‌خوای چی یاد بگیری؟";
    case "goal": return "هدفت چیه؟";
    case "level": return "الان کجای کاری؟";
    case "time": return "چقدر وقت می‌ذاری؟";
    case "prefs": return "چند تا تنظیمِ آخر";
    case "intro": return "چند تا سوال دارم";
    case "questions": return `سوال ${faNum(qIndex + 1)} از ${faNum(qCount)}`;
  }
}

function nextLabel(step: Step, qIndex: number, qCount: number): string {
  if (step === "prefs") return "بعدی";
  if (step === "intro") return "بزن بریم";
  if (step === "questions") return qIndex + 1 < qCount ? "بعدی" : "مسیرم رو بساز";
  return "بعدی";
}
