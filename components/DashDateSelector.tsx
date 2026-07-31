"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type DashDay = { iso: string; weekday: string; dateLabel: string };

// نوار انتخاب تاریخ — عمداً dir="ltr" (برخلاف بقیه‌ی صفحه) چون تاریخ‌ها
// باید از قدیم به جدید، چپ‌به‌راست بچینن. فلش‌های قبلی/بعدی یک هفته‌ی کامل
// جابه‌جا می‌کنن و فقط توی دسکتاپ دیده می‌شن — توی موبایل با انگشت اسکرول
// می‌شه (اسکرول‌بارِ خودِ مرورگر هم مخفیه، no-scrollbar).
export function DashDateSelector({
  days,
  activeIso,
  onSelect,
  onPrevWeek,
  onNextWeek,
  className,
}: {
  days: DashDay[];
  activeIso: string;
  onSelect: (iso: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className={cn("flex flex-1 items-center gap-1 rounded-dash border border-dash-border bg-dash-card backdrop-blur-xl", className)}>
      <button
        type="button"
        aria-label="هفته‌ی قبل"
        onClick={onPrevWeek}
        className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-dash-muted transition hover:bg-white/5 hover:text-dash-text sm:flex"
      >
        <ChevronLeft size={18} />
      </button>

      <div ref={scrollRef} dir="ltr" className="no-scrollbar flex flex-1 items-center gap-1 overflow-x-auto px-3 py-2.5">
        {days.map((d) => {
          const active = d.iso === activeIso;
          return (
            <button
              key={d.iso}
              type="button"
              onClick={() => onSelect(d.iso)}
              className={cn(
                "flex min-w-[72px] shrink-0 flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-center transition sm:min-w-[92px] sm:px-3 sm:py-2",
                active ? "text-dash-bg" : "text-dash-muted hover:bg-white/5"
              )}
              style={
                active
                  ? { background: "var(--accent)", boxShadow: "0 0 0 1px rgba(var(--accent-rgb),.4), 0 0 18px rgba(var(--accent-rgb),.35)" }
                  : undefined
              }
            >
              <span className={cn("text-[11.5px] font-semibold sm:text-[13px]", active ? "text-dash-bg" : "text-dash-text")}>
                {d.weekday}
              </span>
              <span className={cn("text-[10.5px] sm:text-[12px]", active ? "text-dash-bg/80" : "text-dash-muted")}>{d.dateLabel}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        aria-label="هفته‌ی بعد"
        onClick={onNextWeek}
        className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-dash-muted transition hover:bg-white/5 hover:text-dash-text sm:flex"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
