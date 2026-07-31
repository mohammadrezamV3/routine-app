"use client";

import { DashFriendsCard } from "./DashFriendsCard";
import { DashWeeklyChartCard } from "./DashWeeklyChartCard";

// دوستان و آمار هفتگی، هرکدوم ردیفِ جدا و تمام‌عرض — کاملاً عمودی زیرِ هم،
// حتی توی دسکتاپ (کنار هم نه).
export function DashSidebar({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="flex flex-col gap-4 sm:gap-6">
        <DashFriendsCard delay={0.1} />
        <DashWeeklyChartCard delay={0.15} />
      </div>
    </div>
  );
}
