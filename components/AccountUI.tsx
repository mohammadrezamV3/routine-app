"use client";

import { AlertTriangle, Check } from "lucide-react";
import { AccountBackButton } from "./AccountBackButton";
import { Spinner } from "./Spinner";
import { tr } from "@/lib/i18n";

/**
 * پایه‌های مشترک همه‌ی زیرصفحه‌های پنل کاربری (نسخه‌ی ap-*).
 *
 * همه‌ی صفحه‌ها فقط از همین چند تکه ساخته می‌شن: سرصفحه، بلوک (کارت با
 * تیتر آیکون‌دار مثل کارت‌های داشبورد)، گزینه، خط و نوار ذخیره. فیلدها
 * همان `AuthField` صفحه‌های ورود/ثبت‌نام‌اند. استایل‌ها در
 * app/_area/account.css (بخش ap-*).
 */

/** سرصفحه‌ی هر زیرصفحه: بازگشت + عنوان (+ اکشن سمت پایان) + یک خط توضیح */
export function AccountPageHead({
  title, hint, backHref, backLabel, actions,
}: { title: string; hint?: string; backHref?: string; backLabel?: string; actions?: React.ReactNode }) {
  return (
    <header className="ap-head">
      <AccountBackButton href={backHref} label={backLabel} />
      <div className="ap-head-row">
        <h1>{title}</h1>
        {actions && <div className="ap-head-actions">{actions}</div>}
      </div>
      {hint && <p className="ap-head-hint">{hint}</p>}
    </header>
  );
}

/**
 * یک بخش صفحه: کارت با تیتر آیکون‌دار (+ توضیح اختیاری) و بدنه.
 * `flush` برای وقتی‌ست که بدنه خودش ردیف‌های لبه‌به‌لبه و جداشده دارد.
 * کلاس acc-block-body برای نور هاور مشترک باکس‌هاست (globals.css).
 */
export function AccountBlock({
  title, desc, icon, children, flush = false, index = 0,
}: {
  title?: string;
  desc?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  flush?: boolean;
  index?: number;
}) {
  return (
    <section className="ap-block m-rise" style={{ "--i": Math.min(index, 5) } as React.CSSProperties}>
      <div className={`acc-block-body ap-card ap-block-body${flush ? " flush" : ""}`}>
        {title && (
          <div className="ap-block-head">
            {icon && <span className="ap-block-icon" aria-hidden="true">{icon}</span>}
            <h2 className="ap-block-title">{title}</h2>
          </div>
        )}
        {desc && <p className="ap-block-desc">{desc}</p>}
        {title || desc ? <div className="ap-block-content">{children}</div> : children}
      </div>
    </section>
  );
}

/** ردیف «برچسب + مقدار (+ اکشن)» — برای فیلدهای فقط‌خواندنی و لینک‌ها */
export function AccountLine({
  icon, label, value, mono, action, href, external,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: React.ReactNode;
  mono?: boolean;
  action?: React.ReactNode;
  href?: string;
  external?: boolean;
}) {
  const body = (
    <>
      {icon && <span className="ap-line-icon" aria-hidden="true">{icon}</span>}
      <span className="ap-line-body">
        <span className="ap-line-label">{label}</span>
        {value !== undefined && (
          <span className={`ap-line-value${mono ? " mono" : ""}`} dir={mono ? "ltr" : undefined}>{value}</span>
        )}
      </span>
      {action}
    </>
  );
  if (href) {
    return (
      <a className="ap-line" href={href} {...(external ? { target: "_blank", rel: "me noopener noreferrer" } : {})}>
        {body}
      </a>
    );
  }
  return <div className="ap-line">{body}</div>;
}

/**
 * نوار ذخیره‌ی ته بخش — یک دکمه و بس.
 *
 * طبق درخواست صریح کاربر، خود دکمه سه حالت را نشان می‌دهد و دیگر هیچ
 * «ذخیره شد»ی زیرش نوشته نمی‌شود: موقع ذخیره فقط یک دایره‌ی لودینگ،
 * بعدش یک تیک اگر موفق بود، و اگر نبود متن خطا (دکمه هم علامت هشدار
 * می‌گیرد). `submit` یعنی دکمه type=submit باشد (داخل <form>، با Enter).
 */
export function AccountSaveBar({
  onSave, saving, saved, error, label = tr("ذخیره تغییرات", "Save changes"), disabled, submit = false,
}: {
  onSave?: () => void;
  saving?: boolean;
  saved?: boolean;
  error?: string | null;
  label?: string;
  disabled?: boolean;
  submit?: boolean;
}) {
  const state = saving ? "saving" : saved ? "ok" : error ? "bad" : "idle";
  return (
    <div className="ap-savebar">
      {error && <div className="field-error-msg" role="alert" style={{ display: "block" }}>{error}</div>}
      <button
        type={submit ? "submit" : "button"}
        className={`account-outline-btn ap-save-btn is-${state}`}
        onClick={submit ? undefined : onSave}
        disabled={saving || disabled}
        aria-label={label}
        aria-busy={saving || undefined}
      >
        {state === "saving" ? <Spinner size={15} />
          : state === "ok" ? <Check size={16} />
          : state === "bad" ? <AlertTriangle size={16} />
          : label}
      </button>
    </div>
  );
}

/**
 * یک «گزینه» داخل یک بلوک — نام گزینه بالای خودش، بدون قاب جدا؛ گزینه‌ها با
 * یک خط مویی از هم جدا می‌شن (طبق درخواست صریح: «ترید یک بخش باشه، فقط
 * بالای هر گزینه اسمشو بنویسه»).
 */
export function AccountOption({
  label, desc, children,
}: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="ap-option">
      <div className="ap-option-label">{label}</div>
      {desc && <p className="ap-option-desc">{desc}</p>}
      {children}
    </div>
  );
}

/** اسکلت سبک صفحه‌ی پنل تا بارگذاری داده (بدون پرش چیدمان) */
export function AccountSkeleton({ blocks = 2 }: { blocks?: number }) {
  return (
    <div className="ap-skel-page" role="status" aria-label={tr("در حال بارگذاری", "Loading")}>
      <span className="ap-skel" style={{ width: "42%", height: 28 }} />
      {Array.from({ length: blocks }, (_, i) => (
        <span key={i} className="ap-skel" style={{ height: i === 0 ? 180 : 140, borderRadius: 22 }} />
      ))}
    </div>
  );
}
