"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DASH_WEEK_DAYS } from "@/lib/dashboardMockData";

// نوار انتخاب تاریخ — عمداً dir="ltr" (برخلاف بقیه‌ی صفحه) چون تاریخ‌ها
// باید از قدیم به جدید، چپ‌به‌راست بچینن (همون قراردادِ رایج نوارهای
// تقویمی/کرونولوژیک حتی توی اپ‌های فارسی) و فلش قبلی/بعدی هم ثابت بمونه.
export function DashDateSelector({
  activeKey,
  onSelect,
  className,
}: {
  activeKey: string;
  onSelect: (key: string) => void;
  className?: string;
}) {
  return (
    <div
      dir="ltr"
      className={cn(
        "flex flex-1 items-center gap-1 overflow-x-auto rounded-dash border border-dash-border bg-dash-card px-3 py-2.5 backdrop-blur-xl",
        className
      )}
    >
      <button
        type="button"
        aria-label="روزهای قبل"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-dash-muted transition hover:bg-white/5 hover:text-dash-text sm:h-8 sm:w-8"
      >
        <ChevronLeft size={16} className="sm:hidden" />
        <ChevronLeft size={18} className="hidden sm:block" />
      </button>

      {DASH_WEEK_DAYS.map((d) => {
        const active = d.key === activeKey;
        return (
          <button
            key={d.key}
            type="button"
            onClick={() => onSelect(d.key)}
            className={cn(
              "flex min-w-[72px] shrink-0 flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-center transition sm:min-w-[92px] sm:px-3 sm:py-2",
              active
                ? "bg-dash-green text-dash-bg shadow-[0_0_0_1px_rgba(46,230,107,.4),0_0_18px_rgba(46,230,107,.35)]"
                : "text-dash-muted hover:bg-white/5"
            )}
          >
            <span className={cn("text-[11.5px] font-semibold sm:text-[13px]", active ? "text-dash-bg" : "text-dash-text")}>
              {d.weekday}
            </span>
            <span className={cn("text-[10.5px] sm:text-[12px]", active ? "text-dash-bg/80" : "text-dash-muted")}>{d.dateLabel}</span>
          </button>
        );
      })}

      <button
        type="button"
        aria-label="روزهای بعد"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-dash-muted transition hover:bg-white/5 hover:text-dash-text sm:h-8 sm:w-8"
      >
        <ChevronRight size={16} className="sm:hidden" />
        <ChevronRight size={18} className="hidden sm:block" />
      </button>
    </div>
  );
}
