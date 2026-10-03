"use client";

import { refreshFeatures } from "./useFeatures";

// «صفحه‌ی اصلی» کاربر واردشده: داشبورد (درخواست صریح صاحب محصول — فلگ
// `dashboard` پیش‌فرض برای همه روشنه). فقط وقتی ادمین فلگ رو برای این کاربر
// خاموش کرده باشه → /weekly. فلگ‌ها از همون کش مشترک lib/useFeatures تازه
// می‌شن (نه یک fetch جدا) تا صفحه‌ی مقصد و منو دوباره درخواست نزنن. هر خطا یا
// کندی (بیش از 1.5 ثانیه) → /dashboard، چون خود صفحه‌ی داشبورد گیت رو سمت سرور
// دوباره چک می‌کنه و اگه خاموش بود به /weekly ریدایرکت می‌کنه (app/dashboard/page.tsx)
// — پس ورود هیچ‌وقت پشت این گیر نمی‌کنه و کاربر هیچ‌وقت به صفحه‌ی قفل نمی‌رسه.
export const DEFAULT_HOME = "/dashboard";
export const DASHBOARD_HOME = "/dashboard";
export const FALLBACK_HOME = "/weekly";
// داشبورد و روتین هر دو از پنل ادمین خاموش → پنل کاربری (هیچ‌وقت فلگ نداره)
export const ACCOUNT_HOME = "/account";

export async function resolveHomePath(): Promise<string> {
  const timeout = new Promise<string>((r) => setTimeout(() => r(DEFAULT_HOME), 1500));
  const fetched = refreshFeatures()
    .then((m) => (m && m.dashboard === false ? (m.routine === false ? ACCOUNT_HOME : FALLBACK_HOME) : DASHBOARD_HOME))
    .catch(() => DEFAULT_HOME);
  return Promise.race([fetched, timeout]);
}
