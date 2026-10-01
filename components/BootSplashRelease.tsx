"use client";

import { useEffect } from "react";

// علامت «React هیدریت شد» برای اسکریپت BootSplash — بدون این، اسپلش فقط با
// window load می‌رفت و کاربر یک لحظه صفحه‌ی بی‌تعامل (هنوز هیدریت‌نشده) می‌دید.
export function BootSplashRelease() {
  useEffect(() => {
    (window as unknown as { __appHydrated?: boolean }).__appHydrated = true;
    window.dispatchEvent(new Event("app:hydrated"));
  }, []);
  return null;
}
