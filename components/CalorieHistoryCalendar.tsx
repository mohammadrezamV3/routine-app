"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  CAL_WEEK_ORDER, FA_WEEKDAY_SHORT, J_MONTHS, faNum,
  isoLocal, jalaliMonthLength, jalaliToGregorianApprox, toJalali,
} from "@/lib/jalali";

type Entry = { customCalories: number; date?: string };

const now = new Date();
const todayIso = isoLocal(now);
const jToday = toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());

// تقویمِ ماهانه‌ی مخصوصِ کالری — هم‌ساختارِ HistoryCalendar (تقویمِ روتین)
// ولی به‌جای تکمیل‌شدنِ تسک‌های روزانه، هر روز رو بر اساسِ برخورد با هدفِ
// کالری رنگ می‌کنه (سبز = ثبت‌شده و زیرِ هدف، قرمز = ثبت‌شده و بالای هدف،
// خاکستری = چیزی ثبت نشده). عمداً کامپوننتِ HistoryCalendar استفاده نشده،
// چون اون به دیتای روتین/تسک وصله و این‌جا معنی نداشت؛ اینجا هم استایلش
// Tailwind/dash-scope ـه، هم‌راستا با بقیه‌ی بخشِ کالری.
export function CalorieHistoryCalendar({
  targetKcal,
  onPick,
}: {
  targetKcal: number;
  onPick: (iso: string) => void;
}) {
  const [calYear, setCalYear] = useState(jToday[0]);
  const [calMonth, setCalMonth] = useState(jToday[1]);
  const [loading, setLoading] = useState(true);
  const [totalsByDate, setTotalsByDate] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const monthLen = jalaliMonthLength(calMonth);
    const from = isoLocal(jalaliToGregorianApprox(calYear, calMonth, 1));
    const to = isoLocal(jalaliToGregorianApprox(calYear, calMonth, monthLen));
    fetch(`/api/calorie/log/range?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const totals: Record<string, number> = {};
        for (const e of (d.entries || []) as Entry[]) {
          const key = (e.date || "").slice(0, 10);
          if (!key) continue;
          totals[key] = (totals[key] || 0) + e.customCalories;
        }
        setTotalsByDate(totals);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [calYear, calMonth]);

  const monthLen = jalaliMonthLength(calMonth);
  const firstG = jalaliToGregorianApprox(calYear, calMonth, 1);
  const startCol = (firstG.getDay() + 1) % 7;

  const days = useMemo(() => {
    const out: { iso: string; day: number }[] = [];
    for (let d = 1; d <= monthLen; d++) {
      out.push({ iso: isoLocal(jalaliToGregorianApprox(calYear, calMonth, d)), day: d });
    }
    return out;
  }, [calYear, calMonth, monthLen]);

  function goPrev() {
    if (calMonth === 1) { setCalMonth(12); setCalYear((y) => y - 1); } else setCalMonth((m) => m - 1);
  }
  function goNext() {
    if (calMonth === 12) { setCalMonth(1); setCalYear((y) => y + 1); } else setCalMonth((m) => m + 1);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <button type="button" onClick={goNext} aria-label="ماه بعد" className="flex h-8 w-8 items-center justify-center rounded-full text-dash-muted transition hover:bg-white/5 hover:text-dash-text">
          <ChevronLeft size={18} />
        </button>
        <div className="text-[13.5px] font-bold text-dash-text sm:text-[15px]">{J_MONTHS[calMonth - 1]} {faNum(calYear)}</div>
        <button type="button" onClick={goPrev} aria-label="ماه قبل" className="flex h-8 w-8 items-center justify-center rounded-full text-dash-muted transition hover:bg-white/5 hover:text-dash-text">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1.5 sm:gap-2">
        {CAL_WEEK_ORDER.map((d) => (
          <div key={d} className="text-center text-[10.5px] font-bold text-dash-green sm:text-[12px]">{FA_WEEKDAY_SHORT[d]}</div>
        ))}

        {Array.from({ length: startCol }, (_, i) => <div key={`e${i}`} />)}

        {days.map(({ iso, day }) => {
          const total = totalsByDate[iso];
          const hasData = total !== undefined;
          const over = hasData && total > targetKcal;
          const isToday = iso === todayIso;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onPick(iso)}
              className="flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl border transition hover:border-dash-green/50"
              style={{
                borderColor: isToday ? "var(--accent)" : "var(--line)",
                boxShadow: isToday ? "0 0 0 1px var(--accent)" : undefined,
                background: hasData ? (over ? "rgba(224,82,82,.1)" : "rgba(var(--accent-rgb),.1)") : "transparent",
              }}
            >
              <span className="mono text-[11px] font-semibold text-dash-text sm:text-[12.5px]">{faNum(day)}</span>
              {hasData && (
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: over ? "#E05252" : "var(--accent)" }} />
              )}
            </button>
          );
        })}
      </div>

      {loading && <div className="mt-3 text-center text-[11px] text-dash-muted">در حال بارگذاری…</div>}

      <div className="mt-4 flex items-center justify-center gap-4 text-[10.5px] text-dash-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
          زیرِ هدف
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: "#E05252" }} />
          بالایِ هدف
        </span>
      </div>
    </div>
  );
}
