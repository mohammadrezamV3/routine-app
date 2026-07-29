"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";

/** فلش بازگشت به صفحه اصلی — داخل خودِ باکس (بدون بک‌گراند، فقط آیکون).
 * پیش‌فرض بالا-چپه چون توی ویزارد ثبت‌نام، دکمه‌ی «گام قبل» بالا-راستِ
 * همون باکسه و تداخل پیدا می‌کنه؛ فقط لاگین صریحاً راست رو می‌خواد. */
export function AuthBackButton({ side = "left" }: { side?: "left" | "right" }) {
  return (
    <Link href="/" className={`auth-home-btn${side === "right" ? " auth-home-btn-right" : ""}`} aria-label="بازگشت به صفحه اصلی">
      {side === "right" ? (
        <svg viewBox="0 0 24 24" fill="none"><path d="M3 12h18M21 12l-7-6M21 12l-7 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none"><path d="M21 12H3M3 12l7-6M3 12l7 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      )}
    </Link>
  );
}

/** دکمه‌ی ورود واقعی با گوگل — signIn("google") next-auth رو صدا می‌زنه.
 * برای فعال‌شدنِ کامل، GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET باید توی env
 * دیپلوی ست بشه (از Google Cloud Console)؛ خودِ دکمه بدون اون‌ها هم کار
 * می‌کنه ولی گوگل درخواست رو رد می‌کنه. */
export function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);
  return (
    <button
      type="button"
      className="auth-google-btn"
      disabled={loading}
      data-anim-field
      onClick={() => { setLoading(true); signIn("google", { callbackUrl: "/" }); }}
    >
      <span className="auth-google-badge" aria-hidden="true">
        <svg viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.6 20.5h-1.6V20H24v8h11.3c-1.6 4.9-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.3-.4-3.5z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.7 18.9 13 24 13c3.1 0 5.9 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3c-7.5 0-14 4.2-17.7 10.7z"/>
          <path fill="#4CAF50" d="M24 45c5.4 0 10.3-1.8 14.1-5l-6.5-5.5C29.6 36.5 26.9 37.5 24 37.5c-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.9 40.6 16.4 45 24 45z"/>
          <path fill="#1976D2" d="M43.6 20.5h-1.6V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.5 5.5C39.5 37.5 43 31.6 43 24c0-1.2-.1-2.3-.4-3.5z"/>
        </svg>
      </span>
      <span className="auth-google-label">{loading ? "در حال اتصال…" : "ورود با گوگل"}</span>
    </button>
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
