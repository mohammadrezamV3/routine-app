import { CAL_WEEK_ORDER, FA_WEEKDAY_SHORT, J_MONTHS, isoLocal, jalaliMonthLength, jalaliToIso, pad, toJalali } from "../lib/jalali";
import { G_MONTHS, formatGregorian, gregorianMonthLength } from "../lib/gregorian";

interface Props {
  jalaliYear: number;
  jalaliMonth: number; // 1..12
  system: "jalali" | "gregorian";
  gregorianYear: number;
  gregorianMonth: number; // 1..12
  pnlByIso: Record<string, number>;
  onSelectIso: (iso: string) => void;
  selectedIso: string | null;
}

// هیت‌مپ سود/زیانِ ماه — جلالی (پیش‌فرض) یا میلادی. رنگ هر خانه از سبز
// (سود) تا قرمز (زیان) با شدتِ متناسب با اندازه‌ی مبلغ نسبت به بیشینه‌ی ماه.
export default function MonthHeatmap({
  jalaliYear,
  jalaliMonth,
  system,
  gregorianYear,
  gregorianMonth,
  pnlByIso,
  onSelectIso,
  selectedIso,
}: Props) {
  const isJalali = system === "jalali";
  const daysInMonth = isJalali ? jalaliMonthLength(jalaliMonth) : gregorianMonthLength(gregorianYear, gregorianMonth);

  const cells: { day: number; iso: string | null; weekday: number }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    let iso: string | null;
    let weekday: number;
    if (isJalali) {
      iso = jalaliToIso(jalaliYear, jalaliMonth, d);
      weekday = iso ? new Date(iso + "T00:00:00").getDay() : 0;
    } else {
      const dt = new Date(gregorianYear, gregorianMonth - 1, d);
      iso = isoLocal(dt);
      weekday = dt.getDay();
    }
    cells.push({ day: d, iso, weekday });
  }

  const maxAbs = Math.max(1, ...Object.values(pnlByIso).map((v) => Math.abs(v)));
  const leadingBlanks = isJalali
    ? CAL_WEEK_ORDER.indexOf(cells[0]?.weekday ?? 6)
    : (cells[0]?.weekday ?? 0);

  const weekLabels = isJalali ? ["ش", "ی", "د", "س", "چ", "پ", "ج"] : ["ی", "د", "س", "چ", "پ", "ج", "ش"];

  function cellColor(pnl: number | undefined) {
    if (pnl === undefined || pnl === 0) return "var(--surface-2)";
    const ratio = Math.min(1, Math.abs(pnl) / maxAbs);
    const alpha = 0.18 + ratio * 0.55;
    return pnl > 0 ? `rgba(22,199,154,${alpha})` : `rgba(224,82,82,${alpha})`;
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-center gap-1.5">
        <span className="font-vazir text-[13.5px] font-semibold" style={{ color: "var(--text)" }}>
          {isJalali ? `${J_MONTHS[jalaliMonth - 1]} ${jalaliYear}` : `${G_MONTHS[gregorianMonth - 1]} ${gregorianYear}`}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {weekLabels.map((w) => (
          <div key={w} className="text-center font-vazir text-[10.5px]" style={{ color: "var(--muted)" }}>
            {w}
          </div>
        ))}
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`b${i}`} />
        ))}
        {cells.map((c) => {
          const pnl = c.iso ? pnlByIso[c.iso] : undefined;
          const selected = !!c.iso && c.iso === selectedIso;
          return (
            <button
              key={c.day}
              disabled={!c.iso}
              onClick={() => c.iso && onSelectIso(c.iso)}
              className="flex aspect-square flex-col items-center justify-center rounded-lg"
              style={{
                background: cellColor(pnl),
                minHeight: 40,
                outline: selected ? "2px solid var(--accent)" : "none",
              }}
            >
              <span className="font-vazir text-[11px]" style={{ color: "var(--text)" }}>
                {c.day}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
