"use client";

import type { ReactNode } from "react";
import { useSession } from "next-auth/react";

/**
 * نمایش دکمه‌ی ورود/ثبت‌نام فقط برای مهمان (صفحه‌های عمومی مثل درباره و مقاله‌ها).
 *
 * سشن از layout ریشه (که همیشه dynamic است) به SessionProvider داده می‌شه، پس برای کاربر واردشده
 * وضعیت از همون رندر اول سرور هم "authenticated" است و کلاینت هیدریت می‌کنه بدون ناهماهنگی.
 * برای مهمان وضعیت اول "loading" و بعد "unauthenticated" می‌شه؛ در هر دو حالت همون CTA مهمان
 * نشون داده می‌شه (HTML سرور برای سئو کامل می‌مونه) و فقط "authenticated" جایگزینش می‌کنه.
 */
export function AuthAwareCta({ guest, authed = null }: { guest: ReactNode; authed?: ReactNode }) {
  const { status } = useSession();
  return <>{status === "authenticated" ? authed : guest}</>;
}
