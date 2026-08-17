"use client";

import { useEffect } from "react";

// وقتی هر پاپ‌آپی باز می‌شه، صفحه‌ی پشتش نباید اسکرول/تعامل‌پذیر بمونه.
// چون چندین پاپ‌آپ می‌تونن هم‌زمان روی هم باز باشن (مثلاً «تغییر برنامه»
// روی داشبورد، یا اسکنِ AI روی «افزودن غذا»)، با یه شمارنده‌ی سراسری قفل
// می‌کنیم — فقط وقتی آخرین پاپ‌آپ هم بسته شد، اسکرول واقعاً برمی‌گرده.
let lockCount = 0;
let previousOverflow = "";

// `active` اختیاریه (پیش‌فرض true) — برای کامپوننت‌هایی که همیشه مانتن ولی
// خودِ پاپ‌آپشون با یه state باز/بسته می‌شه (مثلاً کشوی همبرگریِ ناوبری)،
// به‌جای مانت/آن‌مانت‌شدنِ خودِ هوک.
export function useLockBodyScroll(active = true) {
  useEffect(() => {
    if (!active) return;
    if (lockCount === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    lockCount++;
    return () => {
      lockCount--;
      if (lockCount === 0) {
        document.body.style.overflow = previousOverflow;
      }
    };
  }, [active]);
}
