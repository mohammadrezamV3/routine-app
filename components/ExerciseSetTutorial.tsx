"use client";

import { useState } from "react";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { ChevronRight, MousePointerClick, Timer, CheckCircle2, PartyPopper } from "lucide-react";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { isEn, tr } from "@/lib/i18n";

export const EXERCISE_TUTORIAL_SEEN_KEY = "exercise-set-tutorial-seen";

const steps = () => [
  {
    icon: MousePointerClick,
    title: tr("روی دکمه‌ی «شروع» هر حرکت بزن", "Tap Start on any exercise"),
    text: tr("با زدن دکمه‌ی شروع حرکت، یه پاپ‌آپ باز می‌شه که می‌تونی ست‌به‌ست پیشرفتت رو توش ثبت کنی.", "Tapping an exercise's Start button opens a popup where you can log your progress set by set."),
  },
  {
    icon: CheckCircle2,
    title: tr("هر ست رو که زدی، تیک بزن", "Tick each set when you finish it"),
    text: tr("به‌اندازه‌ی ست‌های همون حرکت دایره می‌بینی — بعد هر ست، دایره‌ی بعدی رو بزن.", "You will see one circle per set of that exercise. After each set, tap the next circle."),
  },
  {
    icon: Timer,
    title: tr("بین ست‌ها استراحت می‌کنی", "Rest between sets"),
    text: tr("با هر تیک، یه شمارش‌معکوس 90 ثانیه‌ای شروع می‌شه؛ تا تموم اون زمان، ست بعدی قفله.", "Each tick starts a 90-second countdown; the next set stays locked until it ends."),
  },
  {
    icon: PartyPopper,
    title: tr("آخر کار، زمانت رو می‌بینی", "See your time at the end"),
    text: tr("بعد آخرین ست، کل زمانی که برای این حرکت گذاشتی رو نشونت می‌دیم و حرکت انجام‌شده ثبت می‌شه.", "After the last set we show the total time you spent on this exercise and mark it as done."),
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
  const STEPS = steps();
  const isLast = step === STEPS.length - 1;
  const Icon = STEPS[step].icon;
  // جهت: در فارسی (rtl) کشیدن به راست = جلو؛ در انگلیسی (ltr) کشیدن به چپ = جلو
  const sgn = isEn() ? -1 : 1;

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
    const ox = info.offset.x * sgn, vx = info.velocity.x * sgn;
    const swipedForward = ox > SWIPE_DISTANCE || vx > SWIPE_VELOCITY;
    const swipedBack = ox < -SWIPE_DISTANCE || vx < -SWIPE_VELOCITY;
    if (swipedForward) goNext();
    else if (swipedBack && step > 0) goBack();
  }

  return (
    <>
      <div className="modal-overlay open" onClick={finish} />
      <div className="modal-panel liquid-glass-panel dash-scope open exercise-set-tracker-panel">
        <div className="modal-head">
          <div className="modal-title">{tr("روش ردیابی ست‌به‌ست", "Set-by-set tracking")}</div>
          <button className="nav-close" onClick={finish} aria-label={tr("بستن", "Close")}>×</button>
        </div>

        <div className="modal-body">
          <AnimatePresence initial={false} custom={dir} mode="popLayout">
            <motion.div
              key={step}
              custom={dir}
              initial={{ opacity: 0, x: dir * 28 * sgn }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -28 * sgn }}
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
                  {tr("شروع برنامه", "Start the plan")}
                </button>
              ) : (
                <div className="exercise-tutorial-swipe-hint">
                  {tr("برای ادامه، به راست بکش", "Swipe left to continue")}
                  <ChevronRight size={13} className="dir-flip" />
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 flex items-center justify-between gap-2">
              {step > 0 ? (
                <button type="button" onClick={goBack} className="small">
                  {tr("قبلی", "Previous")}
                </button>
              ) : (
                <span />
              )}
              <button type="button" onClick={goNext} style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
                {isLast ? tr("متوجه شدم، بزن بریم", "Got it, let's go") : tr("بعدی", "Next")}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
