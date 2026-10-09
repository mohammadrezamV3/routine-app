"use client";

import Link from "next/link";
import { StreakBadge } from "./StreakBadge";
import { tr } from "@/lib/i18n";

// استریک روزهای پشت‌سرهم کامل — توی هدر، سمت دکمه‌ی نوتیف، تا از هر
// صفحه‌ای دیده بشه، نه فقط صفحه اصلی. زدنش بخش «استریک و اچیومنت‌ها» (/streak)
// رو باز می‌کنه. لینک عمدا هیچ بک‌گراندی نمی‌گیره (فقط خود شعله).
export function HeaderStreakClock() {
  return (
    <Link href="/streak" prefetch className="header-streak-clock header-streak-link" aria-label={tr("استریک و اچیومنت‌ها", "Streak and achievements")}>
      <StreakBadge />
    </Link>
  );
}
