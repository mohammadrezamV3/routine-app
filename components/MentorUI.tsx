"use client";

import "./mentor.css";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/**
 * پایه‌های مشترک بخش منتورها (سمت شاگرد و سمت منتور). همه از کلاس‌های
 * موجود سایت ساخته شده‌اند (acc-block، rp-empty، trade-surface) به‌علاوه‌ی
 * چیدمان mentor.css. هیچ‌کدام حرکت یا بک‌گراند اضافه نمی‌کند.
 * مشخصات استفاده: scratchpad/design-spec.md
 */

export type MentorTone = "neutral" | "accent" | "info" | "ok" | "warn" | "danger";

/** اندازه‌ی استاندارد آیکون‌ها در این بخش */
export const MI = { chip: 13, btnSm: 14, btn: 15, row: 16, section: 15, empty: 24 } as const;
/** strokeWidth استاندارد آیکون‌های lucide در این بخش */
export const MI_STROKE = 1.75;

/**
 * یک بخشِ صفحه: قاب acc-block با عنوانِ داخل قاب، شمارنده و یک اکشن
 * اختیاری در انتهای همان ردیف. `flush` برای وقتی‌ست که بدنه ردیف‌های
 * لبه‌به‌لبه (MentorRow) دارد.
 */
export function MentorSection({
  title, icon, count, action, desc, flush = false, id, children,
}: {
  title?: string;
  icon?: React.ReactNode;
  count?: number | string;
  action?: React.ReactNode;
  desc?: string;
  flush?: boolean;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="acc-block" id={id}>
      <div className={`acc-block-body${flush ? " flush" : ""}`}>
        {(title || action) && (
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
        )}
        {desc && <p className="acc-block-desc">{desc}</p>}
        {children}
      </div>
    </section>
  );
}

/** عنوان بخش بیرون از قاب — فقط بالای گریدِ کارت‌ها */
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
 * ردیفِ لیست: [lead] [عنوان + زیرعنوان] [end]. با `href` لینک است و
 * شِورون می‌گیرد (مگر `chevron={false}`). اکشن‌ها داخل `end` می‌روند؛
 * اگر ردیف لینک است، اکشنِ کلیک‌پذیر داخلش نگذارید — از `below` استفاده کنید.
 */
export function MentorRow({
  href, lead, title, sub, end, below, chevron, onClick, ariaLabel,
}: {
  href?: string;
  lead?: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
  end?: React.ReactNode;
  /** محتوای زیرِ ردیف (نقل‌قول، دکمه‌ها) — ردیف را دوطبقه می‌کند */
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
          {showChevron && <ChevronLeft size={MI.row} strokeWidth={MI_STROKE} className="mentor-row-chevron" aria-hidden />}
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
 * حساب معلق). وضعیتِ صرفاً اطلاعاتی = MentorChip، نه این.
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

/** خالیِ داخلِ یک بخش: یک خط متن، بدون قاب */
export function MentorEmpty({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <p className="mentor-empty">
      {icon}
      <span>{children}</span>
    </p>
  );
}

/** خالیِ کل صفحه: همان rp-empty رودمپ‌ها — آیکون، عنوان، یک جمله، حداکثر یک اکشن */
export function MentorEmptyState({
  icon, title, text, action,
}: {
  icon: React.ReactNode;
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="trade-surface rp-empty">
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
        {optional && <span className="is-optional">(اختیاری)</span>}
      </label>
      {children}
      {error ? <p className="mentor-field-error" role="alert">{error}</p> : hint ? <p className="mentor-field-hint">{hint}</p> : null}
    </div>
  );
}
