"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
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
      {title && (
        <h2 className="acc-block-title">
          {icon}
          {title}
        </h2>
      )}
      {desc && <p className="acc-block-desc">{desc}</p>}
      <div className={`acc-block-body${flush ? " flush" : ""}`}>{children}</div>
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

/** نوارِ ذخیره‌ی ته بخش — یک دکمه، یک پیام خطا، یک پیام موفقیت */
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
  return (
    <div className="acc-savebar">
      {error && <div className="field-error-msg" style={{ display: "block" }}>{error}</div>}
      {saved && <div className="account-save-toast">ذخیره شد.</div>}
      {/* طبقِ درخواستِ صریح: دکمه سمتِ چپ (پایانِ ردیف) و موقعِ ذخیره یک
          دایره‌ی لودینگ نشان می‌دهد، نه فقط متن. */}
      <button type="button" className="account-outline-btn" onClick={onSave} disabled={saving || disabled}>
        {saving ? (<><Loader2 size={14} className="trade-spin" /> در حال ذخیره…</>) : label}
      </button>
    </div>
  );
}
