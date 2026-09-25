import { useEffect, useRef } from "react";
import { faNum, isoLocal, toJalali } from "@/lib/jalali";
import { startOfWeek, WEEK_ORDER } from "@/lib/schedule";
import { WeekDayStat } from "@/db/repo";

// نوارِ افقیِ ۷روزه‌ی هفته — برای تبِ «هفتگی»ِ روتین. پورت از منطقِ
// startOfWeek/WEEK_ORDER (lib/schedule.ts وب)، به‌شکلِ یک strip لمسی.
export default function WeekDayStrip({
  selectedIso,
  onSelect,
  stats,
}: {
  selectedIso: string;
  onSelect: (iso: string) => void;
  stats?: WeekDayStat[];
}) {
  const selectedRef = useRef<HTMLButtonElement | null>(null);

  // باگِ حل‌شده — دوباره برنگرده: این strip عرضش از صفحه بیشتره
  // (overflow-x-auto)، ولی موقعِ mount مرورگر موقعیتِ اسکرول رو پیشِ‌فرض
  // "۰" می‌ذاره که توی dir=rtl معادلِ نشون‌دادنِ آخرینِ روزهای هفته‌ست، نه
  // امروز/انتخاب‌شده — یعنی کارتِ امروز (اولین آیتم، معمولا selected) عملا
  // نصفه از سمتِ راستِ صفحه بیرون می‌زد و دیده نمی‌شد. اسکرولش می‌کنیم تا
  // کاملا داخلِ دید باشه.
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ behavior: "auto", inline: "center", block: "nearest" });
  }, [selectedIso]);

  const start = startOfWeek(new Date());
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  const todayIso = isoLocal(new Date());

  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
      {days.map((d) => {
        const iso = isoLocal(d);
        const jd = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
        const order = WEEK_ORDER.find((w) => w.jsDay === d.getDay())!;
        const selected = iso === selectedIso;
        const isToday = iso === todayIso;
        const pct = stats?.find((s) => s.iso === iso)?.pct ?? 0;
        return (
          <button
            key={iso}
            ref={selected ? selectedRef : undefined}
            onClick={() => onSelect(iso)}
            className="flex flex-shrink-0 flex-col items-center gap-1 rounded-2xl px-3 py-2 font-vazir"
            style={{
              minWidth: 52,
              minHeight: 64,
              background: selected ? "var(--accent)" : "var(--surface-1)",
              border: `1px solid ${isToday && !selected ? "var(--accent)" : "var(--surface-line)"}`,
              color: selected ? "var(--bg)" : "var(--text)",
            }}
          >
            <span className="text-[11px]" style={{ opacity: 0.85 }}>{order.short}</span>
            <span className="mono text-[15px] font-bold">{faNum(jd[2])}</span>
            <span
              className="h-1 w-6 rounded-full"
              style={{ background: selected ? "rgba(0,0,0,.25)" : "var(--surface-line)", position: "relative", overflow: "hidden" }}
            >
              <span
                className="absolute inset-y-0 start-0 rounded-full"
                style={{ width: `${pct}%`, background: selected ? "var(--bg)" : "var(--accent)" }}
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}
