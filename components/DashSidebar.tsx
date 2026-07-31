"use client";

import { DashReminderCard } from "./DashReminderCard";
import { DashFriendsCard } from "./DashFriendsCard";
import { DashWeeklyChartCard } from "./DashWeeklyChartCard";

export function DashSidebar({ className }: { className?: string }) {
  return (
    <aside className={className}>
      <div className="flex flex-col gap-4 sm:gap-6">
        <DashReminderCard delay={0.05} />
        <DashFriendsCard delay={0.1} />
        <DashWeeklyChartCard delay={0.15} />
      </div>
    </aside>
  );
}
