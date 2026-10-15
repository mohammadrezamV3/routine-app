"use client";

import { useEffect } from "react";

// پیش‌نمایش تم مناسبتی روی دستگاه ادمین: اسکریپت inline هدر ویژگی data-event-theme رو
// ست می‌کنه ولی تم سمت سرور فعال نیست، پس CSS تم رو همین‌جا تنبل لود می‌کنیم.
export function EventThemeCssPreview({ serverActive }: { serverActive: boolean }) {
  useEffect(() => {
    if (serverActive) return;
    if (!document.documentElement.hasAttribute("data-event-theme")) return;
    void import("./EventThemeCss");
  }, [serverActive]);
  return null;
}
