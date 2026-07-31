"use client";

import { Bell, Calendar, MoreVertical } from "lucide-react";
import { DashCard } from "./DashCard";
import { DASH_REMINDERS } from "@/lib/dashboardMockData";

const ICONS = { calendar: Calendar, bell: Bell };

export function DashReminderCard({ delay }: { delay?: number }) {
  return (
    <DashCard delay={delay}>
      <h2 className="text-[15px] font-bold text-dash-text">یادآوری‌ها</h2>

      <div className="mt-4 flex flex-col gap-2.5">
        {DASH_REMINDERS.map((r) => {
          const Icon = ICONS[r.icon];
          return (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-dash-border bg-white/[0.02] px-3.5 py-3"
            >
              <button type="button" aria-label="گزینه‌های بیشتر" className="shrink-0 text-dash-muted transition hover:text-dash-text">
                <MoreVertical size={17} />
              </button>
              <div className="flex flex-1 items-center justify-end gap-3">
                <div className="text-right">
                  <div className="text-[13.5px] font-semibold text-dash-text">{r.title}</div>
                  <div className="mt-0.5 text-[11.5px] text-dash-muted">{r.subtitle}</div>
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-dash-green/15 text-dash-green">
                  <Icon size={16} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </DashCard>
  );
}
