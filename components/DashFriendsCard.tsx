"use client";

import { DashCard } from "./DashCard";
import { DashProgressCircle } from "./DashProgressCircle";
import { DASH_FRIENDS } from "@/lib/dashboardMockData";

export function DashFriendsCard({ delay }: { delay?: number }) {
  return (
    <DashCard delay={delay}>
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-bold text-dash-text sm:text-[15px]">دوستان</h2>
        <button type="button" className="text-[12px] font-semibold text-dash-green hover:underline sm:text-[12.5px]">
          مشاهده همه
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {DASH_FRIENDS.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-3">
            <DashProgressCircle value={m.pct} size={40} strokeWidth={4} />
            <div className="flex flex-1 items-center justify-end gap-2.5">
              <div className="text-right">
                <div className="text-[12.5px] font-semibold text-dash-text sm:text-[13.5px]">{m.name}</div>
                <div className="mt-0.5 text-[10.5px] text-dash-muted sm:text-[11.5px]">
                  {m.completed} از {m.total} برنامه
                </div>
              </div>
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white sm:h-10 sm:w-10 sm:text-[14px]"
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
