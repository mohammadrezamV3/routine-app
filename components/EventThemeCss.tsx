"use client";

// استایل تم‌های مناسبتی (app/event-themes.css، ~60KB خام). فقط وقتی لازمه که یک تم فعال باشه،
// پس از bundle مشترک هر صفحه بیرونه: layout ریشه این کامپوننت رو با next/dynamic فقط
// وقتی تم فعاله رندر می‌شه (EventThemeCssPreview)،
// و EventThemeCssPreview برای «تست برای من» (localStorage) بعد از هیدریت لودش می‌کنه.
import "@/app/event-themes.css";

export default function EventThemeCss() {
  return null;
}
