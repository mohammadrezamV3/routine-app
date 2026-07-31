"use client";

import { useEffect, useState } from "react";
import { Bell, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashCard } from "./DashCard";
import { getImportantThisWeek, ImportantOccurrence } from "@/lib/routineStats";
import { WEEK_ORDER } from "@/lib/schedule";

// برنامه‌های «خیلی زیاد»/«زیاد»ِ همین هفته — واقعاً از customOccurrences
// (با تگِ اهمیتی که موقع افزودن/ویرایش برنامه انتخاب می‌شه) فیلتر می‌شه،
// دیگه یادآوریِ mock نیست. کلیک روی هر ردیف همون برنامه رو باز می‌کنه.
export function DashReminderCard({ delay, onOpenProgram }: { delay?: number; onOpenProgram?: (name: string) => void }) {
  const [items, setItems] = useState<ImportantOccurrence[] | null>(null);

  useEffect(() => { getImportantThisWeek().then(setItems); }, []);

  const list = items ?? [];

  return (
    <DashCard delay={delay}>
      <h2 className="text-[14px] font-bold text-dash-text sm:text-[15px]">یادآوری‌ها</h2>

      <div className="mt-3 flex flex-col gap-2 sm:mt-4 sm:gap-2.5">
        {items === null ? (
          <div className="text-[12px] text-dash-muted">در حال بارگذاری…</div>
        ) : list.length === 0 ? (
          <div className="text-[12px] text-dash-muted">
            برنامه‌ای با تگ «خیلی زیاد» یا «زیاد» توی این هفته ثبت نشده.
          </div>
        ) : (
          list.map((r) => {
            const dayName = WEEK_ORDER.find((w) => w.jsDay === r.jsDay)?.name ?? "";
            return (
              <button
                type="button"
                key={`${r.id}-${r.jsDay}`}
                onClick={() => onOpenProgram?.(r.name)}
                className="flex items-center justify-between gap-2.5 rounded-2xl border border-dash-border bg-white/[0.02] px-3 py-2.5 text-right transition hover:border-white/10 sm:gap-3 sm:px-3.5 sm:py-3"
              >
                <span className="shrink-0 text-dash-muted">
                  <MoreVertical size={17} />
                </span>
                <div className="flex flex-1 items-center justify-end gap-2.5 sm:gap-3">
                  <div className="text-right">
                    <div className="text-[12.5px] font-semibold text-dash-text sm:text-[13.5px]">{r.name}</div>
                    <div className="mt-0.5 text-[10.5px] text-dash-muted sm:text-[11.5px]">
                      {dayName} — {r.time}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl sm:h-9 sm:w-9",
                      r.importance === "veryHigh" ? "bg-dash-green/25 text-dash-green" : "bg-dash-green/15 text-dash-green"
                    )}
                  >
                    <Bell size={15} />
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </DashCard>
  );
}
