"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { AccountBackButton } from "./AccountBackButton";

/**
 * پایه‌های مشترکِ همه‌ی زیرصفحه‌های پنل کاربری.
 *
 * قبلا هر صفحه ترکیبِ خودش را از `account-card` / `domain-sub` /
 * `AccountSectionCard` / کارتِ تودرتو می‌ساخت و نتیجه این بود که دو صفحه‌ی
 * کنار هم شبیه دو اپِ متفاوت بودند. حالا همه از همین سه تکه استفاده
 * می‌کنند و فیلدهای ورودی هم همان `AuthField` صفحه‌های ورود/ثبت‌نام‌اند —
 * یعنی پنل کاربری با بقیه‌ی اپ یک‌زبان است.
 */

/** سرصفحه‌ی هر زیرصفحه: بازگشت + عنوان + یک خط توضیح */
export function AccountPageHead({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="acc-head">
      <AccountBackButton />
      <h1>{title}</h1>
      {hint && <p className="acc-head-hint">{hint}</p>}
    </div>
  );
}

/**
 * یک بخشِ صفحه: عنوانِ کوچک + (اختیاری) توضیح + بدنه.
 * عمدا بدونِ کارتِ تودرتو — فقط یک قابِ مویی. `flush` برای وقتی‌ست که
 * بدنه خودش ردیف‌های جداشده دارد و نباید padding بگیرد.
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
    <motion.section
      className="acc-block"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index, 5) * 0.04, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* طبقِ درخواستِ صریح، تایتل/توضیح دیگر بالای باکس شناور نیستند —
          داخلِ همان باکسِ اطلاعات می‌نشینند. */}
      <div className={`acc-block-body${flush ? " flush" : ""}`}>
        {title && (
          <h2 className="acc-block-title">
            {icon}
            {title}
          </h2>
        )}
        {desc && <p className="acc-block-desc">{desc}</p>}
        {children}
      </div>
    </motion.section>
  );
}

/** ردیفِ «برچسب + مقدار (+ اکشن)» — برای فیلدهای فقط‌خواندنی و لینک‌ها */
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
      {icon && <span className="acc-line-icon">{icon}</span>}
      <span className="acc-line-body">
        <span className="acc-line-label">{label}</span>
        {value !== undefined && (
          <span className={`acc-line-value${mono ? " mono" : ""}`} dir={mono ? "ltr" : undefined}>{value}</span>
        )}
      </span>
      {action}
    </>
  );
  if (href) {
    return (
      <a className="acc-line" href={href} {...(external ? { target: "_blank", rel: "me noopener noreferrer" } : {})}>
        {body}
      </a>
    );
  }
  return <div className="acc-line">{body}</div>;
}

/**
 * نوارِ ذخیره‌ی ته بخش — یک دکمه و بس.
 *
 * طبقِ درخواستِ صریحِ کاربر، خودِ دکمه سه حالت را نشان می‌دهد و دیگر هیچ
 * «ذخیره شد»ی زیرش نوشته نمی‌شود: موقعِ ذخیره فقط یک دایره‌ی لودینگ،
 * بعدش یک تیکِ سبز اگر موفق بود، و اگر نبود متنِ خطا (دکمه هم علامتِ
 * هشدار می‌گیرد).
 */
export function AccountSaveBar({
  onSave, saving, saved, error, label = "ذخیره تغییرات", disabled,
}: {
  onSave: () => void;
  saving?: boolean;
  saved?: boolean;
  error?: string | null;
  label?: string;
  disabled?: boolean;
}) {
  const state = saving ? "saving" : saved ? "ok" : error ? "bad" : "idle";
  return (
    <div className="acc-savebar">
      {error && <div className="field-error-msg" style={{ display: "block" }}>{error}</div>}
      {/* دکمه سمتِ چپ (پایانِ ردیف در RTL) */}
      <button
        type="button"
        className={`account-outline-btn acc-save-btn is-${state}`}
        onClick={onSave}
        disabled={saving || disabled}
        aria-label={label}
      >
        {state === "saving" ? <Loader2 size={16} className="trade-spin" />
          : state === "ok" ? <Check size={16} />
          : state === "bad" ? <AlertTriangle size={16} />
          : label}
      </button>
    </div>
  );
}

/**
 * یک «گزینه» داخلِ یک بخش — فقط نامِ گزینه بالای خودش، بدونِ قاب/کارتِ جدا.
 *
 * طبقِ درخواستِ صریحِ کاربر برای صفحه‌ی تنظیمات: «ترید یک بخش باشه، فقط
 * بالای هر گزینه اسمشو بنویسه». قبلا هر گزینه یک `AccountBlock` کامل
 * (تیتر + قابِ مستقل) بود و یک صفحه‌ی تنظیمات شبیه هشت کارتِ پشت‌سرهم
 * می‌شد.
 */
export function AccountOption({
  label, desc, children,
}: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="acc-option">
      <div className="acc-option-label">{label}</div>
      {desc && <p className="acc-option-desc">{desc}</p>}
      {children}
    </div>
  );
}
