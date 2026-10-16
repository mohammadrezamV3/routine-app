"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { currentLocale, persistLocaleToAccount } from "@/lib/i18n";

// یک‌بار برای هر (دستگاه، زبان): کاربری که قبل از ذخیره‌ی زبان روی حساب، زبان رو عوض کرده بود یا
// روی دستگاه تازه وارد شده، زبان فعلی رو به سرور می‌گه. هیچ درخواستی روی لودهای بعدی نمی‌ره.
const KEY = "arion:langSynced";

export default function LangSync() {
  const { status, data } = useSession();
  const userId = (data?.user as { id?: string } | undefined)?.id ?? "";
  useEffect(() => {
    if (status !== "authenticated" || !userId) return;
    // کلید به ازای هر کاربر: حساب دوم روی همین دستگاه هم یک بار همگام می‌شه
    const key = `${KEY}:${userId}`;
    const locale = currentLocale();
    try {
      if (window.localStorage.getItem(key) === locale) return;
      window.localStorage.setItem(key, locale);
    } catch {
      return; // بدون localStorage هر بار درخواست نزن
    }
    persistLocaleToAccount(locale);
  }, [status, userId]);
  return null;
}
