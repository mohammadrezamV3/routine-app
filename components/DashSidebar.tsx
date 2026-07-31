"use client";

import { DashFriendsCard } from "./DashFriendsCard";
import { DashWeeklyChartCard } from "./DashWeeklyChartCard";

// ردیفِ سوم — دوستان و آمار هفتگی کنار هم (طبق بازخوردِ کاربر: دیگه
// سایدبارِ باریکِ عمودیِ قدیمی نیست، یک ردیفِ دوستونیِ تمام‌عرضه).
export function DashSidebar({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
        <DashFriendsCard delay={0.1} />
        <DashWeeklyChartCard delay={0.15} />
      </div>
    </div>
  );
}
