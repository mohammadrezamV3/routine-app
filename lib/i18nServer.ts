// خواندن زبان درخواست جاری سمت سرور (کوکی arion_lang). فقط سرور.
import { cookies } from "next/headers";
import { AsyncLocalStorage } from "node:async_hooks";
import { LOCALE_COOKIE, normalizeLocale, registerServerLocaleGetter, type Locale } from "@/lib/i18n";

// زبان «گیرنده»: وقتی سرور متنی برای کاربر دیگه می‌سازه (اعلان، پوش، یادآوری) زبان درخواست
// جاری مال فرستنده‌ست، نه گیرنده. runWithLocale زبان رو برای همه‌ی tr() های داخل تابع (و
// کدهای async که از اون صدا زده می‌شن) روی زبان گیرنده می‌ذاره.
const localeStore = new AsyncLocalStorage<Locale>();

function readLocale(): Locale | null {
  const forced = localeStore.getStore();
  if (forced) return forced;
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

/** اجرای fn با زبان مشخص (tr() داخلش اون زبان رو برمی‌گردونه) */
export function runWithLocale<T>(locale: Locale, fn: () => T): T {
  return localeStore.run(locale, fn);
}

/** مثل tr() ولی برای یک زبان مشخص: `trFor(locale, "فارسی", "English")` */
export function trFor(locale: Locale, fa: string, en: string): string {
  return locale === "en" ? en : fa;
}

/** کلید UserSetting که زبان ذخیره‌شده‌ی کاربر توشه (POST /api/settings/lang) */
export const LANG_SETTING_KEY = "lang";

/** زبان ذخیره‌شده‌ی یک کاربر؛ ناشناخته = فارسی */
export async function getUserLocale(userId: string): Promise<Locale> {
  try {
    const { prisma } = await import("@/lib/prisma");
    const row = await prisma.userSetting.findUnique({ where: { userId_key: { userId, key: LANG_SETTING_KEY } }, select: { value: true } });
    return normalizeLocale(row?.value);
  } catch {
    return "fa";
  }
}

/** زبان چند کاربر با یک کوئری (پیام همگانی و ...) */
export async function getUserLocales(userIds: string[]): Promise<Map<string, Locale>> {
  const out = new Map<string, Locale>();
  if (!userIds.length) return out;
  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.userSetting.findMany({ where: { userId: { in: userIds }, key: LANG_SETTING_KEY }, select: { userId: true, value: true } });
    for (const r of rows) out.set(r.userId, normalizeLocale(r.value));
  } catch {
    // پیش‌فرض فارسی
  }
  return out;
}

/** ساخت متن با زبان ذخیره‌شده‌ی گیرنده: `await forUser(id, () => ({ title: tr(..), body: tr(..) }))` */
export async function forUser<T>(userId: string, build: () => T): Promise<T> {
  return runWithLocale(await getUserLocale(userId), build);
}
