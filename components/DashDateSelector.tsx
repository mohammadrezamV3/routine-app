"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { J_MONTHS, faNum, toJalali } from "@/lib/jalali";
import { WEEK_ORDER } from "@/lib/schedule";
import { useDayStrip } from "@/lib/useDayStrip";

// محوشدنِ لبه‌ها — با mask-image روی *خودِ* نوارِ اسکرول، نه لایه‌های
// backdrop-filter روی آن (آن‌ها روی کرومِ اندروید لبه‌ی مستطیلیِ تیره و
// لرزش حینِ کشیدن می‌ساختند). ماسک روی خودِ محتوا همان «رفته‌رفته محوشدن»
// را می‌دهد، بدونِ هیچ لایه‌ی اضافه یا بک‌گراندی.
const EDGE_FADE = "28px";
function edgeMask(fadeRight: boolean, fadeLeft: boolean): string | undefined {
  if (!fadeRight && !fadeLeft) return undefined;
  const l = fadeLeft ? `transparent 0, black ${EDGE_FADE}` : "black 0";
  const r = fadeRight ? `black calc(100% - ${EDGE_FADE}), transparent 100%` : "black 100%";
  return `linear-gradient(to right, ${l}, ${r})`;
}

function dayLabels(d: Date): { weekday: string; dateLabel: string } {
  const order = WEEK_ORDER.find((w) => w.jsDay === d.getDay())!;
  const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return { weekday: order.name, dateLabel: `${faNum(j[2])} ${J_MONTHS[j[1] - 1]}` };
}

// نوار انتخاب تاریخ (روتین من / بدنسازی / کالری). دیگر پنجره‌ی چندروزه با
// فلش نیست: نوارِ آزادِ قابل‌کشیدن با شتاب (لمس + ماوس)، بدونِ snap و
// بدونِ باکس/بوردرِ دورش؛ روزها تنبل اضافه می‌شوند — نگاه کن به
// lib/useDayStrip.ts. ترتیبِ DOM صعودی است و RTL خودش گذشته را راست می‌برد.
export function DashDateSelector({
  activeIso,
  onSelect,
  className,
}: {
  activeIso: string;
  onSelect: (iso: string) => void;
  className?: string;
}) {
  const { scrollRef, days } = useDayStrip(activeIso);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 1) {
        setCanScrollRight(false);
        setCanScrollLeft(false);
        return;
      }
      setCanScrollRight(el.scrollLeft < -1);
      setCanScrollLeft(el.scrollLeft > -max + 1);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [scrollRef, days.length]);

  return (
    <div className={cn("min-w-0 flex-1", className)}>
      <div
        ref={scrollRef}
        // موبایل: هر پیل حداقل یک‌پنجمِ عرض (۵ روز در دید)، دسکتاپ ۹۲px.
        // overscroll-x-contain: کشیدنِ نوار تا ته، صفحه را افقی نمی‌کشد.
        className="no-scrollbar flex cursor-grab items-center gap-1.5 overflow-x-auto overscroll-x-contain px-2 py-2.5 sm:px-3 [&.is-dragging]:cursor-grabbing [&.is-dragging]:select-none"
        style={{
          overflowAnchor: "none",
          maskImage: edgeMask(canScrollRight, canScrollLeft),
          WebkitMaskImage: edgeMask(canScrollRight, canScrollLeft),
        }}
      >
        {days.map(({ date, iso }) => {
          const active = iso === activeIso;
          const { weekday, dateLabel } = dayLabels(date);
          return (
            <button
              key={iso}
              data-iso={iso}
              data-day-pill
              type="button"
              draggable={false}
              onClick={() => onSelect(iso)}
              className={cn(
                "flex min-w-[calc((100%_-_24px)/5)] shrink-0 flex-col items-center gap-0.5 rounded-2xl px-1 py-1 text-center transition sm:min-w-[92px] sm:gap-1 sm:px-3 sm:py-2",
                active ? "text-dash-bg" : "text-dash-muted hover:bg-white/5"
              )}
              style={
                active
                  ? { background: "var(--accent)", boxShadow: "0 0 0 1px rgba(var(--accent-rgb),.4), 0 0 8px rgba(var(--accent-rgb),.3)" }
                  : undefined
              }
            >
              <span className={cn("whitespace-nowrap text-[10px] font-semibold sm:text-[13px]", active ? "text-dash-bg" : "text-dash-text")}>
                {weekday}
              </span>
              <span className={cn("whitespace-nowrap text-[9px] sm:text-[12px]", active ? "text-dash-bg/80" : "text-dash-muted")}>{dateLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
