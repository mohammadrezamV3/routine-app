"use client";

import { DashCard } from "./DashCard";
import { DashProgressCircle } from "./DashProgressCircle";
import { DASH_TEAM } from "@/lib/dashboardMockData";

export function DashTeamMembersCard({ delay }: { delay?: number }) {
  return (
    <DashCard delay={delay}>
      <div className="flex items-center justify-between">
        <button type="button" className="text-[12.5px] font-semibold text-dash-green hover:underline">
          مشاهده همه
        </button>
        <h2 className="text-[15px] font-bold text-dash-text">اعضای تیم</h2>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {DASH_TEAM.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-3">
            <DashProgressCircle value={m.pct} size={44} strokeWidth={4} />
            <div className="flex flex-1 items-center justify-end gap-3">
              <div className="text-right">
                <div className="text-[13.5px] font-semibold text-dash-text">{m.name}</div>
                <div className="mt-0.5 text-[11.5px] text-dash-muted">
                  {m.completed} از {m.total} برنامه
                </div>
              </div>
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[14px] font-bold text-white"
                style={{ backgroundColor: m.color }}
              >
                {m.initial}
              </span>
            </div>
          </div>
        ))}
      </div>
    </DashCard>
  );
}
