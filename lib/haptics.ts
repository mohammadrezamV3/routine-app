// تنظیم هپتیک — ترجیح *همین دستگاه* (localStorage)، نه حساب: لرزش ویژگی
// سخت‌افزار گوشیه و ممکنه کاربر روی یک دستگاه بخوادش و روی یکی نه.
// همون کلیدی که اسکریپت سراسری lib/tapFeedback.ts موقع هر تپ می‌خونه.
export const HAPTICS_KEY = "arion:haptics";

export function hapticsEnabled(): boolean {
  try {
    return localStorage.getItem(HAPTICS_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setHapticsEnabled(on: boolean): void {
  try {
    if (on) localStorage.removeItem(HAPTICS_KEY);
    else localStorage.setItem(HAPTICS_KEY, "off");
  } catch {
    // حالت خصوصی/ذخیره‌سازی بسته — تنظیم فقط برای همین نشست اثر نداره
  }
}

/** دستگاه اصلا هپتیک داره؟ (اندروید: vibrate؛ iOS ۱۸+ از راه سوییچ سیستمی) */
export function hapticsSupported(): boolean {
  if (typeof navigator === "undefined") return false;
  if (typeof navigator.vibrate === "function") return true;
  return /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
