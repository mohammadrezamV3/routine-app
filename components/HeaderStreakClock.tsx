"use client";

import { StreakBadge } from "./StreakBadge";

// استریکِ روزهای پشت‌سرهمِ کامل — توی هدر، سمت دکمه‌ی نوتیف، تا از هر
// صفحه‌ای دیده بشه، نه فقط صفحه اصلی.
export function HeaderStreakClock() {
  return (
    <div className="header-streak-clock">
      <StreakBadge />
    </div>
  );
}
