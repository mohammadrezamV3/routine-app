"use client";

import { useState } from "react";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { ChevronRight, Flame, LineChart, PlusCircle, Trophy } from "lucide-react";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { isEn, tr } from "@/lib/i18n";

export const CALORIE_TUTORIAL_SEEN_KEY = "calorie-tutorial-seen";

export function hasSeenCalorieTutorial(): boolean {
  if (typeof window === "undefined") return true;
  try { return localStorage.getItem(CALORIE_TUTORIAL_SEEN_KEY) === "1"; } catch { return true; }
}

const steps = () => [
  {
    icon: Flame,
    title: tr("حلقه‌ی «کالری امروز»", "The \"Today's calories\" ring"),
    text: tr("همیشه بالای صفحه می‌بینیش — نشون می‌ده چقدر از هدف روزانه‌ات رو تا الان خوردی.", "You always see it at the top. It shows how much of your daily goal you have eaten so far."),
  },
  {
    icon: LineChart,
    title: tr("نمودار روند کالری", "Calorie trend chart"),
    text: tr("روند امروز، هفته یا ماهت رو با خط زمانی می‌بینی؛ خط چین‌دار زردرنگ هم هدف روزانه‌ته.", "See your day, week or month trend on a timeline; the dashed yellow line is your daily goal."),
  },
  {
    icon: Trophy,
    title: tr("استرایک", "Streak"),
    text: tr("هر روزی که کالریت رو ثبت کنی و از هدف رد نشی، توی این ردیف تیک می‌خوره و به روزهای متوالیت اضافه می‌شه.", "Every day you log your calories and stay within your goal gets a tick in this row and adds to your streak."),
  },
  {
    icon: PlusCircle,
    title: tr("افزودن غذا", "Add food"),
    text: tr("از بخش «افزودن غذا» جستجو کن، مقدار و وعده رو انتخاب کن و ثبتش کن — همه‌ی حلقه‌ها و نمودارها خودکار آپدیت می‌شن.", "Use Add food to search, pick the amount and meal, and save. All rings and charts update automatically."),
  },
];

const SWIPE_DISTANCE = 60;
const SWIPE_VELOCITY = 400;

// دقیقا هم‌ساختار ExerciseSetTutorial (چهار مرحله، دات‌های پیشرفت، کشیدن
// روی موبایل / دکمه‌ی قبلی-بعدی روی دسکتاپ) ولی خودکار موقع اولین باز
// شدن صفحه‌ی کالری (بعد از اینکه هدف/برنامه‌ی کالری ساخته شده) باز می‌شه،
// نه پشت یه کلیک خاص — چون درخواست دقیقا همینه: «اولین بار که صفحه باز
// میشه راهنمایی هم بکن».
export function CalorieTutorial({ onDone }: { onDone: () => void }) {
  useLockBodyScroll();
  const [step, setStep] = useState(0);
  // جهت آخرین حرکت (+۱ جلو / -۱ عقب) — برای انیمیشن جهت‌دار زیر لازمه؛
  // با mode="wait" قبلی هر گذری (چه جلو چه عقب) دقیقا یک شکل بود (محوشدن
  // ثابت، با یه مکث خالی بین خروج/ورود). حالا با popLayout ورود/خروج
  // هم‌زمانن و جهت اسلاید واقعا با جهت حرکت یکیه — دقیقا همون الگویی که
  // FeatureCarousel (LandingPage.tsx) استفاده می‌کنه.
  const [dir, setDir] = useState(1);
  const [isMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 1024);
  const STEPS = steps();
  const isLast = step === STEPS.length - 1;
  const Icon = STEPS[step].icon;
  // در انگلیسی (ltr) کشیدن به چپ = جلو
  const sgn = isEn() ? -1 : 1;

  function finish() {
    try { localStorage.setItem(CALORIE_TUTORIAL_SEEN_KEY, "1"); } catch {}
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
          <div className="modal-title">{tr("راهنمای بخش کالری", "Calorie guide")}</div>
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
                  className="flex w-full items-center justify-center rounded-2xl border py-2.5 text-[13px] font-bold"
                  style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                >
                  {tr("متوجه شدم", "Got it")}
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
                <button
                  type="button"
                  onClick={goBack}
                  className="rounded-xl border px-3 py-1.5 text-[12px] font-semibold text-dash-muted"
                  style={{ borderColor: "var(--line)" }}
                >
                  {tr("قبلی", "Previous")}
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={goNext}
                className="rounded-2xl border px-5 py-2 text-[13px] font-bold"
                style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
              >
                {isLast ? tr("متوجه شدم", "Got it") : tr("بعدی", "Next")}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
