"use client";

import Link from "next/link";

/** فلش بازگشت به صفحه اصلی — داخل خودِ باکس، بالا-چپ (بدون بک‌گراند، فقط آیکون) */
export function AuthBackButton() {
  return (
    <Link href="/" className="auth-home-btn" aria-label="بازگشت به صفحه اصلی">
      <svg viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12l6-6M5 12l6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </Link>
  );
}

/** نشان برند، داخل باکس */
export function AuthBrandMark() {
  return (
    <div className="auth-brand-mark" aria-hidden="true">ر</div>
  );
}
