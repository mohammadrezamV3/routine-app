"use client";

import { DashTeamMembersCard } from "./DashTeamMembersCard";
import { DashReminderCard } from "./DashReminderCard";
import { DashWeeklyChartCard } from "./DashWeeklyChartCard";
import { DashMoodCard } from "./DashMoodCard";

export function DashSidebar({ className }: { className?: string }) {
  return (
    <aside className={className}>
      <div className="flex flex-col gap-6">
        <DashTeamMembersCard delay={0.05} />
        <DashReminderCard delay={0.1} />
        <DashWeeklyChartCard delay={0.15} />
        <DashMoodCard delay={0.2} />
      </div>
    </aside>
  );
}
