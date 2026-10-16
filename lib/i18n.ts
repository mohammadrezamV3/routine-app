// زبان سایت (فارسی/انگلیسی) — منطق مشترک کلاینت و سرور.
//
// قرارداد (docs/i18n.md):
//  - زبان در کوکی `arion_lang` (fa | en) روی همین دستگاه ذخیره می‌شه و layout
//    ریشه از روی همون `lang`/`dir` رو روی <html> می‌ذاره (fa → rtl، en → ltr).
//  - هر متن قابل‌نمایش با `tr("فارسی", "English")` نوشته می‌شه — هم در
//    کامپوننت کلاینت، هم سرور، هم روت API، هم lib.
//  - tr() هیچ‌وقت در سطح بالای ماژول صدا زده نمی‌شه (اونجا فقط یک بار اجرا
//    می‌شه و روی سرور زبان همه‌ی درخواست‌ها رو یکی می‌کنه)؛ ثابت‌های متنی
//    سطح ماژول یا تابع می‌شن یا جفت `{ fa, en }` نگه می‌دارن و موقع رندر با
//    `pick()` انتخاب می‌شن.

// نوشتن کوکی زبان بین زیردامنه‌ها مشترکه (lib/clientCookie.ts، فقط داخل تابع صدا زده می‌شه؛
// import دایره‌ای با lib/sections.ts بی‌خطره چون هیچ‌کدوم در سطح ماژول از اون یکی استفاده نمی‌کنه)
import { setSharedCookie } from "@/lib/clientCookie";

export type Locale = "fa" | "en";

export const LOCALES: readonly Locale[] = ["fa", "en"];
export const DEFAULT_LOCALE: Locale = "fa";
export const LOCALE_COOKIE = "arion_lang";

export function isLocale(v: unknown): v is Locale {
  return v === "fa" || v === "en";
}

export function normalizeLocale(v: unknown): Locale {
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

export function dirOf(locale: Locale): "rtl" | "ltr" {
  return locale === "en" ? "ltr" : "rtl";
}

// سرور: lib/i18nServer.ts (از layout و instrumentation) این گیرنده رو روی
// globalThis ثبت می‌کنه تا tr() بدون import مستقیم next/headers (که در باندل
// کلاینت مجاز نیست) زبان درخواست جاری رو از کوکی بخونه.
type LocaleGetter = () => Locale | null;
const GETTER_KEY = "__arionLocaleGetter";

export function registerServerLocaleGetter(getter: LocaleGetter) {
  (globalThis as Record<string, unknown>)[GETTER_KEY] = getter;
}

export function currentLocale(): Locale {
  if (typeof document !== "undefined") {
    return document.documentElement?.lang === "en" ? "en" : "fa";
  }
  const getter = (globalThis as Record<string, unknown>)[GETTER_KEY] as LocaleGetter | undefined;
  if (getter) {
    try {
      return getter() ?? DEFAULT_LOCALE;
    } catch {
      return DEFAULT_LOCALE;
    }
  }
  return DEFAULT_LOCALE;
}

export function isEn(): boolean {
  return currentLocale() === "en";
}

/** متن به زبان جاری: `tr("ذخیره", "Save")` */
export function tr(fa: string, en: string): string {
  return currentLocale() === "en" ? en : fa;
}

/** هر مقدار (نه فقط متن) به زبان جاری: `trv(<FaNode/>, <EnNode/>)` */
export function trv<T>(fa: T, en: T): T {
  return currentLocale() === "en" ? en : fa;
}

export type Localized = { fa: string; en: string };

/** انتخاب از جفت ثابت سطح ماژول: `pick(LABELS.save)` */
export function pick(v: Localized | string): string {
  if (typeof v === "string") return v;
  return currentLocale() === "en" ? v.en : v.fa;
}

/** جهت فعلی: 1 در ltr، -1 در rtl — برای ضرب در translateX / x انیمیشن */
export function dirSign(): 1 | -1 {
  return currentLocale() === "en" ? 1 : -1;
}

/** ساخت کوکی زبان (کلاینت) — یک سال */
export function writeLocaleCookie(locale: Locale) {
  if (typeof document === "undefined") return;
  setSharedCookie(LOCALE_COOKIE, locale, "path=/; max-age=31536000; samesite=lax");
}

/**
 * ذخیره‌ی زبان روی حساب (UserSetting "lang") تا اعلان و پوشی که سرور برای این کاربر می‌سازه به همین
 * زبان برسه. best-effort و بی‌انتظار: مهمان ۴۰۱ می‌گیره و بی‌اثره؛ keepalive می‌ذاره درخواست از
 * ریلود بلافاصله‌ی صفحه جون سالم به در ببره.
 */
export function persistLocaleToAccount(locale: Locale) {
  if (typeof window === "undefined" || typeof fetch === "undefined") return;
  try {
    void fetch("/api/settings/lang", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale }),
      credentials: "same-origin",
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ذخیره‌ی زبان روی حساب نباید عوض‌کردن زبان رو خراب کنه
  }
}

/** عوض‌کردن زبان: کوکی + ذخیره روی حساب + بارگذاری کامل (layout و همه‌ی صفحه‌های سرور دوباره با زبان جدید ساخته می‌شن) */
export function switchLocale(locale: Locale) {
  writeLocaleCookie(locale);
  persistLocaleToAccount(locale);
  if (typeof window !== "undefined") window.location.reload();
}

/**
 * جداسازی دوجهته (FSI ... PDI) برای مقدار ذخیره‌شده/کاربرنوشته (اسم برنامه، اسم کاربر، عنوان …)
 * وقتی داخل جمله‌ی انگلیسی میاد: متن فارسی داخل جمله‌ی انگلیسی بدون اون، عددها و نقطه‌گذاری
 * کنارش رو جابه‌جا می‌کنه («1905 · پایین‌تنه kcal»). فقط در شاخه‌ی انگلیسی tr() استفاده کن؛
 * شاخه‌ی فارسی دست‌نخورده می‌مونه.
 */
export function iso(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  return `\u2068${value}\u2069`;
}
