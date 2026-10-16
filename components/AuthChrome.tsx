"use client";

import Image from "next/image";
import { SmartLink as Link } from "@/components/SmartLink";
import { useTheme } from "./ThemeProvider";
import { tr } from "@/lib/i18n";
import { useSection } from "@/components/SectionProvider";
import { SECTION_META } from "@/lib/sections";

/** فلش بازگشت — داخل خود باکس، همیشه بالا-راست، بدون بک‌گراند، فقط آیکون.
 * پیش‌فرض به صفحه‌ی اصلی می‌ره؛ اگه onClick بدی (مثل ویزارد ثبت‌نام)
 * به‌جاش همون کار سفارشی (مثلا برگشت یه گام) رو انجام می‌ده — یه دکمه‌ی
 * بازگشت واحد، نه دو تا دکمه‌ی هم‌پوشان. */
export function AuthBackButton({ onClick }: { onClick?: () => void }) {
  const icon = (
    <svg viewBox="0 0 24 24" fill="none" className="dir-flip"><path d="M3 12h18M21 12l-7-6M21 12l-7 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
  );
  if (onClick) {
    return (
      <button type="button" className="auth-home-btn auth-home-btn-right" aria-label={tr("گام قبل", "Previous step")} onClick={onClick}>
        {icon}
      </button>
    );
  }
  return (
    <Link href="/" className="auth-home-btn auth-home-btn-right" aria-label={tr("بازگشت به صفحه اصلی", "Back to home")}>
      {icon}
    </Link>
  );
}

/** نشان برند، داخل باکس — subtitle اختیاریه؛ هر سه صفحه‌ی auth (ورود/
 * ثبت‌نام/فراموشی رمز) ازش برای تایتل زیر لوگو استفاده می‌کنن تا محل
 * تایتل بینشون یکسان بمونه. */
export function AuthBrandMark({ subtitle, note }: { subtitle?: string; note?: string }) {
  const { theme } = useTheme();
  const section = useSection();
  return (
    <div className="auth-brand-mark-wrap">
      {/* روی زیردامنه‌ی بخش، نشان رنگی همون بخش (PNG شفاف، هر دو تم) — همون
         اندازه‌ی لوگوی اصلی. دامنه‌ی اصلی (apex) همون لوگوی سبز قبلی با دو تم. */}
      <div className="auth-brand-mark" aria-hidden="true">
        {section ? (
          <Image
            src={SECTION_META[section].icon}
            alt="" fill sizes="38px" priority
            className="object-contain"
          />
        ) : (
          <>
            {/* هر دو نسخه هم‌زمان لود می‌شن (priority) و فقط با opacity جابه‌جا
               می‌شن — سوییچ تم منتظر دانلود تصویر جدید نمی‌مونه. */}
            <Image
              src="/images/logo-icon-dark-theme.png"
              alt="" fill sizes="38px" priority
              className={`object-contain transition-opacity duration-150${theme === "light" ? " opacity-0" : " opacity-100"}`}
            />
            <Image
              src="/images/logo-icon-light-theme.webp"
              alt="" fill sizes="38px" priority
              className={`object-contain transition-opacity duration-150${theme === "light" ? " opacity-100" : " opacity-0"}`}
            />
          </>
        )}
      </div>
      {subtitle && <p className="auth-brand-subtitle">{subtitle}</p>}
      {note && <p className="auth-brand-note">{note}</p>}
    </div>
  );
}
