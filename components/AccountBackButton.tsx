"use client";

import { SmartLink as Link } from "@/components/SmartLink";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { tr, isEn } from "@/lib/i18n";

// لینک «بازگشت» بالای هر زیرصفحه‌ی پنل کاربری (مسیر نان‌ریز).
// وقتی مقصد خود /account باشه فقط روی موبایل/تبلت دیده می‌شه (روی دسکتاپ
// سایدبار همیشه کنار صفحه‌ست)؛ وقتی مقصد یک صفحه‌ی میانی باشه (مثلا
// تنظیمات > ترید) روی دسکتاپ هم دیده می‌شه تا راه برگشت یک‌کلیکی بمونه.
export function AccountBackButton({ href = "/account", label = tr("بازگشت", "Back") }: { href?: string; label?: string }) {
  const root = href === "/account";
  return (
    <Link href={href} className={`btn btn-ghost btn-sm ap-crumb${root ? " is-root" : ""}`}>
      {isEn() ? <ChevronLeft size={17} aria-hidden="true" /> : <ChevronRight size={17} aria-hidden="true" />}
      <span>{label}</span>
    </Link>
  );
}
