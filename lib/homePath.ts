"use client";

import { refreshFeatures } from "./useFeatures";
import { isSectionKey, sectionHomePath, type SectionKey } from "./sections";

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

// بخش موثر از <html data-section> (layout سرور)؛ بیرون از مرورگر یا بدون مقدار null
export function currentSectionFromDom(): SectionKey | null {
  if (typeof document === "undefined") return null;
  const v = document.documentElement.getAttribute("data-section");
  return isSectionKey(v) ? v : null;
}

type FeatureMap = Partial<Record<string, boolean>> | null | undefined;

/**
 * مقصد بعد از ورود به‌ازای بخش و فلگ‌ها (خالص، تست‌دار). هر سه بخش داشبورد دارن؛
 * فقط با فلگ خاموش بخش ورزش به برنامه تمرینی، کالری‌شمار یا پنل کاربری می‌ره.
 */
export function homePathFor(section: SectionKey | null, m: FeatureMap): string {
  // داشبورد ورزش خاموش (ادمین): برنامه تمرینی، بعد کالری‌شمار، وگرنه پنل کاربری
  if (section === "workout" && m && m.dashboard === false) {
    if (m.exercise !== false) return "/exercise";
    return m.calorie !== false ? "/calorie" : ACCOUNT_HOME;
  }
  return m && m.dashboard === false ? (m.routine === false ? ACCOUNT_HOME : FALLBACK_HOME) : DASHBOARD_HOME;
}

export async function resolveHomePath(): Promise<string> {
  const section = currentSectionFromDom();
  const fallback = sectionHomePath(section);
  const timeout = new Promise<string>((r) => setTimeout(() => r(fallback), 1500));
  const fetched = refreshFeatures()
    .then((m) => homePathFor(section, m as FeatureMap))
    .catch(() => fallback);
  return Promise.race([fetched, timeout]);
}
