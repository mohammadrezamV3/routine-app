"use client";

import { useState } from "react";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { ChevronRight, Flame, LineChart, PlusCircle, Trophy } from "lucide-react";

export const CALORIE_TUTORIAL_SEEN_KEY = "calorie-tutorial-seen";

export function hasSeenCalorieTutorial(): boolean {
  if (typeof window === "undefined") return true;
  try { return localStorage.getItem(CALORIE_TUTORIAL_SEEN_KEY) === "1"; } catch { return true; }
}

const STEPS = [
  {
    icon: Flame,
    title: "حلقه‌ی «کالری امروز»",
    text: "همیشه بالای صفحه می‌بینیش — نشون می‌ده چقدر از هدفِ روزانه‌ت رو تا الان خوردی.",
  },
  {
    icon: LineChart,
    title: "نمودار روند کالری",
    text: "روند امروز، هفته یا ماهت رو با خطِ زمانی می‌بینی؛ خطِ چین‌دار زردرنگ هم هدفِ روزانه‌ته.",
  },
  {
    icon: Trophy,
    title: "مسیر پیشرفت",
    text: "هر روزی که کالریت رو ثبت کنی و از هدف رد نشی، توی این ردیف تیک می‌خوره و به روزهای متوالیت اضافه می‌شه.",
  },
  {
    icon: PlusCircle,
    title: "افزودنِ غذا",
    text: "از بخشِ «افزودن غذا» جستجو کن، مقدار و وعده رو انتخاب کن و ثبتش کن — همه‌ی حلقه‌ها و نمودارها خودکار آپدیت می‌شن.",
  },
];

const SWIPE_DISTANCE = 60;
const SWIPE_VELOCITY = 400;

// دقیقاً هم‌ساختارِ ExerciseSetTutorial (چهار مرحله، دات‌های پیشرفت، کشیدن
// روی موبایل / دکمه‌ی قبلی-بعدی روی دسکتاپ) ولی خودکار موقعِ اولین بازِ
// شدنِ صفحه‌ی کالری (بعد از اینکه هدف/برنامه‌ی کالری ساخته شده) باز می‌شه،
// نه پشتِ یه کلیکِ خاص — چون درخواست دقیقاً همینه: «اولین بار که صفحه باز
// میشه راهنمایی هم بکن».
export function CalorieTutorial({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [isMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 1024);
  const isLast = step === STEPS.length - 1;
  const Icon = STEPS[step].icon;

  function finish() {
    try { localStorage.setItem(CALORIE_TUTORIAL_SEEN_KEY, "1"); } catch {}
    onDone();
  }

  function goNext() {
    if (isLast) finish();
    else setStep((s) => s + 1);
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    const swipedForward = info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY;
    const swipedBack = info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY;
    if (swipedForward) goNext();
    else if (swipedBack && step > 0) setStep((s) => s - 1);
  }

  return (
    <>
      <div className="modal-overlay open" onClick={finish} />
      <div className="modal-panel liquid-glass-panel dash-scope open exercise-set-tracker-panel">
        <div className="modal-head">
          <div className="modal-title">راهنمای بخشِ کالری</div>
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
                  متوجه شدم
                </button>
              ) : (
                <div className="exercise-tutorial-swipe-hint">
                  برای ادامه، به چپ بکش
                  <ChevronRight size={13} />
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 flex items-center justify-between gap-2">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="rounded-xl border px-3 py-1.5 text-[12px] font-semibold text-dash-muted"
                  style={{ borderColor: "var(--line)" }}
                >
                  قبلی
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
                {isLast ? "متوجه شدم" : "بعدی"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
