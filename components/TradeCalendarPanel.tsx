"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, PiggyBank } from "lucide-react";
import {
  CAL_WEEK_ORDER, FA_WEEKDAY_SHORT, J_MONTHS, faNum,
  isoLocal, jalaliMonthLength, jalaliToGregorianApprox, toJalali,
} from "@/lib/jalali";
import { G_MONTHS, gregorianMonthLength } from "@/lib/gregorian";
import { dailyPnl } from "@/lib/tradeAnalytics";
import type { CalSystem, TradeEntry } from "@/lib/tradeTypes";

const now = new Date();
const jNow = toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
const todayIso = isoLocal(now);

// تقویم ماهانه‌ی سود/زیان روی صفحه‌ی هر حساب: هر خانه رنگش از سود/زیان
// همان روز می‌آید (همون dailyPnl که قبلا توی lib/tradeAnalytics بود ولی
// هیچ مصرف‌کننده‌ای نداشت). کلیک روی روزی که معامله دارد، لیست معاملات
// پایین صفحه رو به همون روز فیلتر می‌کنه (state بالادستی، اینجا فقط
// انتخاب/لغوِ انتخاب).
export function TradeCalendarPanel({
  entries,
  calSystem,
  selectedDay,
  onSelectDay,
}: {
  entries: TradeEntry[];
  calSystem: CalSystem;
  selectedDay: string | null;
  onSelectDay: (iso: string) => void;
}) {
  const jalali = calSystem === "jalali";
  const [year, setYear] = useState(jalali ? jNow[0] : now.getFullYear());
  const [month, setMonth] = useState(jalali ? jNow[1] : now.getMonth() + 1);

  const pnlByDay = useMemo(() => dailyPnl(entries, isoLocal), [entries]);

  const monthLen = jalali ? jalaliMonthLength(month) : gregorianMonthLength(year, month);
  const firstDate = jalali ? jalaliToGregorianApprox(year, month, 1) : new Date(year, month - 1, 1);
  const startCol = (firstDate.getDay() + 1) % 7;
  const label = jalali ? `${J_MONTHS[month - 1]} ${faNum(year)}` : `${G_MONTHS[month - 1]} ${faNum(year)}`;

  function go(delta: number) {
    let m = month + delta, y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setMonth(m); setYear(y);
  }

  let monthNet = 0;
  const cells: JSX.Element[] = [];
  for (let i = 0; i < startCol; i++) cells.push(<div key={`e${i}`} className="cal-cell empty" />);
  for (let d = 1; d <= monthLen; d++) {
    const gd = jalali ? jalaliToGregorianApprox(year, month, d) : new Date(year, month - 1, d);
    const iso = isoLocal(gd);
    const pnl = pnlByDay[iso];
    const hasTrades = pnl !== undefined;
    if (hasTrades) monthNet += pnl;
    const isToday = iso === todayIso;
    const isSelected = iso === selectedDay;
    cells.push(
      <div
        key={iso}
        onClick={() => hasTrades && onSelectDay(iso)}
        className={`cal-cell trade-cal-cell${isToday ? " today" : ""}${isSelected ? " selected" : ""}${hasTrades ? (pnl >= 0 ? " win" : " loss") : ""}${!hasTrades ? " no-data" : ""}`}
      >
        <span className="cal-daynum mono">{faNum(d)}</span>
        {hasTrades && <span className="trade-cal-pnl mono">{formatCompact(pnl)}</span>}
      </div>
    );
  }

  return (
    <div className="trade-surface trade-calendar-box">
      <div className="trade-calendar-head">
        <div className="trade-section-title"><PiggyBank size={15} /> تقویم سود/زیان</div>
        {!!monthNet && (
          <span className="trade-calendar-total mono" style={{ color: monthNet > 0 ? "var(--accent)" : "#E05252" }}>
            {formatCompact(monthNet, true)}
          </span>
        )}
      </div>
      <div className="cal-controls">
        <button type="button" className="trade-icon-btn" onClick={() => go(-1)} aria-label="ماه قبل"><ChevronLeft size={16} /></button>
        <div className="cal-label">{label}</div>
        <button type="button" className="trade-icon-btn" onClick={() => go(1)} aria-label="ماه بعد"><ChevronRight size={16} /></button>
      </div>
      <div className="cal-grid trade-cal-grid">
        {CAL_WEEK_ORDER.map((d) => <div key={d} className="cal-weekday">{FA_WEEKDAY_SHORT[d]}</div>)}
        {cells}
      </div>
    </div>
  );
}

// اعداد بزرگ داخل خانه‌ی کوچیک تقویم جا نمی‌شن — «۱۲۰۰» به «۱.2k» کوتاه می‌شه
function formatCompact(n: number, withSign = false): string {
  const abs = Math.abs(n);
  const val = abs >= 1000 ? `${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k` : abs.toFixed(0);
  const sign = n < 0 ? "-" : withSign && n > 0 ? "+" : "";
  return `${sign}${faNum(val)}`;
}
