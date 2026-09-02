"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type DashDay = { iso: string; weekday: string; dateLabel: string };

// بلور لبه، لایه‌لایه — هرچی به لبه نزدیک‌تر، هم بلور بیشتر هم عرض کمتر،
// تا حس «رفته‌رفته تارتر شدن» بده، نه یک بلور یک‌دست ماسک‌شده.
const EDGE_BLUR_LAYERS = [
  { width: "34%", blur: 2 },
  { width: "22%", blur: 5 },
  { width: "12%", blur: 10 },
];

function EdgeBlur({ side, show }: { side: "left" | "right"; show: boolean }) {
  const gradientDir = side === "right" ? "to left" : "to right";
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-y-0 w-10 transition-opacity duration-200 sm:w-14",
        side === "right" ? "right-0" : "left-0",
        show ? "opacity-100" : "opacity-0"
      )}
    >
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

// نوار انتخاب تاریخ — راست‌چین طبیعی صفحه (چون days از قبل به ترتیب
// تاریخی صعودی ساخته می‌شه و چیدمان RTL خودش این ترتیب رو می‌ده). دیگه یک
// هفته‌ی کامل نیست — یه پنجره‌ی داینامیک چندروزه که همیشه روی «امروز»
// وسط‌چینه. فلش‌های قبلی/بعدی همون پنجره رو جابه‌جا می‌کنن، رو به بیرون (نه
// سمت لیست)، و فقط توی دسکتاپ دیده می‌شن — توی موبایل با انگشت اسکرول
// می‌شه (اسکرول‌بار خود مرورگر هم مخفیه، no-scrollbar).
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
  // بلور لبه فقط وقتی نشون داده بشه که واقعا روزی رفته زیر لبه (اسکرول
  // واقعی داره)، نه همیشه — وگرنه حتی روز کاملا دیده‌شده‌ی کنار دکمه‌ی
  // قبلی/بعدی هم دائم تار به‌نظر می‌رسید. راست/چپ RTL بر اساس مدل
  // استاندارد scrollLeft منفی (۰ تا -(max)) که مرورگرهای امروزی استفاده می‌کنن.
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);

  // روز فعال همیشه وسط نوار بمونه — هم موقع لود اولیه، هم هر بار که با
  // فلش/کلیک عوض می‌شه (از جمله موقعی که هفته با فلش عوض می‌شه ولی همون
  // ایزوی فعال توی هفته‌ی جدید نیست، پس این افکت روی activeIso و days هردو گوش می‌ده).
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeIso, days]);

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
  }, [days]);

  // به‌جای یک عدد ثابت، هرچقدر عرض واقعی نوار جا داره روز نشون می‌ده.
  //
  // نسخه‌ی قبلی عرض هر پیل رو ثابت ۶۲px (موبایل) فرض می‌کرد، ولی پیل‌ها
  // `shrink-0`ـن و عرضشون از محتواشون میاد — «چهارشنبه» + «۳۰ شهریور» روی
  // یه گوشی ۳۹۰ پیکسلی حدود ۷۵px می‌شه، نه ۶۲. نتیجه این بود که تخمین
  // بیشتر از واقعیت درمی‌اومد، پیل‌ها سرریز می‌کردن و عملا فقط سه روز
  // دیده می‌شد (بقیه زیر لبه‌ی اسکرول). حالا عرض واقعی رندرشده‌ی
  // پهن‌ترین پیل اندازه گرفته می‌شه. چون خود پیل‌ها با تغییر تعداد
  // عرضشون عوض نمی‌شه، این حلقه در یک قدم همگرا می‌شه.
  useEffect(() => {
    if (!onVisibleCountChange) return;
    const el = scrollRef.current;
    if (!el) return;
    const compute = () => {
      const w = el.clientWidth;
      if (w <= 0) return;
      const isSm = window.innerWidth >= 640;
      let pillWidth = isSm ? 92 : 62;
      el.querySelectorAll<HTMLElement>("[data-day-pill]").forEach((pill) => {
        pillWidth = Math.max(pillWidth, Math.ceil(pill.getBoundingClientRect().width));
      });
      const gap = 6;
      // پدینگ افقی خود نوار (px-3) داخل clientWidth حساب شده، پس ازش کم می‌شه
      const usable = w - 24;
      const n = Math.floor((usable + gap) / (pillWidth + gap));
      const odd = n % 2 === 0 ? n - 1 : n;
      onVisibleCountChange(Math.max(3, odd));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days.length]);

  // سوایپ با انگشت: کشیدن به راست → روزهای گذشته، به چپ → روزهای آینده
  // (هم‌جهت با فلش‌های دسکتاپ که توی RTL «قبلی» سمت راسته). فقط وقتی
  // حرکت افقی واضحا از عمودی بیشتره عمل می‌کنه تا اسکرول عمودی صفحه
  // رو نشکنه.
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx > 0) onPrevWeek();
    else onNextWeek();
  }

  return (
    <div
      className={cn("flex flex-1 items-center gap-1 overflow-hidden rounded-dash border border-dash-border backdrop-blur-xl", className)}
      style={{ background: "rgba(var(--bg-rgb), .16)" }}
    >
      <button
        type="button"
        aria-label="روزهای قبل"
        onClick={onPrevWeek}
        className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-dash-muted transition hover:bg-white/5 hover:text-dash-text sm:flex"
      >
        <ChevronRight size={18} />
      </button>

      <div className="relative min-w-0 flex-1">
        <div
          ref={scrollRef}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="no-scrollbar flex items-center justify-between gap-1.5 overflow-x-auto px-3 py-2.5"
        >
          {days.map((d) => {
            const active = d.iso === activeIso;
            return (
              <button
                key={d.iso}
                ref={active ? activeRef : undefined}
                data-day-pill
                type="button"
                onClick={() => onSelect(d.iso)}
                className={cn(
                  "flex min-w-[54px] shrink-0 flex-col items-center gap-0.5 rounded-2xl px-1 py-1 text-center transition sm:min-w-[92px] sm:gap-1 sm:px-3 sm:py-2",
                  active ? "text-dash-bg" : "text-dash-muted hover:bg-white/5"
                )}
                style={
                  active
                    ? { background: "var(--accent)", boxShadow: "0 0 0 1px rgba(var(--accent-rgb),.4), 0 0 8px rgba(var(--accent-rgb),.3)" }
                    : undefined
                }
              >
                <span className={cn("whitespace-nowrap text-[10px] font-semibold sm:text-[13px]", active ? "text-dash-bg" : "text-dash-text")}>
                  {d.weekday}
                </span>
                <span className={cn("whitespace-nowrap text-[9px] sm:text-[12px]", active ? "text-dash-bg/80" : "text-dash-muted")}>{d.dateLabel}</span>
              </button>
            );
          })}
        </div>
        <EdgeBlur side="right" show={canScrollRight} />
        <EdgeBlur side="left" show={canScrollLeft} />
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
