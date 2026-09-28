"use client";

/**
 * ============================================================
 * سیستمِ حرکتِ بخشِ منتورها (MentorMotion)
 * ------------------------------------------------------------
 * هدف: حسِ اپِ واقعی، نه پرشِ صفحه‌به‌صفحه. آرام و کوتاه:
 *   • مدت: 160 تا 320 میلی‌ثانیه (M_DUR.fast/base/slow)
 *   • منحنی: M_EASE = [0.22, 1, 0.36, 1] (ease-out)
 *   • فقط opacity + جابه‌جاییِ حداکثر 8px + scaleِ خیلی کم برای شیت
 *   • بدونِ فنر/پرش، بدونِ حرکتِ پیوسته، بدونِ تغییرِ layout در ورود
 *   • prefers-reduced-motion: MotionTuner در ریشه‌ی اپ (app/layout.tsx)
 *     `MotionConfig reducedMotion="user"` (و روی دستگاهِ ضعیف "always") را
 *     برای کلِ اپ می‌گذارد. یک MotionConfig تازه این‌جا تودرتو نکنید؛ آن
 *     حالتِ «دستگاه ضعیف» را بازنویسی می‌کند.
 *
 * API (همه از "@/components/MentorMotion"):
 *
 *   ورودِ صفحه — خودکار است:
 *     app/{mentor,mentors,mentorship,mentor-programs}/template.tsx همه
 *     `<MentorRouteTransition>` هستند؛ هر ناوبری بینِ صفحه‌های منتور یک
 *     fade + 6px بالاآمدن می‌گیرد. خودتان دوباره انیمیشنِ ورود نگذارید.
 *
 *   <MentorReveal [delay] [as="div"|"section"|"li"] [className]>
 *     برای محتوایی که پس از بارگذاری جای اسپینر می‌نشیند: نرم ظاهر شود.
 *     (MentorPage / MentorSection خودشان این را دارند.)
 *
 *   <MentorStagger> … <MentorStaggerItem> …
 *     ورودِ پله‌ای و کوتاهِ چند بخش/کارت (فاصله 40ms، حداکثر 8 پله).
 *     MentorStaggerItem دقیقاً یک المنت (پیش‌فرض div) می‌سازد؛ با `as`
 *     عوضش کنید. برای گریدِ کارت‌ها: <MentorStagger className="mentor-grid">.
 *
 *   <MentorList> {items.map(x => <MentorListItem key={x.id}>…</MentorListItem>)} </MentorList>
 *     ورود/خروجِ آیتمِ لیست (AnimatePresence) + layout برای مرتب‌سازی/فیلتر.
 *     خودِ MentorList المنتی نمی‌سازد (فقط AnimatePresence، initial={false}
 *     تا بارِ اول کلِ لیست دوباره انیمیت نشود). MentorListItem یک div است؛
 *     کلاس‌های ردیف را روی آن نگذارید، MentorRow داخلش برود.
 *     برای ردیف‌هایی که `:last-child` لازم دارند مشکلی نیست: MentorListItem
 *     کلاسِ `mentor-li` دارد و CSS مرزِ آخرین ردیف را درست می‌کند.
 *
 *   <MentorSwap swapKey={tab}> … </MentorSwap>
 *     cross-fade کوتاهِ محتوای تب/سگمنت (خروج 120ms، ورود 200ms).
 *
 *   <MentorCollapse open={bool}> … </MentorCollapse>
 *     باز/بسته‌شدنِ نرمِ ارتفاع (height:auto) + opacity. محتوا در حالتِ
 *     بسته unmount می‌شود.
 *
 *   <MentorSheet open onClose title? labelledBy? size="sm"|"md"|"lg" dismissible?>
 *     پاپ‌آپ: وسطِ صفحه در دسکتاپ، bottom sheet در موبایل (≤ 560px).
 *     پورتال به body، قفلِ اسکرول، Escape و کلیک روی پس‌زمینه = بستن
 *     (مگر dismissible={false})، فوکوس به پنل. سطح همان .modal-panel سایت
 *     است (بک‌گراندِ تازه ندارد). فوترِ دکمه‌ها: <div className="trade-modal-actions">.
 *
 *   فیدبکِ فشار: خودکار است. در mentor.css (بلوکِ «حرکت») دکمه‌های
 *   .mentor-btn / .trade-title-add-btn / .mentor-text-btn / a.mentor-row و
 *   تب‌های ناوبریِ پنل هنگامِ فشار scale(.97) می‌گیرند. برای المنتِ دیگری
 *   کلاسِ `m-press` بدهید. `pressProps` هم برای motion.* موجود است.
 *
 *   ثابت‌ها: M_EASE, M_DUR, mT(duration?) → transition، V_FADE_UP (variants)
 * ============================================================
 */

import { AnimatePresence, motion, type Variants } from "framer-motion";
import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { LockBodyScroll } from "./LockBodyScroll";

export const M_EASE = [0.22, 1, 0.36, 1] as const;
export const M_DUR = { fast: 0.16, base: 0.22, slow: 0.32 } as const;
export const mT = (duration: number = M_DUR.base, delay = 0) => ({ duration, delay, ease: M_EASE });

export const V_FADE_UP: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: mT(M_DUR.base) },
};

/** برای motion.* : فیدبکِ فشار (همان scaleِ کلاسِ m-press) */
export const pressProps = { whileTap: { scale: 0.97 }, transition: mT(M_DUR.fast) } as const;

/* ── ورودِ صفحه (template.tsx) ─────────────────────────────── */
export function MentorRouteTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="m-route"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={mT(M_DUR.slow)}
    >
      {children}
    </motion.div>
  );
}

/* ── نمایشِ محتوای تازه‌بارگذاری‌شده ───────────────────────── */
type RevealTag = "div" | "section" | "li" | "ul";
export function MentorReveal({
  as = "div", delay = 0, className, children, id,
}: {
  as?: RevealTag;
  delay?: number;
  className?: string;
  id?: string;
  children: React.ReactNode;
}) {
  const C = motion[as] as typeof motion.div;
  return (
    <C
      id={id}
      className={className}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={mT(M_DUR.base, delay)}
    >
      {children}
    </C>
  );
}

/* ── ورودِ پله‌ای ────────────────────────────────────────────── */
const STAGGER_STEP = 0.04;
const STAGGER_MAX = 8;

export function MentorStagger({
  as = "div", className, children,
}: {
  as?: RevealTag;
  className?: string;
  children: React.ReactNode;
}) {
  const C = motion[as] as typeof motion.div;
  return (
    <C className={className} initial="hidden" animate="show" variants={{ hidden: {}, show: {} }}>
      {children}
    </C>
  );
}

/** یک پله داخلِ MentorStagger؛ `index` برای سقفِ تأخیر (پیش‌فرض ترتیبِ رندر نیست، پس بدهید) */
export function MentorStaggerItem({
  as = "div", index = 0, className, children,
}: {
  as?: RevealTag;
  index?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const C = motion[as] as typeof motion.div;
  const d = Math.min(index, STAGGER_MAX) * STAGGER_STEP;
  return (
    <C
      className={className}
      variants={{
        hidden: { opacity: 0, y: 6 },
        show: { opacity: 1, y: 0, transition: mT(M_DUR.base, d) },
      }}
    >
      {children}
    </C>
  );
}

/* ── لیست: ورود/خروج + layout ─────────────────────────────── */
export function MentorList({ children }: { children: React.ReactNode }) {
  return <AnimatePresence initial={false}>{children}</AnimatePresence>;
}

export function MentorListItem({
  children, className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      layout="position"
      className={`mentor-li${className ? ` ${className}` : ""}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: mT(M_DUR.fast) }}
      transition={{ ...mT(M_DUR.base), layout: mT(M_DUR.base) }}
    >
      {children}
    </motion.div>
  );
}

/* ── تعویضِ محتوای تب ───────────────────────────────────────── */
export function MentorSwap({
  swapKey, children, className,
}: {
  swapKey: string | number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={swapKey}
        className={className}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0, transition: mT(M_DUR.base) }}
        exit={{ opacity: 0, transition: { duration: 0.12, ease: M_EASE } }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/* ── باز/بسته‌شدن ───────────────────────────────────────────── */
export function MentorCollapse({
  open, children, className, id,
}: {
  open: boolean;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          id={id}
          className={`m-collapse${className ? ` ${className}` : ""}`}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1, transition: { height: mT(M_DUR.base), opacity: mT(M_DUR.base, 0.04) } }}
          exit={{ height: 0, opacity: 0, transition: { height: mT(M_DUR.base), opacity: mT(M_DUR.fast) } }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── شیت/مودال ──────────────────────────────────────────────── */
function useIsNarrow(bp = 560) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width:${bp}px)`);
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [bp]);
  return narrow;
}

export function MentorSheet({
  open, onClose, title, labelledBy, size = "md", dismissible = true, role = "dialog", children,
}: {
  open: boolean;
  onClose: () => void;
  /** عنوانِ سرِ شیت با دکمه‌ی بستن؛ بدونِ آن سر نمایش داده نمی‌شود */
  title?: string;
  labelledBy?: string;
  size?: "sm" | "md" | "lg";
  /** false: کلیکِ پس‌زمینه و Escape نمی‌بندد (مثلاً هنگامِ ذخیره) */
  dismissible?: boolean;
  role?: "dialog" | "alertdialog";
  children: React.ReactNode;
}) {
  const narrow = useIsNarrow();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => {
      const el = panelRef.current;
      if (el && !el.contains(document.activeElement)) el.focus({ preventScroll: true });
    }, 30);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && dismissible) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); window.removeEventListener("keydown", onKey); prev?.focus?.({ preventScroll: true }); };
  }, [open, dismissible, onClose]);

  if (!mounted) return null;
  const from = narrow ? { opacity: 1, y: "100%" } : { opacity: 0, y: 8, scale: 0.98 };
  const to = narrow ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, scale: 1 };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={`m-sheet-wrap${narrow ? " is-bottom" : ""}`} key="m-sheet">
          <LockBodyScroll />
          <motion.div
            className="m-sheet-backdrop"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: mT(M_DUR.base) }}
            exit={{ opacity: 0, transition: mT(M_DUR.fast) }}
            onClick={() => dismissible && onClose()}
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role={role}
            aria-modal="true"
            aria-labelledby={labelledBy ?? (title ? titleId : undefined)}
            className={`modal-panel open m-sheet is-${size}`}
            initial={from}
            animate={{ ...to, transition: mT(narrow ? M_DUR.slow : M_DUR.base) }}
            exit={{ ...from, transition: mT(M_DUR.fast) }}
          >
            {narrow && <span className="m-sheet-grip" aria-hidden />}
            {title && (
              <div className="m-sheet-head">
                <h2 id={titleId} className="m-sheet-title">{title}</h2>
                {dismissible && (
                  <button type="button" className="trade-icon-btn" aria-label="بستن" onClick={onClose}>
                    <X size={16} strokeWidth={1.75} aria-hidden />
                  </button>
                )}
              </div>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
