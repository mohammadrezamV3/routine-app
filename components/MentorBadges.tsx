"use client";

import "./mentor.css";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Award, Star } from "lucide-react";
import { MENTOR_CATEGORY_META, isMentorCategory } from "@/lib/mentorCategories";
import { faNum } from "@/lib/jalali";
import { M_DUR, mT } from "./MentorMotion";

/** برچسبِ فارسیِ یک دسته (کلیدِ ناشناخته همان‌طور نمایش داده می‌شود) */
export function categoryLabel(key: string): string {
  return isMentorCategory(key) ? MENTOR_CATEGORY_META[key].label : key;
}

function certLabel(key: string): string {
  return isMentorCategory(key) ? MENTOR_CATEGORY_META[key].certLabel : key;
}

/** «مدرک تغذیه» + کسره → «مدرک تغذیه‌ی» (کلمه‌ی مختوم به «ه») */
function withEzafe(s: string): string {
  return /ه$/.test(s) ? `${s}\u200cی` : s;
}

/**
 * جمله‌ی توضیحِ نشانِ مدرک — دقیقاً می‌گوید چه چیزی تأیید شده.
 * «مدرک مربیگری بدنسازی این منتور توسط ادمین‌های آریون بررسی و تأیید شده است»
 */
export function certificateSentence(categories: string[]): string {
  const labels = categories.map(certLabel);
  const joined = labels.length <= 1 ? labels.join("") : `${labels.slice(0, -1).join("، ")} و ${labels[labels.length - 1]}`;
  return `${withEzafe(joined)} این منتور توسط ادمین‌های آریون بررسی و تأیید شده است`;
}

/**
 * نشانِ مدرک کنارِ نام: یک آیکونِ کوچک (فقط وقتی مدرکِ تأییدشده‌ای هست).
 * احرازِ هویت برای همه‌ی منتورها اجباری است، پس نشانِ «هویت» وجود ندارد.
 * لمس/کلیک یا هاور (ماوس) یک پاپ‌آوِرِ کوچک باز می‌کند که دقیقاً توضیح می‌دهد
 * چه تأیید شده. دسترس‌پذیر: دکمه‌ی واقعی با aria-expanded/aria-controls،
 * Escape فوکوس را به دکمه برمی‌گرداند، لمسِ بیرون و اسکرول می‌بندد.
 * پاپ‌آوِر به body پورتال می‌شود تا قابِ کارت (overflow) بریده‌اش نکند.
 */
export function CertificateMark({
  certifications,
  size = 15,
}: {
  certifications: { category: string; verified: boolean }[];
  size?: number;
}) {
  const verified = certifications.filter((c) => c.verified).map((c) => c.category);
  const [open, setOpen] = useState(false);
  // باز شده با کلیک/لمس (سنجاق) یا فقط با هاورِ ماوس
  const pinned = useRef(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ y: number; left: number; below: boolean } | null>(null);
  const id = useId();
  const popId = `cert-pop-${id.replace(/:/g, "")}`;

  const close = useCallback((refocus = false) => {
    pinned.current = false;
    setOpen(false);
    if (refocus) btnRef.current?.focus();
  }, []);

  const place = useCallback(() => {
    const b = btnRef.current;
    if (!b) return;
    const r = b.getBoundingClientRect();
    const W = Math.min(260, window.innerWidth - 24);
    const center = r.left + r.width / 2;
    const left = Math.max(12, Math.min(window.innerWidth - 12 - W, center - W / 2));
    const below = r.bottom + 120 < window.innerHeight;
    // بالا: با bottom جای‌گذاری می‌شود (transformِ framer جای translateY را می‌گیرد)
    setPos({ y: below ? r.bottom + 8 : window.innerHeight - r.top + 8, left, below });
  }, []);

  useLayoutEffect(() => { if (open) place(); }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || popRef.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); close(true); } };
    const onScroll = () => close();
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, close]);

  useEffect(() => () => { if (hoverTimer.current) clearTimeout(hoverTimer.current); }, []);

  if (verified.length === 0) return null;
  const sentence = certificateSentence(verified);
  const label = verified.length === 1 ? `${certLabel(verified[0])} تأییدشده` : "مدارک تأییدشده";

  const hoverable = (e: React.PointerEvent) => e.pointerType === "mouse";

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="mentor-cert-mark"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? popId : undefined}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (open && pinned.current) close();
          else { pinned.current = true; setOpen(true); }
        }}
        onPointerEnter={(e) => {
          if (!hoverable(e)) return;
          if (hoverTimer.current) clearTimeout(hoverTimer.current);
          hoverTimer.current = setTimeout(() => setOpen(true), 120);
        }}
        onPointerLeave={(e) => {
          if (!hoverable(e)) return;
          if (hoverTimer.current) clearTimeout(hoverTimer.current);
          if (!pinned.current) hoverTimer.current = setTimeout(() => setOpen(false), 120);
        }}
      >
        <Award size={size} strokeWidth={1.75} aria-hidden />
      </button>
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && pos && (
              <motion.div
                ref={popRef}
                id={popId}
                role="note"
                className={`mentor-pop${pos.below ? "" : " is-above"}`}
                style={pos.below ? { top: pos.y, left: pos.left } : { bottom: pos.y, left: pos.left }}
                initial={{ opacity: 0, y: pos.below ? -4 : 4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1, transition: mT(M_DUR.fast) }}
                exit={{ opacity: 0, transition: mT(0.12) }}
                onPointerEnter={() => { if (hoverTimer.current) clearTimeout(hoverTimer.current); }}
                onPointerLeave={(e) => { if (e.pointerType === "mouse" && !pinned.current) setOpen(false); }}
              >
                <span className="mentor-pop-title"><Award size={13} strokeWidth={1.75} aria-hidden /> {label}</span>
                <span className="mentor-pop-text">{sentence}</span>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}

/** چیپِ یک دسته (بدون آیکون، رنگ متن) */
export function CategoryChip({ category }: { category: string }) {
  return <span className="mentor-chip is-cat"><span>{categoryLabel(category)}</span></span>;
}

/** برچسبِ کوچکِ حوزه/تخصص روی کارت و پروفایل (فشرده‌تر از چیپِ وضعیت) */
export function MentorTag({ children }: { children: React.ReactNode }) {
  return <span className="mentor-tag">{children}</span>;
}

/** امتیازِ فشرده در یک خط: ستاره + عدد + (تعداد) — برای کارت و سرِ پروفایل */
export function RatingInline({ value, count, withWord = false }: { value: number; count: number; withWord?: boolean }) {
  const v = Number.isFinite(value) ? Math.max(0, Math.min(5, value)) : 0;
  const none = count === 0 || v === 0;
  if (none) {
    return (
      <span className="mentor-rating-inline is-none">
        <Star size={13} strokeWidth={1.75} aria-hidden /> بدون امتیاز
      </span>
    );
  }
  return (
    <span className="mentor-rating-inline" aria-label={`امتیاز ${faNum(v.toFixed(1))} از ۵، ${faNum(count)} نظر`}>
      <Star size={13} strokeWidth={1.75} fill="currentColor" aria-hidden />
      <b>{faNum(v.toFixed(1))}</b>
      <span>({faNum(count)}{withWord ? " نظر" : ""})</span>
    </span>
  );
}

/** امتیاز به‌شکلِ پنج ستاره (نیم‌ستاره به نزدیک‌ترین ستاره‌ی کامل گرد می‌شود) + عدد */
export function RatingStars({ value, count }: { value: number; count?: number }) {
  const v = Number.isFinite(value) ? Math.max(0, Math.min(5, value)) : 0;
  const filled = Math.round(v);
  const none = count === 0 || v === 0;
  return (
    <span className="mentor-stars" aria-label={none ? "بدون امتیاز" : `امتیاز ${faNum(v.toFixed(1))} از ۵`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={13} strokeWidth={1.75} aria-hidden className={i <= filled && !none ? undefined : "is-empty"} fill={i <= filled && !none ? "currentColor" : "none"} />
      ))}
      {none ? (
        <span className="mentor-stars-count">بدون امتیاز</span>
      ) : (
        <>
          <span className="mentor-stars-value">{faNum(v.toFixed(1))}</span>
          {count !== undefined && <span className="mentor-stars-count">({faNum(count)} نظر)</span>}
        </>
      )}
    </span>
  );
}
