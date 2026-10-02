"use client";

import { useEffect } from "react";
import { whenPageReady } from "@/lib/pageReady";

// علامت «اپ آماده‌ست» برای اسکریپت BootSplash. فقط هیدریت کافی نیست: خیلی از
// صفحه‌ها بعدش داده‌شون رو می‌گیرن و اسپینر/اسکلت خودشون رو نشون می‌دن؛ اسپلش تا
// وقتی اون‌ها هم تموم نشدن می‌مونه (lib/pageReady.ts، با سقف زمانی).
export function BootSplashRelease() {
  useEffect(() => {
    let alive = true;
    void whenPageReady(9000).then(() => {
      if (!alive) return;
      (window as unknown as { __appHydrated?: boolean }).__appHydrated = true;
      window.dispatchEvent(new Event("app:hydrated"));
    });
    return () => { alive = false; };
  }, []);
  return null;
}
