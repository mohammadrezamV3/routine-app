"use client";

import Image from "next/image";
import Link from "next/link";

/** فلش بازگشت به صفحه اصلی — داخل خودِ باکس (بدون بک‌گراند، فقط آیکون).
 * پیش‌فرض بالا-چپه چون توی ویزارد ثبت‌نام، دکمه‌ی «گام قبل» بالا-راستِ
 * همون باکسه و تداخل پیدا می‌کنه؛ فقط لاگین صریحاً راست رو می‌خواد. */
export function AuthBackButton({ side = "left" }: { side?: "left" | "right" }) {
  return (
    <Link href="/" className={`auth-home-btn${side === "right" ? " auth-home-btn-right" : ""}`} aria-label="بازگشت به صفحه اصلی">
      <svg viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12l6-6M5 12l6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </Link>
  );
}

/** نشان برند، داخل باکس — subtitle اختیاریه (فقط لاگین ازش استفاده می‌کنه) */
export function AuthBrandMark({ subtitle }: { subtitle?: string }) {
  return (
    <div className="auth-brand-mark-wrap">
      <div className="auth-brand-mark" aria-hidden="true">
        <Image src="/images/logo-icon.png" alt="" fill sizes="38px" className="object-contain" />
      </div>
      {subtitle && <p className="auth-brand-subtitle">{subtitle}</p>}
    </div>
  );
}
