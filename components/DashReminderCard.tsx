"use client";

import { Bell, Calendar, MoreVertical } from "lucide-react";
import { DashCard } from "./DashCard";
import { DASH_REMINDERS } from "@/lib/dashboardMockData";

const ICONS = { calendar: Calendar, bell: Bell };

export function DashReminderCard({ delay }: { delay?: number }) {
  return (
    <DashCard delay={delay}>
      <h2 className="text-[14px] font-bold text-dash-text sm:text-[15px]">یادآوری‌ها</h2>

      <div className="mt-3 flex flex-col gap-2 sm:mt-4 sm:gap-2.5">
        {DASH_REMINDERS.map((r) => {
          const Icon = ICONS[r.icon];
          return (
            <div
              key={r.id}
              className="flex items-center justify-between gap-2.5 rounded-2xl border border-dash-border bg-white/[0.02] px-3 py-2.5 sm:gap-3 sm:px-3.5 sm:py-3"
            >
              <button type="button" aria-label="گزینه‌های بیشتر" className="shrink-0 text-dash-muted transition hover:text-dash-text">
                <MoreVertical size={17} />
              </button>
              <div className="flex flex-1 items-center justify-end gap-2.5 sm:gap-3">
                <div className="text-right">
                  <div className="text-[12.5px] font-semibold text-dash-text sm:text-[13.5px]">{r.title}</div>
                  <div className="mt-0.5 text-[10.5px] text-dash-muted sm:text-[11.5px]">{r.subtitle}</div>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-dash-green/15 text-dash-green sm:h-9 sm:w-9">
                  <Icon size={15} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </DashCard>
  );
}
