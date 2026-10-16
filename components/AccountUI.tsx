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
            <div className="ap-block-head-text">
              <h2 className="ap-block-title">{title}</h2>
              {desc && <p className="ap-block-sub">{desc}</p>}
            </div>
          </div>
        )}
        {desc && !title && <p className="ap-block-desc">{desc}</p>}
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
 * نوار ذخیره‌ی ته بخش — یک دکمه‌ی اصلی (btn-primary) و بس، آخر ردیف.
 *
 * طبق درخواست صریح کاربر، خود دکمه حالت‌ها را نشان می‌دهد و دیگر هیچ
 * «ذخیره شد»ی زیرش نوشته نمی‌شود: موقع ذخیره فقط دایره‌ی لودینگ داخل
 * دکمه (برچسب نامرئی، عرض ثابت)، بعدش یک تیک اگر موفق بود، و اگر نبود
 * متن خطا بالای دکمه (دکمه علامت هشدار می‌گیرد). `submit` یعنی دکمه
 * type=submit باشد (داخل <form>، با Enter). موبایل: تمام‌عرض و بزرگ (50).
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
        className={`btn btn-primary ap-save-btn${saving ? " is-loading" : ""}`}
        onClick={submit ? undefined : onSave}
        disabled={saving || disabled}
        aria-label={label}
        aria-busy={saving || undefined}
      >
        {saving && <Spinner className="btn-spinner" size={16} label={null} />}
        {state === "ok" ? <Check size={17} aria-hidden="true" />
          : state === "bad" ? <><AlertTriangle size={16} aria-hidden="true" />{label}</>
          : label}
      </button>
    </div>
  );
}

/**
 * پاورقی چسبان «تغییرات ذخیره‌نشده» (ردیف اقدام طراحی): فقط وقتی `visible`
 * (فرم تغییر کرده) دیده می‌شود. ترتیب: پیام، «لغو» (btn-ghost)، «ذخیره
 * تغییرات» (btn-primary، آخر ردیف). نقش status دارد تا صفحه‌خوان ظاهرشدنش
 * را بگوید. خطا بالای نوار می‌آید و دکمه‌ها بسته نمی‌شوند.
 */
export function AccountActionBar({
  visible, onSave, onCancel, saving, saved, error, saveLabel = tr("ذخیره تغییرات", "Save changes"), cancelLabel = tr("لغو", "Cancel"),
  message = tr("تغییرات ذخیره نشده داری", "You have unsaved changes"), submit = true,
}: {
  visible: boolean;
  onSave?: () => void;
  onCancel: () => void;
  saving?: boolean;
  /** ذخیره تازه انجام شد: دکمه‌ی اصلی یک تیک نشان می‌دهد و «لغو» پنهان می‌شود (چند لحظه، قبل از بسته‌شدن نوار) */
  saved?: boolean;
  error?: string | null;
  saveLabel?: string;
  cancelLabel?: string;
  message?: string;
  submit?: boolean;
}) {
  if (!visible) return null;
  return (
    <div className="ap-actionbar" role="region" aria-label={message}>
      {error && <div className="field-error-msg ap-actionbar-error" role="alert" style={{ display: "block" }}>{error}</div>}
      <div className="ap-actionbar-row">
        <span className="ap-actionbar-msg" role="status">{saved ? "" : message}</span>
        {!saved && <button type="button" className="btn btn-ghost ap-actionbar-cancel" onClick={onCancel} disabled={saving}>{cancelLabel}</button>}
        <button
          type={submit ? "submit" : "button"}
          className={`btn btn-primary${saving ? " is-loading" : ""}`}
          onClick={submit ? undefined : onSave}
          disabled={saving}
          aria-busy={saving || undefined}
          aria-label={saveLabel}
        >
          {saving && <Spinner className="btn-spinner" size={16} label={null} />}
          {saved ? <Check size={17} aria-hidden="true" /> : saveLabel}
        </button>
      </div>
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
