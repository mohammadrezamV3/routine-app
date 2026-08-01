"use client";

import { DashFriendsCard } from "./DashFriendsCard";
import { DashWeeklyChartCard } from "./DashWeeklyChartCard";

// دوستان و آمار هفتگی، دو باکسِ جدا زیرِ هم (اول دوستان بعد آمار) — کاملاً
// عمودی، حتی توی دسکتاپ (کنارِ هم/افقی نه).
export function DashSidebar({ className, statsRefreshKey }: { className?: string; statsRefreshKey?: number }) {
  return (
    <div className={className}>
      <div className="flex flex-col gap-4 sm:gap-6">
        <DashFriendsCard delay={0.1} />
        <DashWeeklyChartCard delay={0.15} refreshKey={statsRefreshKey} />
      </div>
    </div>
  );
}
