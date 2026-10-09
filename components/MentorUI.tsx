"use client";

import "./mentor.css";
import Link from "next/link";
import { createContext, useContext, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { M_DUR, mT } from "./MentorMotion";
import { tr } from "@/lib/i18n";

/**
 * پایه‌های مشترک بخش منتورها (سمت شاگرد و سمت منتور). همه از کلاس‌های
 * موجود سایت ساخته شده‌اند (acc-block، rp-empty، trade-surface) به‌علاوه‌ی
 * چیدمان mentor.css. بک‌گراند تازه اضافه نمی‌کنند.
 * مشخصات استفاده: scratchpad/design-spec.md
 *
 * ── «یک صفحه = یک ظرف» (دور ۳) ───────────────────────────────
 *   <MentorPage> … </MentorPage>
 *     یک سطح بیرونی واحد (trade-surface) برای کل محتوای صفحه. هر
 *     MentorSection داخلش خودبه‌خود «تخت» می‌شود: بی‌قاب، فقط عنوان + خط
 *     مو بالای هر بخش (بخش اول خط ندارد). flush هم کار می‌کند (ردیف‌ها
 *     لبه‌به‌لبه). MentorEmptyState و MentorErrorState داخل آن قاب دوم
 *     نمی‌گیرند. هر محتوای دیگری (تب، فرم، اطلاعیه) پدینگ 16 سطح را دارد.
 *     ورود نرم (fade) دارد و بخش‌های داخلش با پله‌ی کوتاه ظاهر می‌شوند.
 *   - سمت منتور: MentorDashShell خودش محتوا را در MentorPage می‌گذارد
 *     (`surface={false}` برای خاموش‌کردن).
 *   - سمت شاگرد: <MentorPageShell surface> همین کار را می‌کند؛ یا خودتان
 *     <MentorPage> را دور بخش دلخواه بگذارید. گرید کارت‌ها (mentor-grid)
 *     و شیت/مودال از این قانون مستثنا هستند؛ آن‌ها را بیرون MentorPage بگذارید.
 *   - `useMentorFlat()` → true اگر داخل MentorPage هستید (برای قاب سفارشی).
 *   - `desc` در MentorSection و `hint` در شل‌ها دیگر رندر نمی‌شوند (قانون
 *     «بدون زیرعنوان»). راهنمای لازم فیلد فقط `MentorField hint`.
 *   - حرکت: components/MentorMotion.tsx (API در سر همان فایل).
 */

export type MentorTone = "neutral" | "accent" | "info" | "ok" | "warn" | "danger";

/** اندازه‌ی استاندارد آیکون‌ها در این بخش */
export const MI = { chip: 13, btnSm: 14, btn: 15, row: 16, section: 15, empty: 24 } as const;
/** strokeWidth استاندارد آیکون‌های lucide در این بخش */
export const MI_STROKE = 1.75;

/* ── ظرف صفحه ───────────────────────────────────────────────── */
type FlatCtx = { flat: boolean; next: () => number };
const MentorFlatContext = createContext<FlatCtx>({ flat: false, next: () => 0 });

/** true داخل MentorPage (بخش‌ها تخت‌اند و قاب دوم نمی‌گیرند) */
export function useMentorFlat() {
  return useContext(MentorFlatContext).flat;
}

/**
 * یک سطح بیرونی برای کل صفحه؛ بخش‌های داخل با عنوان + خط مو جدا می‌شوند.
 * بخش‌هایی که در یک «دسته» mount می‌شوند (مثلا پس از بارگذاری) با فاصله‌ی
 * 40ms پشت هم ظاهر می‌شوند؛ سقف 8 پله.
 */
export function MentorPage({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  const batch = useRef({ n: 0, t: 0 });
  const ctx = useRef<FlatCtx>({
    flat: true,
    next: () => {
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      if (now - batch.current.t > 120) batch.current.n = 0;
      batch.current.t = now;
      return batch.current.n++;
    },
  });
  return (
    <MentorFlatContext.Provider value={ctx.current}>
      <motion.div
        id={id}
        className={`trade-surface mentor-surface${className ? ` ${className}` : ""}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={mT(M_DUR.base)}
      >
        {children}
      </motion.div>
    </MentorFlatContext.Provider>
  );
}

/**
 * یک بخش صفحه. داخل MentorPage: تخت (عنوان + خط مو، بی‌قاب). بیرون آن:
 * قاب acc-block با عنوان داخل قاب. شمارنده و یک اکشن اختیاری در انتهای
 * همان ردیف عنوان. `flush` برای وقتی‌ست که بدنه ردیف‌های لبه‌به‌لبه
 * (MentorRow) دارد. `desc` دیگر رندر نمی‌شود (بدون زیرعنوان).
 */
export function MentorSection({
  title, icon, count, action, flush = false, id, children,
}: {
  title?: string;
  icon?: React.ReactNode;
  count?: number | string;
  action?: React.ReactNode;
  /** @deprecated زیرعنوان بخش حذف شد؛ نادیده گرفته می‌شود */
  desc?: string;
  flush?: boolean;
  id?: string;
  children: React.ReactNode;
}) {
  const { flat, next } = useContext(MentorFlatContext);
  const [order] = useState(() => (flat ? next() : 0));
  const head = (title || action) && (
    <div className="mentor-section-head">
      {title ? (
        <h2 className="acc-block-title">
          {icon}
          {title}
          {count !== undefined && <span className="mentor-count">{count}</span>}
        </h2>
      ) : <span />}
      {action && <div className="mentor-section-action">{action}</div>}
    </div>
  );

  if (flat) {
    return (
      <motion.section
        className={`mentor-section is-flat${flush ? " flush" : ""}`}
        id={id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={mT(M_DUR.base, Math.min(order, 8) * 0.04)}
      >
        {head}
        {children}
      </motion.section>
    );
  }

  return (
    <section className="acc-block mentor-section" id={id}>
      <div className={`acc-block-body${flush ? " flush" : ""}`}>
        {head}
        {children}
      </div>
    </section>
  );
}

/** عنوان بخش بیرون از قاب — فقط بالای گرید کارت‌ها */
export function MentorSectionTitle({
  icon, children, count, action,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  count?: number | string;
  action?: React.ReactNode;
}) {
  return (
    <h2 className="mentor-section-title">
      {icon}
      {children}
      {count !== undefined && <span className="mentor-count">{count}</span>}
      {action && <span className="mentor-section-action">{action}</span>}
    </h2>
  );
}

/**
 * ردیف لیست: [lead] [عنوان + زیرعنوان] [end]. با `href` لینک است و
 * شورون می‌گیرد (مگر `chevron={false}`). اکشن‌ها داخل `end` می‌روند؛
 * اگر ردیف لینک است، اکشن کلیک‌پذیر داخلش نگذارید — از `below` استفاده کنید.
 */
export function MentorRow({
  href, lead, title, sub, end, below, chevron, onClick, ariaLabel,
}: {
  href?: string;
  lead?: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
  end?: React.ReactNode;
  /** محتوای زیر ردیف (نقل‌قول، دکمه‌ها) — ردیف را دوطبقه می‌کند */
  below?: React.ReactNode;
  chevron?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const showChevron = chevron ?? !!href;
  const inner = (
    <>
      {lead && <span className="mentor-row-lead">{lead}</span>}
      <span className="mentor-row-body">
        <span className="mentor-row-title">{title}</span>
        {sub && <span className="mentor-row-sub">{sub}</span>}
      </span>
      {(end || showChevron) && (
        <span className="mentor-row-end">
          {end}
          {showChevron && <ChevronLeft size={MI.row} strokeWidth={MI_STROKE} className="mentor-row-chevron dir-flip" aria-hidden />}
        </span>
      )}
    </>
  );

  if (below) {
    return (
      <div className="mentor-row is-stacked">
        {href ? (
          <Link href={href} prefetch={false} className="mentor-row-main" aria-label={ariaLabel}>{inner}</Link>
        ) : (
          <div className="mentor-row-main">{inner}</div>
        )}
        {below}
      </div>
    );
  }
  if (href) {
    return (
      <Link href={href} prefetch={false} className="mentor-row" onClick={onClick} aria-label={ariaLabel}>
        {inner}
      </Link>
    );
  }
  return <div className="mentor-row">{inner}</div>;
}

/** چیپ وضعیت: یک خط، آیکون 13 + متن کوتاه (حداکثر ~۳ کلمه) */
export function MentorChip({
  tone = "neutral", icon, title, children,
}: {
  tone?: MentorTone;
  icon?: React.ReactNode;
  /** توضیح بلندتر در tooltip */
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={`mentor-chip is-${tone}`} title={title}>
      {icon}
      <span>{children}</span>
    </span>
  );
}

/**
 * اطلاعیه‌ی فشرده‌ی درون‌صفحه: یک ردیف، عنوان کوتاه + یک جمله + حداکثر یک
 * اکشن. برای وضعیت‌هایی که کاربر باید کاری بکند (پروفایل منتشر نشده،
 * حساب معلق). وضعیت صرفا اطلاعاتی = MentorChip، نه این.
 */
export function MentorNotice({
  tone = "info", icon, title, children, action,
}: {
  tone?: Exclude<MentorTone, "neutral" | "accent">;
  icon?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className={`mentor-notice is-${tone}`} role={tone === "danger" ? "alert" : "status"}>
      {icon && <span className="mentor-notice-icon">{icon}</span>}
      <div className="mentor-notice-text">
        <span className="mentor-notice-title">{title}</span>
        {children && <span className="mentor-notice-body">{children}</span>}
      </div>
      {action && <div className="mentor-notice-action">{action}</div>}
    </div>
  );
}

/** خالی داخل یک بخش: یک خط متن، بدون قاب */
export function MentorEmpty({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <p className="mentor-empty">
      {icon}
      <span>{children}</span>
    </p>
  );
}

/** خالی کل صفحه: همان rp-empty رودمپ‌ها — آیکون، عنوان، یک جمله، حداکثر یک اکشن */
export function MentorEmptyState({
  icon, title, text, action,
}: {
  icon: React.ReactNode;
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  const flat = useMentorFlat();
  return (
    <div className={flat ? "rp-empty mentor-empty-flat" : "trade-surface rp-empty"}>
      <span className="rp-empty-icon">{icon}</span>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      {action && <div className="mentor-btn-group">{action}</div>}
    </div>
  );
}

/** فیلد فرم: برچسب بالا، ورودی، راهنما یا خطا زیرش */
export function MentorField({
  label, htmlFor, optional, hint, error, children,
}: {
  label: string;
  htmlFor?: string;
  optional?: boolean;
  hint?: React.ReactNode;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="mentor-field">
      <label className="mentor-field-label" htmlFor={htmlFor}>
        {label}
        {optional && <span className="is-optional">{tr("(اختیاری)", "(optional)")}</span>}
      </label>
      {children}
      {error ? <p className="mentor-field-error" role="alert">{error}</p> : hint ? <p className="mentor-field-hint">{hint}</p> : null}
    </div>
  );
}
