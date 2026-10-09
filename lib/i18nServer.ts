// خواندن زبان درخواست جاری سمت سرور (کوکی arion_lang). فقط سرور.
import { cookies } from "next/headers";
import { LOCALE_COOKIE, normalizeLocale, registerServerLocaleGetter, type Locale } from "@/lib/i18n";

function readLocale(): Locale | null {
  try {
    return normalizeLocale(cookies().get(LOCALE_COOKIE)?.value);
  } catch {
    // بیرون از درخواست (زمان‌بند، build): پیش‌فرض
    return null;
  }
}

registerServerLocaleGetter(readLocale);

export function getLocale(): Locale {
  return readLocale() ?? "fa";
}

/** فقط برای اطمینان از ثبت گیرنده در ماژول‌هایی که مستقیم getLocale صدا نمی‌زنن */
export function ensureServerLocale() {
  registerServerLocaleGetter(readLocale);
}
