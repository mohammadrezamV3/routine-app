import { ChevronRight, ChevronLeft } from "lucide-react";
import {
  CAL_WEEK_ORDER, FA_WEEKDAY_SHORT, J_MONTHS, faNum,
  isoLocal, jalaliMonthLength, jalaliToGregorianApprox,
} from "@/lib/jalali";

export type DayMark = "done" | "missed" | undefined;

// شبکه‌ی ماهِ جلالی — هم برای تبِ «تقویم» روتین (با نقطه‌ی سبز/قرمزِ
// تکمیل) و هم برای انتخابِ یک تاریخ (برنامه‌ی تک‌روزه/تاریخِ انتقال)
// استفاده می‌شه. پورت از منطقِ components/HistoryCalendar.tsx +
// components/JalaliDatePicker.tsx وب، ادغام‌شده در یک گرید ساده برای موبایل.
export default function JalaliMonthGrid({
  year,
  month,
  onNav,
  onSelect,
  selectedIso,
  todayIso,
  marks,
  outingDates,
  disablePast,
  disableFuture,
}: {
  year: number;
  month: number;
  onNav: (nextYear: number, nextMonth: number) => void;
  onSelect: (iso: string) => void;
  selectedIso?: string | null;
  todayIso: string;
  marks?: Record<string, DayMark>;
  outingDates?: Set<string>;
  disablePast?: boolean;
  disableFuture?: boolean;
}) {
  const monthLen = jalaliMonthLength(month);
  const firstG = jalaliToGregorianApprox(year, month, 1);
  const startCol = (firstG.getDay() + 1) % 7;

  const cells: JSX.Element[] = [];
  for (let i = 0; i < startCol; i++) cells.push(<div key={"e" + i} />);
  for (let d = 1; d <= monthLen; d++) {
    const gd = jalaliToGregorianApprox(year, month, d);
    const iso = isoLocal(gd);
    const isToday = iso === todayIso;
    const isSelected = selectedIso === iso;
    const disabled = (disablePast && iso < todayIso) || (disableFuture && iso > todayIso);
    const mark = marks?.[iso];
    cells.push(
      <button
        key={iso}
        type="button"
        disabled={disabled}
        onClick={() => onSelect(iso)}
        className="relative flex flex-col items-center justify-center rounded-xl font-vazir"
        style={{
          aspectRatio: "1",
          minHeight: 40,
          background: isSelected ? "var(--accent)" : isToday ? "var(--surface-2)" : "transparent",
          color: isSelected ? "var(--bg)" : disabled ? "var(--muted2)" : "var(--text)",
          fontWeight: isToday || isSelected ? 700 : 500,
          opacity: disabled ? 0.4 : 1,
        }}
      >
        <span className="mono text-[13px]">{faNum(d)}</span>
        {mark && (
          <span
            className="absolute bottom-1 h-1.5 w-1.5 rounded-full"
            style={{ background: mark === "done" ? "var(--accent)" : "var(--pnl-loss)" }}
          />
        )}
        {outingDates?.has(iso) && (
          <span className="absolute end-1.5 top-1.5 h-1.5 w-1.5 rounded-full" style={{ background: "var(--secondary)" }} />
        )}
      </button>
    );
  }

  function prevMonth() {
    if (month === 1) onNav(year - 1, 12);
    else onNav(year, month - 1);
  }
  function nextMonth() {
    if (month === 12) onNav(year + 1, 1);
    else onNav(year, month + 1);
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={prevMonth} aria-label="ماه قبل" style={{ width: 40, height: 40 }} className="flex items-center justify-center">
          <ChevronRight size={18} color="var(--muted)" />
        </button>
        <div className="font-vazir text-[14px] font-semibold" style={{ color: "var(--text)" }}>
          {J_MONTHS[month - 1]} {faNum(year)}
        </div>
        <button type="button" onClick={nextMonth} aria-label="ماه بعد" style={{ width: 40, height: 40 }} className="flex items-center justify-center">
          <ChevronLeft size={18} color="var(--muted)" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {CAL_WEEK_ORDER.map((d) => (
          <div key={d} className="font-vazir text-center text-[11px]" style={{ color: "var(--muted)" }}>
            {FA_WEEKDAY_SHORT[d]}
          </div>
        ))}
        {cells}
      </div>
    </div>
  );
}
