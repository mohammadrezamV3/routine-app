"use client";

import Image from "next/image";
import Link from "next/link";

/** فلش بازگشت به صفحه اصلی — داخل خودِ باکس، بالا-چپ (بدون بک‌گراند، فقط آیکون) */
export function AuthBackButton() {
  return (
    <Link href="/" className="auth-home-btn" aria-label="بازگشت به صفحه اصلی">
      <svg viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12l6-6M5 12l6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </Link>
  );
}

/** نشان برند، داخل باکس — subtitle اختیاریه (فقط لاگین ازش استفاده می‌کنه) */
export function AuthBrandMark({ subtitle }: { subtitle?: string }) {
  return (
    <div className="auth-brand-mark-wrap">
      <div className="auth-brand-mark" aria-hidden="true">
        <Image src="/images/logo-icon.png" alt="" fill sizes="52px" className="object-contain" />
      </div>
      {subtitle && <p className="auth-brand-subtitle">{subtitle}</p>}
    </div>
  );
}
