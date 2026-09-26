import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { WifiOff, RefreshCw, LayoutGrid } from "lucide-react";
import { markOnboardingSeen } from "@/lib/onboarding";
import { tapHaptic } from "@/lib/haptics";

interface Card {
  icon: typeof WifiOff;
  title: string;
  body: string;
}

const CARDS: Card[] = [
  {
    icon: WifiOff,
    title: "بدونِ اینترنت هم کار می‌کنه",
    body: "روتین، ورزش، کالری و ترید همه روی خودِ گوشی ذخیره می‌شن — حتی آفلاین هم می‌تونی ثبت و ویرایش کنی.",
  },
  {
    icon: RefreshCw,
    title: "با حسابت همگام می‌شه",
    body: "وقتی وارد بشی، دیتای همین دستگاه با حسابِ وب سینک می‌شه — چیزی از دستِ نمی‌ره، فقط یکی می‌شه.",
  },
  {
    icon: LayoutGrid,
    title: "چند ماژول، یک اپ",
    body: "روتینِ روزانه، بدنسازی و کالری، ژورنالِ ترید، و رودمپِ یادگیری — همه از همین‌جا در دسترسن.",
  },
];

const SWIPE_DISTANCE = 60;
const SWIPE_VELOCITY = 400;

interface OnboardingProps {
  onDone: () => void;
}

/**
 * سه کارتِ swipe که فقط بارِ اول (شرطش بیرون از این کامپوننته) نشون داده
 * می‌شه — با dot indicator، دراگِ افقی برای رد شدن بینِ کارت‌ها، و در آخر
 * دو دکمه: ورود / ادامه بدونِ حساب. طبقِ قانونِ CLAUDE.md هیچ بک‌گراندِ
 * خودسرانه‌ای به عناصر اضافه نشده؛ فقط همون توکن‌های رنگیِ تم.
 */
export default function Onboarding({ onDone }: OnboardingProps) {
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();
  const isLast = index === CARDS.length - 1;

  function finish() {
    markOnboardingSeen();
    onDone();
  }

  function goTo(next: number) {
    if (next < 0 || next >= CARDS.length) return;
    void tapHaptic();
    setIndex(next);
  }

  function handleDragEnd(_e: unknown, info: PanInfo) {
    if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY) {
      // RTL: کشیدن به چپ یعنی رفتن به کارتِ بعدی
      goTo(index + 1);
    } else if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) {
      goTo(index - 1);
    }
  }

  const Card = CARDS[index];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="آشنایی با اپ"
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ background: "var(--bg)" }}
    >
      <div className="flex flex-1 flex-col items-center justify-center overflow-hidden px-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={index}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={handleDragEnd}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
            className="flex w-full max-w-[320px] flex-col items-center gap-5 text-center"
          >
            <div
              className="flex items-center justify-center rounded-full"
              style={{ width: 88, height: 88, background: "var(--surface-1)", border: "1px solid var(--surface-line)" }}
            >
              <Card.icon size={36} color="var(--accent)" strokeWidth={1.6} />
            </div>
            <h2 className="font-vazir text-[17px] font-semibold" style={{ color: "var(--text)" }}>
              {Card.title}
            </h2>
            <p className="font-vazir text-[13.5px] leading-7" style={{ color: "var(--muted)" }}>
              {Card.body}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex justify-center gap-2 pb-6" role="tablist" aria-label="مراحلِ آشنایی">
        {CARDS.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`کارتِ ${i + 1} از ${CARDS.length}`}
            onClick={() => goTo(i)}
            className="rounded-full transition-all"
            style={{
              width: i === index ? 20 : 6,
              height: 6,
              background: i === index ? "var(--accent)" : "var(--surface-line)",
            }}
          />
        ))}
      </div>

      <div className="flex flex-col gap-3 px-6" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
        {isLast ? (
          <>
            <button
              type="button"
              onClick={() => {
                finish();
                navigate("/login");
              }}
              className="rounded-card font-vazir text-[14.5px] font-semibold"
              style={{ minHeight: 50, background: "var(--accent)", color: "#fff" }}
            >
              ورود
            </button>
            <button type="button" onClick={finish} className="font-vazir text-[13.5px]" style={{ minHeight: 44, color: "var(--muted)" }}>
              ادامه بدون حساب
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            className="rounded-card font-vazir text-[14.5px] font-semibold"
            style={{ minHeight: 50, background: "var(--accent)", color: "#fff" }}
          >
            بعدی
          </button>
        )}
      </div>
    </div>
  );
}
