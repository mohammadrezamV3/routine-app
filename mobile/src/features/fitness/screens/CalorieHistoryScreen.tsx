import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { useLiveQuery } from "../hooks/useLiveQuery";
import { fitnessDb } from "../db";
import { entriesForDate, kcalOf } from "../lib/repo";
import { toJalali, jalaliMonthLength, jalaliToIso, J_MONTHS, CAL_WEEK_ORDER, FA_WEEKDAY_SHORT, isoLocal } from "../lib/jalali";

// تاریخچه‌ی کالری به‌شکلِ تقویمِ جلالی — روزهایی که ثبتِ کالری دارن نقطه
// می‌گیرن؛ تپ روی هر روز جمعِ کالریِ همون روز رو نشون می‌ده. کاملا آفلاین،
// از روی جدولِ محلیِ calorieEntries.
export default function CalorieHistoryScreen() {
  const now = new Date();
  const [jy, jm] = toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const [year, setYear] = useState(jy);
  const [month, setMonth] = useState(jm);
  const [selected, setSelected] = useState<string | null>(null);

  const entries = useLiveQuery(async () => fitnessDb.calorieEntries.filter((e) => !e.deletedAt).toArray(), [], []);
  const dayTotals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of entries) {
      map[e.date] = (map[e.date] ?? 0) + kcalOf(e);
    }
    return map;
  }, [entries]);

  const dayCount = jalaliMonthLength(month);
  const firstIso = jalaliToIso(year, month, 1);
  const firstWeekday = firstIso ? CAL_WEEK_ORDER.indexOf(new Date(firstIso).getDay()) : 0;

  function shiftMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setMonth(m);
    setYear(y);
    setSelected(null);
  }

  const selectedTotal = selected ? Math.round(dayTotals[selected] ?? 0) : null;

  return (
    <div>
      <AppHeader title="تاریخچه‌ی کالری" showBack />
      <div className="flex flex-col gap-4 px-4 pb-24 pt-4">
        <div className="flex items-center justify-between">
          <button onClick={() => shiftMonth(-1)} style={{ width: 44, height: 44 }} aria-label="ماه قبل">
            <ChevronRight size={20} color="var(--muted)" />
          </button>
          <span className="font-vazir text-[14px] font-semibold" style={{ color: "var(--text)" }}>
            {J_MONTHS[month - 1]} {year}
          </span>
          <button onClick={() => shiftMonth(1)} style={{ width: 44, height: 44 }} aria-label="ماه بعد">
            <ChevronLeft size={20} color="var(--muted)" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {CAL_WEEK_ORDER.map((wd) => (
            <span key={wd} className="text-center font-vazir text-[11px]" style={{ color: "var(--muted)" }}>
              {FA_WEEKDAY_SHORT[wd]}
            </span>
          ))}
          {Array.from({ length: firstWeekday }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {Array.from({ length: dayCount }).map((_, i) => {
            const jd = i + 1;
            const iso = jalaliToIso(year, month, jd);
            const hasLog = iso ? dayTotals[iso] != null : false;
            const isToday = iso === isoLocal(now);
            const isSelected = iso === selected;
            return (
              <button
                key={jd}
                onClick={() => iso && setSelected(iso)}
                className="flex aspect-square flex-col items-center justify-center rounded-lg font-vazir text-[12px]"
                style={{
                  minHeight: 40,
                  background: isSelected ? "var(--accent)" : isToday ? "var(--accent-dim)" : "var(--surface-1)",
                  color: isSelected ? "#fff" : "var(--text)",
                  border: "1px solid var(--surface-line)",
                }}
              >
                {jd}
                {hasLog && (
                  <span
                    className="mt-0.5 rounded-full"
                    style={{ width: 4, height: 4, background: isSelected ? "#fff" : "var(--accent)" }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {selected && (
          <div className="rounded-xl p-3 text-center" style={{ background: "var(--surface-1)", border: "1px solid var(--surface-line)" }}>
            <p className="font-vazir text-[12px]" style={{ color: "var(--muted)" }}>
              {selected}
            </p>
            <p className="font-vazir text-[16px] font-bold" style={{ color: "var(--text)" }}>
              {selectedTotal ?? 0} kcal
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
