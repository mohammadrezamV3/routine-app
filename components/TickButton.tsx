"use client";

// تیک واحد کل اپ — کپی دقیق تیک «برنامه‌های امروز» داشبورد
// (DashboardToday → .db-tl-node): دایره با بوردر خاکستری، با تیک‌خوردن
// گرادیان --ring-1 با درخشش، تیک که با pathLength کشیده می‌شه (0.35s)،
// موج حلقه‌ای (ripple) و ۸ جرقه که فقط لحظه‌ی تیک‌خوردن پخش می‌شن، و
// کوچک‌شدن زیر انگشت (whileTap 0.8). هرجا تیک/چک‌باکس هست از همین استفاده کن.
//
// • state="missed": بوردر خط‌چین نارنجی (همون «وقتش گذشته»ی داشبورد)
// • shape="square": همون انیمیشن با گوشه‌ی گرد — برای چک‌باکس‌های تنظیمات/فرم
// • as="span": فقط نمایش (داخل یک <label> یا دکمه‌ی دیگه) — کلیک رو والد می‌گیره

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

export type TickButtonProps = {
  checked: boolean;
  onToggle?: () => void;
  /** قطر به پیکسل (پیش‌فرض همون ۲۶  داشبورد) */
  size?: number;
  state?: "idle" | "missed";
  shape?: "circle" | "square";
  disabled?: boolean;
  label?: string;
  as?: "button" | "span";
  className?: string;
};

export function TickButton({ checked, onToggle, size = 26, state = "idle", shape = "circle", disabled = false, label, as = "button", className }: TickButtonProps) {
  // جرقه/موج فقط وقتی *همین الان* تیک خورد — نه موقع اولین رندر یک آیتم ازقبل‌تیک‌خورده
  const prev = useRef(checked);
  const [burst, setBurst] = useState(0);
  useEffect(() => {
    if (checked && !prev.current) setBurst((b) => b + 1);
    prev.current = checked;
  }, [checked]);

  const cls = [
    "tick-btn",
    shape === "square" ? "is-square" : "",
    checked ? "is-checked" : state === "missed" ? "is-missed" : "",
    disabled ? "is-disabled" : "",
    className ?? "",
  ].filter(Boolean).join(" ");
  const style = { ["--tick-size" as string]: `${size}px` } as React.CSSProperties;

  const inner = (
    <>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <motion.path
          d="m7 12.5 3.3 3.2L17 9"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ duration: 0.35, ease: EASE }}
        />
      </svg>
      <AnimatePresence>
        {burst > 0 && checked && (
          <motion.span
            key={burst}
            className="tick-ripple"
            initial={{ scale: 0.6, opacity: 0.7 }}
            animate={{ scale: 2.4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>
      {burst > 0 && checked && (
        <span key={`s${burst}`} className="tick-spark" aria-hidden="true">
          {Array.from({ length: 8 }, (_, k) => <i key={k} style={{ ["--i" as string]: k } as React.CSSProperties} />)}
        </span>
      )}
    </>
  );

  if (as === "span") {
    return <span className={cls} style={style} aria-hidden="true">{inner}</span>;
  }
  return (
    <motion.button
      type="button"
      className={cls}
      style={style}
      onClick={(e) => { e.stopPropagation(); if (!disabled) onToggle?.(); }}
      whileTap={disabled ? undefined : { scale: 0.8 }}
      disabled={disabled}
      aria-pressed={checked}
      aria-label={label}
    >
      {inner}
    </motion.button>
  );
}
