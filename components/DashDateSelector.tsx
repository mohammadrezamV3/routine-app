"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type DashDay = { iso: string; weekday: string; dateLabel: string };

// بلورِ لبه، لایه‌لایه — هرچی به لبه نزدیک‌تر، هم بلورِ بیشتر هم عرضِ کمتر،
// تا حسِ «رفته‌رفته تارتر شدن» بده، نه یک بلورِ یک‌دستِ ماسک‌شده.
const EDGE_BLUR_LAYERS = [
  { width: "34%", blur: 2 },
  { width: "22%", blur: 5 },
  { width: "12%", blur: 10 },
];

function EdgeBlur({ side }: { side: "left" | "right" }) {
  const gradientDir = side === "right" ? "to left" : "to right";
  return (
    <div className={cn("pointer-events-none absolute inset-y-0 w-10 sm:w-14", side === "right" ? "right-0" : "left-0")}>
      {EDGE_BLUR_LAYERS.map((layer, i) => (
        <div
          key={i}
          className={cn("absolute inset-y-0", side === "right" ? "right-0" : "left-0")}
          style={{
            width: layer.width,
            backdropFilter: `blur(${layer.blur}px)`,
            WebkitBackdropFilter: `blur(${layer.blur}px)`,
            maskImage: `linear-gradient(${gradientDir}, black, transparent)`,
            WebkitMaskImage: `linear-gradient(${gradientDir}, black, transparent)`,
          }}
        />
      ))}
    </div>
  );
}

// نوار انتخاب تاریخ — راست‌چین طبیعیِ صفحه (چون days از قبل به ترتیبِ
// تاریخیِ صعودی ساخته می‌شه و چیدمانِ RTL خودش این ترتیب رو می‌ده). دیگه یک
// هفته‌ی کامل نیست — یه پنجره‌ی داینامیکِ چندروزه که همیشه روی «امروز»
// وسط‌چینه. فلش‌های قبلی/بعدی همون پنجره رو جابه‌جا می‌کنن، رو به بیرون (نه
// سمت لیست)، و فقط توی دسکتاپ دیده می‌شن — توی موبایل با انگشت اسکرول
// می‌شه (اسکرول‌بارِ خودِ مرورگر هم مخفیه، no-scrollbar).
export function DashDateSelector({
  days,
  activeIso,
  onSelect,
  onPrevWeek,
  onNextWeek,
  onVisibleCountChange,
  className,
}: {
  days: DashDay[];
  activeIso: string;
  onSelect: (iso: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onVisibleCountChange?: (count: number) => void;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // روزِ فعال همیشه وسطِ نوار بمونه — هم موقعِ لود اولیه، هم هر بار که با
  // فلش/کلیک عوض می‌شه (از جمله موقعی که هفته با فلش عوض می‌شه ولی همون
  // ایزوی فعال توی هفته‌ی جدید نیست، پس این افکت روی activeIso و days هردو گوش می‌ده).
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeIso, days]);

  // به‌جای یک عددِ ثابت، هرچقدر عرضِ واقعیِ نوار جا داره روز نشون می‌ده —
  // اندازه‌ی پیل (۷۲ موبایل / ۹۲ دسکتاپ) + gap رو با عرضِ واقعیِ کانتینر
  // می‌سنجه. همیشه فرد نگه می‌داره تا روزِ فعال دقیقاً وسط بیفته.
  useEffect(() => {
    if (!onVisibleCountChange) return;
    const el = scrollRef.current;
    if (!el) return;
    const compute = () => {
      const w = el.clientWidth;
      const isSm = window.innerWidth >= 640;
      const pillWidth = isSm ? 92 : 62;
      const gap = 6;
      const n = Math.floor((w + gap) / (pillWidth + gap));
      const odd = n % 2 === 0 ? n - 1 : n;
      onVisibleCountChange(Math.max(3, odd));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={cn("flex flex-1 items-center gap-1 rounded-dash border border-dash-border bg-dash-card backdrop-blur-xl", className)}>
      <button
        type="button"
        aria-label="روزهای قبل"
        onClick={onPrevWeek}
        className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-dash-muted transition hover:bg-white/5 hover:text-dash-text sm:flex"
      >
        <ChevronRight size={18} />
      </button>

      <div className="relative min-w-0 flex-1">
        <div ref={scrollRef} className="no-scrollbar flex items-center justify-between gap-1.5 overflow-x-auto px-3 py-2.5">
          {days.map((d) => {
            const active = d.iso === activeIso;
            return (
              <button
                key={d.iso}
                ref={active ? activeRef : undefined}
                type="button"
                onClick={() => onSelect(d.iso)}
                className={cn(
                  "flex min-w-[62px] shrink-0 flex-col items-center gap-0.5 rounded-2xl px-1.5 py-1 text-center transition sm:min-w-[92px] sm:gap-1 sm:px-3 sm:py-2",
                  active ? "text-dash-bg" : "text-dash-muted hover:bg-white/5"
                )}
                style={
                  active
                    ? { background: "var(--accent)", boxShadow: "0 0 0 1px rgba(var(--accent-rgb),.4), 0 0 8px rgba(var(--accent-rgb),.3)" }
                    : undefined
                }
              >
                <span className={cn("text-[10.5px] font-semibold sm:text-[13px]", active ? "text-dash-bg" : "text-dash-text")}>
                  {d.weekday}
                </span>
                <span className={cn("text-[9.5px] sm:text-[12px]", active ? "text-dash-bg/80" : "text-dash-muted")}>{d.dateLabel}</span>
              </button>
            );
          })}
        </div>
        <EdgeBlur side="right" />
        <EdgeBlur side="left" />
      </div>

      <button
        type="button"
        aria-label="روزهای بعد"
        onClick={onNextWeek}
        className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-dash-muted transition hover:bg-white/5 hover:text-dash-text sm:flex"
      >
        <ChevronLeft size={18} />
      </button>
    </div>
  );
}
