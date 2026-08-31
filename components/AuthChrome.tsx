"use client";

import Image from "next/image";
import Link from "next/link";
import { useTheme } from "./ThemeProvider";

/** فلش بازگشت — داخل خودِ باکس، همیشه بالا-راست، بدون بک‌گراند، فقط آیکون.
 * پیش‌فرض به صفحه‌ی اصلی می‌ره؛ اگه onClick بدی (مثلِ ویزاردِ ثبت‌نام)
 * به‌جاش همون کار سفارشی (مثلاً برگشت یه گام) رو انجام می‌ده — یه دکمه‌ی
 * بازگشتِ واحد، نه دو تا دکمه‌ی هم‌پوشان. */
export function AuthBackButton({ onClick }: { onClick?: () => void }) {
  const icon = (
    <svg viewBox="0 0 24 24" fill="none"><path d="M3 12h18M21 12l-7-6M21 12l-7 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
  );
  if (onClick) {
    return (
      <button type="button" className="auth-home-btn auth-home-btn-right" aria-label="گام قبل" onClick={onClick}>
        {icon}
      </button>
    );
  }
  return (
    <Link href="/" className="auth-home-btn auth-home-btn-right" aria-label="بازگشت به صفحه اصلی">
      {icon}
    </Link>
  );
}

/** نشان برند، داخل باکس — subtitle اختیاریه؛ هر سه صفحه‌ی auth (ورود/
 * ثبت‌نام/فراموشی رمز) ازش برای تایتلِ زیرِ لوگو استفاده می‌کنن تا محلِ
 * تایتل بینشون یکسان بمونه. */
export function AuthBrandMark({ subtitle }: { subtitle?: string }) {
  const { theme } = useTheme();
  const iconSrc = theme === "light" ? "/images/logo-icon-light-theme.png" : "/images/logo-icon-dark-theme.png";
  return (
    <div className="auth-brand-mark-wrap">
      <div className="auth-brand-mark" aria-hidden="true">
        <Image src={iconSrc} alt="" fill sizes="38px" className="object-contain" />
      </div>
      {subtitle && <p className="auth-brand-subtitle">{subtitle}</p>}
    </div>
  );
}
