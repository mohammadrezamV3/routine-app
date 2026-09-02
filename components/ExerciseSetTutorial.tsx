"use client";

import { useState } from "react";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { ChevronRight, MousePointerClick, Timer, CheckCircle2, PartyPopper } from "lucide-react";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";

export const EXERCISE_TUTORIAL_SEEN_KEY = "exercise-set-tutorial-seen";

const STEPS = [
  {
    icon: MousePointerClick,
    title: "روی دکمه‌ی «شروع» هر حرکت بزن",
    text: "با زدن دکمه‌ی شروع حرکت، یه پاپ‌آپ باز می‌شه که می‌تونی ست‌به‌ست پیشرفتت رو توش ثبت کنی.",
  },
  {
    icon: CheckCircle2,
    title: "هر ست رو که زدی، تیک بزن",
    text: "به‌اندازه‌ی ست‌های همون حرکت دایره می‌بینی — بعد هر ست، دایره‌ی بعدی رو بزن.",
  },
  {
    icon: Timer,
    title: "بین ست‌ها استراحت می‌کنی",
    text: "با هر تیک، یه شمارش‌معکوس ۹۰ ثانیه‌ای شروع می‌شه؛ تا تموم اون زمان، ست بعدی قفله.",
  },
  {
    icon: PartyPopper,
    title: "آخر کار، زمانت رو می‌بینی",
    text: "بعد آخرین ست، کل زمانی که برای این حرکت گذاشتی رو نشونت می‌دیم و حرکت انجام‌شده ثبت می‌شه.",
  },
];

const SWIPE_DISTANCE = 60;
const SWIPE_VELOCITY = 400;

// اولین‌باری که کسی «شروع تمرین» رو می‌زنه، این آموزش مرحله‌ای (روش اول:
// ردیابی ست‌به‌ست) نشون داده می‌شه؛ بعد دیدن، دیگه تکرار نمی‌شه (پرچمش
// توی localStorage ذخیره می‌شه). موبایل/تبلت با کشیدن انگشت (بدون دکمه‌ی
// قبلی) بین اسلایدها رد می‌شه، دسکتاپ با دکمه‌های قبلی/بعدی.
export function ExerciseSetTutorial({ onDone }: { onDone: () => void }) {
  useLockBodyScroll();
  const [step, setStep] = useState(0);
  // جهت آخرین حرکت (+۱ جلو / -۱ عقب) — برای انیمیشن جهت‌دار زیر لازمه؛
  // با mode="wait" قبلی هر گذری (چه جلو چه عقب) دقیقا یک شکل بود (محوشدن
  // ثابت، با یه مکث خالی بین خروج/ورود) که هم جهت واقعی سوایپ رو نشون
  // نمی‌داد هم به‌خاطر اون مکث «بد»/کند به‌نظر می‌رسید. حالا با popLayout
  // ورود/خروج هم‌زمانن (بدون مکث) و جهت اسلاید واقعا با جهت حرکت یکیه —
  // دقیقا همون الگویی که FeatureCarousel (LandingPage.tsx) استفاده می‌کنه.
  const [dir, setDir] = useState(1);
  const [isMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 1024);
  const isLast = step === STEPS.length - 1;
  const Icon = STEPS[step].icon;

  function finish() {
    try { localStorage.setItem(EXERCISE_TUTORIAL_SEEN_KEY, "1"); } catch {}
    onDone();
  }

  function goNext() {
    if (isLast) { finish(); return; }
    setDir(1);
    setStep((s) => s + 1);
  }
  function goBack() {
    setDir(-1);
    setStep((s) => s - 1);
  }

  // راست‌به‌چپ: کشیدن انگشت به سمت راست (offset.x مثبت) باید جلو ببره
  // (اسلاید بعدی)، به چپ (منفی) باید عقب ببره — دقیقا همون قراردادی که
  // FeatureCarousel (LandingPage.tsx) استفاده می‌کنه.
  function handleDragEnd(_: unknown, info: PanInfo) {
    const swipedForward = info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY;
    const swipedBack = info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY;
    if (swipedForward) goNext();
    else if (swipedBack && step > 0) goBack();
  }

  return (
    <>
      <div className="modal-overlay open" onClick={finish} />
      <div className="modal-panel liquid-glass-panel dash-scope open exercise-set-tracker-panel">
        <div className="modal-head">
          <div className="modal-title">روش ردیابی ست‌به‌ست</div>
          <button className="nav-close" onClick={finish} aria-label="بستن">×</button>
        </div>

        <div className="modal-body">
          <AnimatePresence initial={false} custom={dir} mode="popLayout">
            <motion.div
              key={step}
              custom={dir}
              initial={{ opacity: 0, x: dir * 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -28 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              drag={isMobile ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.6}
              onDragEnd={handleDragEnd}
              className="flex flex-col items-center gap-3 py-3 text-center"
              style={{ touchAction: isMobile ? "pan-y" : undefined }}
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

          {isMobile ? (
            <div className="mt-4">
              {isLast ? (
                <button
                  type="button"
                  onClick={finish}
                  className="flex w-full items-center justify-center py-2.5 text-[13px] font-bold"
                  style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                >
                  شروع برنامه
                </button>
              ) : (
                <div className="exercise-tutorial-swipe-hint">
                  برای ادامه، به راست بکش
                  <ChevronRight size={13} />
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 flex items-center justify-between gap-2">
              {step > 0 ? (
                <button type="button" onClick={goBack} className="small">
                  قبلی
                </button>
              ) : (
                <span />
              )}
              <button type="button" onClick={goNext} style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
                {isLast ? "متوجه شدم، بزن بریم" : "بعدی"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
