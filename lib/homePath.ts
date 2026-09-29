"use client";

import { refreshFeatures } from "./useFeatures";

// «صفحه‌ی اصلیِ» کاربرِ واردشده: وقتی فلگِ `dashboard` براش روشنه (فعلا فقط
// ادمین‌ها) → /dashboard، وگرنه همون /weekly ِ همیشگی. فلگ‌ها از همون کشِ مشترکِ
// lib/useFeatures تازه می‌شن (نه یک fetch جدا) تا صفحه‌ی مقصد و منو دوباره
// درخواست نزنن. هر خطا یا کندی (بیش از ۱.۵ ثانیه) → /weekly، تا ورود هیچ‌وقت
// پشتِ این گیر نکنه.
export const DEFAULT_HOME = "/weekly";
export const DASHBOARD_HOME = "/dashboard";

export async function resolveHomePath(): Promise<string> {
  const timeout = new Promise<string>((r) => setTimeout(() => r(DEFAULT_HOME), 1500));
  const fetched = refreshFeatures()
    .then((m) => (m?.dashboard === true ? DASHBOARD_HOME : DEFAULT_HOME))
    .catch(() => DEFAULT_HOME);
  return Promise.race([fetched, timeout]);
}
