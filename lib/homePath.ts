"use client";

import { invalidateFeatures } from "./useFeatures";

// «صفحه‌ی اصلیِ» کاربرِ واردشده: وقتی فلگِ `dashboard` براش روشنه (فعلا فقط
// ادمین‌ها) → /dashboard، وگرنه همون /weekly ِ همیشگی. کشِ فلگ‌ها اول پاک
// می‌شه چون ممکنه همین چند لحظه پیش در حالتِ مهمان پر شده باشه. هر خطا یا
// کندی (بیش از ۱.۵ ثانیه) → /weekly، تا ورود هیچ‌وقت پشتِ این گیر نکنه.
export const DEFAULT_HOME = "/weekly";
export const DASHBOARD_HOME = "/dashboard";

export async function resolveHomePath(): Promise<string> {
  invalidateFeatures();
  const timeout = new Promise<string>((r) => setTimeout(() => r(DEFAULT_HOME), 1500));
  const fetched = fetch("/api/features", { credentials: "same-origin" })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => (d?.features?.dashboard === true ? DASHBOARD_HOME : DEFAULT_HOME))
    .catch(() => DEFAULT_HOME);
  return Promise.race([fetched, timeout]);
}
