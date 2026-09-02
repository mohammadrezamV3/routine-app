"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

// دکمه‌ی «بازگشت» بالای هر زیرصفحه‌ی پنل کاربری — دقیقا هم‌الگوی دکمه‌ی
// بازگشت بخش ترید (TradePageShell): یک لینک آیکونی + متن، بدون بک‌گراند.
// پیش‌فرض به /account برمی‌گرده (فهرست بخش‌ها)، ولی هر مقصد دیگه‌ای هم
// می‌شه داد (مثلا از زیرصفحه‌های /account/modules به /account/general).
export function AccountBackButton({ href = "/account", label = "بازگشت" }: { href?: string; label?: string }) {
  return (
    <Link href={href} className="account-back-btn">
      <ChevronRight size={17} />
      <span>{label}</span>
    </Link>
  );
}
