"use client";

import { DashFriendsCard } from "./DashFriendsCard";
import { DashWeeklyChartCard } from "./DashWeeklyChartCard";
import { useDashboardPrefs } from "@/lib/dashboardPrefs";

// دوستان و آمار هفتگی، دو باکسِ جدا زیرِ هم (اول دوستان بعد آمار) — کاملاً
// عمودی، حتی توی دسکتاپ (کنارِ هم/افقی نه). هرکدوم طبقِ شخصی‌سازیِ کاربر
// (پنلِ کاربری) قابلِ مخفی‌کردنه.
export function DashSidebar({ className, statsRefreshKey }: { className?: string; statsRefreshKey?: number }) {
  const prefs = useDashboardPrefs();
  if (!prefs.showFriends && !prefs.showChart) return null;
  return (
    <div className={className}>
      <div className="flex flex-col gap-4 sm:gap-6">
        {prefs.showFriends && <DashFriendsCard delay={0.1} />}
        {prefs.showChart && <DashWeeklyChartCard delay={0.15} refreshKey={statsRefreshKey} />}
      </div>
    </div>
  );
}
