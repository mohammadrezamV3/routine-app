import { ReactNode, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

// نکته‌ی مهم (باگِ حل‌شده — دوباره برنگرده): این کامپوننت عمدا `useLocation()`
// خودش رو نمی‌خونه. کلیدِ enter/exit ِ AnimatePresence از بیرون
// (App.tsx → `<PageTransition key={location.pathname}>`) تنظیم می‌شه، جایی
// که `location` فریزشده‌ی صفحه‌ی درِحالِ‌خروج رو داره (به‌خاطرِ
// `FrozenLocation`). اگه این کامپوننت این‌جا دوباره `useLocation()` صدا
// بزنه، چون به context ِ زنده‌ی روتر subscribe می‌شه، به‌محضِ تغییرِ مسیر
// (حتی وقتی instance ِ در‌حالِ‌خروجِ AnimatePresence هنوز با propsِ قدیمی
// مونتِه) دوباره رندر می‌شه و مسیرِ *جدید* رو می‌بینه — اگه از اون برای
// `key`ِ داخلی استفاده بشه، باعثِ remount ِ فوریِ `motion.div` می‌شه (بدونِ
// اتمامِ انیمیشنِ exit)، `onExitComplete` هیچ‌وقت صدا زده نمی‌شه، و چون
// AnimatePresence رویِ `mode="wait"`ه، صفحه‌ی بعدی هیچ‌وقت mount نمی‌شه —
// یعنی کلِ ناوبریِ داخلِ اپ بعد از اولین صفحه قفل می‌شه. پس هیچ `key`ِ
// وابسته به لوکیشن این‌جا لازم نیست؛ کلیدگذاریِ سطحِ App.tsx کافیه.
export default function PageTransition({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();

  const variants = useMemo(
    () =>
      reduce
        ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 } }
        : {
            initial: { opacity: 0, x: 12 },
            animate: { opacity: 1, x: 0 },
            exit: { opacity: 0, x: -12 },
          },
    [reduce],
  );

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
