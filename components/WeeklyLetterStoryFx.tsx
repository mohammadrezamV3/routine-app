"use client";

// جلوه‌های تایپوگرافی «داستان هفته»: ورود نقاب‌دار کلمه‌ها (هر کلمه از پشت یک
// پنجره‌ی overflow:hidden با translateY بالا میاد) و عدد اودومتری (هر رقم یک
// نوار عمودی 0 تا 9 که تا رقم نهایی می‌چرخه). فقط transform/opacity.
// کاهش حرکت و دستگاه ضعیف (useLite): کلمه‌ها فقط محو می‌شن، رقم‌ها مستقیم می‌شینن.
import { Fragment, useMemo } from "react";
import { motion, type Variants } from "framer-motion";
import { WL_EASE, useLite } from "./WeeklyLetterShared";
import { odometerCells } from "./WeeklyLetterUtils";

/**
 * متن با ورود نقاب‌دار کلمه‌به‌کلمه. حتما باید داخل یک اسلاید (motion با initial="enter"
 * و animate="center") باشه؛ زمان‌بندی از والد میاد و فقط stagger کلمه‌ها اینجاست.
 * متن اصلی برای صفحه‌خوان در یک span مخفی بصری می‌مونه.
 */
export function MaskText({ text, className, delay = 0.1, stagger = 0.06 }: { text: string; className?: string; delay?: number; stagger?: number }) {
  const lite = useLite();
  const words = useMemo(() => text.trim().split(/\s+/).filter(Boolean), [text]);
  const group: Variants = {
    enter: {},
    center: { transition: { staggerChildren: lite ? 0 : stagger, delayChildren: lite ? 0 : delay } },
  };
  const word: Variants = lite
    // y در هر دو حالت مشخصه: اگه lite بعد از رندر اول فعال بشه (data-perf در effect خونده می‌شه) y اولیه‌ی 115% نمی‌مونه
    ? { enter: { opacity: 0, y: "0%" }, center: { opacity: 1, y: "0%", transition: { duration: 0.3 } } }
    : { enter: { opacity: 1, y: "115%" }, center: { opacity: 1, y: "0%", transition: { duration: 0.8, ease: WL_EASE as never } } };
  return (
    <motion.span className={`wl-mt${className ? ` ${className}` : ""}`} variants={group}>
      <span className="wl-sr">{text}</span>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span className="wl-mask" aria-hidden="true">
            <motion.span className="wl-mask-in" variants={word}><span className="wl-mask-tx">{w}</span></motion.span>
          </span>{" "}
        </Fragment>
      ))}
    </motion.span>
  );
}

const STRIP = Array.from({ length: 20 }, (_, i) => i % 10);

function OdoDigit({ digit, delay, duration, lite }: { digit: number; delay: number; duration: number; lite: boolean }) {
  // نوار 20 خانه‌ای (دو دور 0..9): از 0 دور اول تا رقم نهایی در دور دوم می‌چرخه
  const to = `-${(10 + digit) * 5}%`;
  return (
    <span className="wl-odo-d" aria-hidden="true">
      <motion.span
        className="wl-odo-strip"
        initial={{ y: lite ? to : "0%" }}
        animate={{ y: to }}
        transition={lite ? { duration: 0 } : { duration, delay, ease: WL_EASE as never }}
      >
        {STRIP.map((d, i) => <i key={i}>{d}</i>)}
      </motion.span>
    </span>
  );
}

/** عدد اودومتری: «73»، «9/17»، «8.2»، «62%». کاراکترهای غیررقم ثابت می‌مونن؛ رقم‌های سمت راست‌تر کمی دیرتر می‌رسن. */
export function Odo({ value, className, delay = 0.5, duration = 1.35 }: { value: string; className?: string; delay?: number; duration?: number }) {
  const lite = useLite();
  const cells = useMemo(() => odometerCells(value), [value]);
  const digits = cells.filter((c) => c.kind === "digit").length;
  let seen = 0;
  return (
    <span className={`wl-odo${className ? ` ${className}` : ""}`} dir="ltr" role="img" aria-label={value}>
      {cells.map((c, i) => {
        if (c.kind === "char") return <span key={i} className="wl-odo-c" aria-hidden="true">{c.ch}</span>;
        const idx = seen++;
        // رقم آخر (یکان) کمی بعد از رقم‌های قبلی تموم می‌شه
        return <OdoDigit key={`${i}-${c.digit}`} digit={c.digit} delay={delay + idx * 0.09} duration={duration + (digits > 1 ? idx * 0.12 : 0)} lite={lite} />;
      })}
    </span>
  );
}
