"use client";

import Link from "next/link";

/** فلش بازگشت به صفحه اصلی — بالای باکس، جای هدر سایت که توی صفحات ورود/ثبت‌نام مخفیه */
export function AuthBackButton() {
  return (
    <div className="auth-chrome-row">
      <Link href="/" className="auth-back-btn" aria-label="بازگشت به صفحه اصلی">
        <svg viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </Link>
    </div>
  );
}

/** نشان برند، داخل باکس */
export function AuthBrandMark() {
  return (
    <div className="auth-brand-mark" aria-hidden="true">ر</div>
  );
}
