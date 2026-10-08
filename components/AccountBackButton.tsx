"use client";

import Link from "next/link";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { tr, isEn } from "@/lib/i18n";

// دکمه‌ی «بازگشت» بالای هر زیرصفحه‌ی پنل کاربری — دقیقا هم‌الگوی دکمه‌ی
// بازگشت بخش ترید (TradePageShell): یک لینک آیکونی + متن، بدون بک‌گراند.
// پیش‌فرض به /account برمی‌گرده (فهرست بخش‌ها)، ولی هر مقصد دیگه‌ای هم
// می‌شه داد (مثلا از زیرصفحه‌های /account/modules به /account/general).
export function AccountBackButton({ href = "/account", label = tr("بازگشت", "Back") }: { href?: string; label?: string }) {
  return (
    <Link href={href} className="account-back-btn">
      {isEn() ? <ChevronLeft size={17} /> : <ChevronRight size={17} />}
      <span>{label}</span>
    </Link>
  );
}
