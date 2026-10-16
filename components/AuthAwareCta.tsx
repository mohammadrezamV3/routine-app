"use client";

import type { ReactNode } from "react";
import { useSession } from "next-auth/react";

/**
 * CTA مخصوص مهمان (ورود و ثبت‌نام) در صفحه‌های عمومی مثل درباره و مقاله‌ها.
 *
 * برای کاربر واردشده هیچ‌چیز رندر نمی‌شه: نه دکمه‌ی ورود/ثبت‌نام و نه لینک داشبورد.
 * سشن از layout ریشه (که همیشه dynamic است) به SessionProvider داده می‌شه، پس وضعیت
 * کاربر واردشده از رندر اول سرور هم معلومه و هیدریشن ناهماهنگ نمی‌شه. برای مهمان
 * وضعیت اول "loading" و بعد "unauthenticated" است و CTA مهمان نشون داده می‌شه
 * (HTML سرور برای سئو کامل می‌مونه).
 */
export function AuthAwareCta({ guest }: { guest: ReactNode }) {
  const { status } = useSession();
  if (status === "authenticated") return null;
  return <>{guest}</>;
}
