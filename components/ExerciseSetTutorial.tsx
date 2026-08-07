"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MousePointerClick, Timer, CheckCircle2, PartyPopper } from "lucide-react";

export const EXERCISE_TUTORIAL_SEEN_KEY = "exercise-set-tutorial-seen";

const STEPS = [
  {
    icon: MousePointerClick,
    title: "روی اسمِ هر حرکت بزن",
    text: "با زدنِ اسمِ حرکت، یه پاپ‌آپ باز می‌شه که می‌تونی ست‌به‌ست پیشرفتت رو توش ثبت کنی.",
  },
  {
    icon: CheckCircle2,
    title: "هر ست رو که زدی، تیک بزن",
    text: "به‌اندازه‌ی ست‌های همون حرکت دایره می‌بینی — بعدِ هر ست، دایره‌ی بعدی رو بزن.",
  },
  {
    icon: Timer,
    title: "بینِ ست‌ها استراحت می‌کنی",
    text: "با هر تیک، یه شمارش‌معکوسِ ۹۰ ثانیه‌ای شروع می‌شه؛ تا تمومِ اون زمان، ستِ بعدی قفله.",
  },
  {
    icon: PartyPopper,
    title: "آخرِ کار، زمانت رو می‌بینی",
    text: "بعدِ آخرین ست، کلِ زمانی که برای این حرکت گذاشتی رو نشونت می‌دیم و حرکت انجام‌شده ثبت می‌شه.",
  },
];

// اولین‌باری که کسی «شروع تمرین» رو می‌زنه، این آموزشِ مرحله‌ای (روشِ اول:
// ردیابیِ ست‌به‌ست) نشون داده می‌شه؛ بعدِ دیدن، دیگه تکرار نمی‌شه (پرچمش
// توی localStorage ذخیره می‌شه — این فقط یه ترجیحِ نمایشیه، نه دیتای واقعی،
// پس نیازی به سوییچِ storage.ts نداره).
export function ExerciseSetTutorial({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const Icon = STEPS[step].icon;

  function finish() {
    try { localStorage.setItem(EXERCISE_TUTORIAL_SEEN_KEY, "1"); } catch {}
    onDone();
  }

  return (
    <>
      <div className="modal-overlay open" onClick={finish} />
      <div className="modal-panel liquid-glass-panel dash-scope open exercise-set-tracker-panel">
        <div className="modal-head">
          <div className="modal-title">روشِ ردیابیِ ست‌به‌ست</div>
          <button className="nav-close" onClick={finish} aria-label="بستن">×</button>
        </div>

        <div className="modal-body">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex flex-col items-center gap-3 py-3 text-center"
            >
              <motion.span
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                className="flex h-14 w-14 items-center justify-center rounded-full text-dash-green"
                style={{ background: "rgba(var(--accent-rgb),.14)" }}
              >
                <Icon size={26} />
              </motion.span>
              <div className="text-[14px] font-bold text-dash-text sm:text-[15px]">{STEPS[step].title}</div>
              <div className="text-[11.5px] leading-relaxed text-dash-muted sm:text-[12.5px]">{STEPS[step].text}</div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-2 flex items-center justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className="h-1.5 rounded-full transition-all"
                style={{ width: i === step ? 18 : 6, background: i === step ? "var(--accent)" : "var(--line)" }}
              />
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            {step > 0 && (
              <button type="button" onClick={() => setStep((s) => s - 1)} className="small" style={{ flex: 1 }}>
                قبلی
              </button>
            )}
            <button
              type="button"
              onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
              style={{ flex: 2, borderColor: "var(--accent)", color: "var(--accent)" }}
            >
              {isLast ? "متوجه شدم، بزن بریم" : "بعدی"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
