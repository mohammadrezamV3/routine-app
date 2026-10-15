// نوشتن کوکی‌های کلاینتی که باید بین زیردامنه‌های بخش‌ها (routine./trade./workout.) دنبال کاربر بیان
// (تم، زبان، نشانه‌ی ورود). قرارداد: docs/sections.md
//
// نکته‌ی مهاجرت: کاربر قدیمی همین کوکی‌ها رو به‌صورت host-only روی دامنه‌ی اصلی داره. اگه فقط نسخه‌ی
// Domain=.base ست بشه، مرورگر *هر دو* رو نگه می‌داره و سرور/اسکریپت اولی رو می‌خونه (قدیمی‌تر جلوتره)؛
// یعنی کاربر زبان یا تم رو عوض می‌کنه و هیچ اتفاقی نمی‌افته. پس هر نوشتن/پاک‌کردن با دامنه، اول نسخه‌ی
// host-only هم‌اسم رو منقضی می‌کنه. وقتی دامنه‌ی مشترک نیست (زیردامنه‌ها خاموش، localhost) رفتار
// دقیقا مثل قبله: یک کوکی host-only.
import { clientCookieDomainAttr } from "@/lib/sections";

/** attrs مثل "path=/; max-age=31536000; samesite=lax" (بدون domain) */
export function setSharedCookie(name: string, value: string, attrs: string): void {
  if (typeof document === "undefined") return;
  const domain = clientCookieDomainAttr();
  // اول نسخه‌ی host-only قدیمی منقضی می‌شه، بعد نسخه‌ی دامنه‌دار نوشته می‌شه
  if (domain) document.cookie = `${name}=; path=/; max-age=0`;
  document.cookie = `${name}=${value}; ${attrs}${domain}`;
}

/** پاک‌کردن کوکی در هر دو شکل (host-only و دامنه‌دار) */
export function clearSharedCookie(name: string, extraAttrs = ""): void {
  if (typeof document === "undefined") return;
  const tail = extraAttrs ? `; ${extraAttrs}` : "";
  document.cookie = `${name}=; path=/; max-age=0${tail}`;
  const domain = clientCookieDomainAttr();
  if (domain) document.cookie = `${name}=; path=/; max-age=0${tail}${domain}`;
}
