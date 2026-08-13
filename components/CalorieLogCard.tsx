"use client";

import { useState } from "react";
import { ChevronDown, ListChecks, X } from "lucide-react";
import { faNum } from "@/lib/jalali";
import { DashCard } from "./DashCard";

type Entry = { id: string; customName: string; customCalories: number; grams: number; date?: string };

// «امروز» + «تاریخچه‌ی غذایی» — لیستِ غذاهای ثبت‌شده‌ی امروز و آکاردئونِ
// ۳۰ روزِ اخیر، هم‌نقشِ ExerciseWeekGrid توی بدنسازی (خلاصه‌ی زیرِ گرید).
export function CalorieLogCard({
  entries,
  onRemove,
  historyEntries,
  historyLoading,
  delay,
}: {
  entries: Entry[];
  onRemove: (id: string) => void;
  historyEntries: Entry[];
  historyLoading: boolean;
  delay?: number;
}) {
  const [historyOpen, setHistoryOpen] = useState(false);

  const historyByDate = historyEntries.reduce<Record<string, Entry[]>>((acc, e) => {
    const d = (e.date || "").slice(0, 10);
    if (!acc[d]) acc[d] = [];
    acc[d].push(e);
    return acc;
  }, {});
  const historyDates = Object.keys(historyByDate).sort((a, b) => (a < b ? 1 : -1));

  return (
    <DashCard delay={delay}>
      <h2 className="flex items-center gap-1.5 text-[13px] font-bold text-dash-text sm:text-[15px]">
        <ListChecks className="h-4 w-4 text-dash-green sm:h-[18px] sm:w-[18px]" />
        امروز
      </h2>

      <div className="mt-3 flex flex-col gap-2">
        {entries.length ? (
          entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-2 rounded-xl border border-dash-border bg-white/[0.02] px-3 py-2.5">
              <span className="min-w-0 truncate text-[11.5px] font-semibold text-dash-text sm:text-[12.5px]">
                {e.customName} <span className="mono text-dash-muted">({faNum(e.grams)}g)</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="mono text-[11px] text-dash-muted sm:text-[12px]">{faNum(e.customCalories)} kcal</span>
                <button
                  type="button"
                  onClick={() => onRemove(e.id)}
                  aria-label="حذف"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[13px] transition hover:bg-[rgba(224,82,82,.12)] hover:border-[#E05252] hover:text-[#E05252] sm:h-[26px] sm:w-[26px]"
                  style={{ borderColor: "rgba(224,82,82,.35)", color: "#E05252" }}
                >
                  <X size={13} />
                </button>
              </span>
            </div>
          ))
        ) : (
          <div className="text-[11.5px] text-dash-muted sm:text-[12.5px]">هنوز چیزی برای امروز ثبت نشده</div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setHistoryOpen((v) => !v)}
        className="mt-5 flex w-full items-center justify-between border-t pt-4 text-[11.5px] font-bold text-dash-text sm:text-[13px]"
        style={{ borderColor: "var(--line)" }}
      >
        <span>تاریخچه غذایی (۳۰ روز اخیر)</span>
        <ChevronDown className={`h-4 w-4 text-dash-muted transition-transform ${historyOpen ? "rotate-180" : ""}`} />
      </button>

      {historyOpen && (
        <div className="mt-3 flex flex-col">
          {historyLoading ? (
            <div className="text-[11.5px] text-dash-muted sm:text-[12.5px]">در حال بارگذاری…</div>
          ) : historyDates.length ? (
            historyDates.map((d) => {
              const dayEntries = historyByDate[d];
              const dayTotal = dayEntries.reduce((s, e) => s + e.customCalories, 0);
              return (
                <div key={d} className="border-b py-2.5 last:border-b-0" style={{ borderColor: "var(--line)" }}>
                  <div className="flex items-center justify-between text-[11.5px] sm:text-[12.5px]">
                    <span className="mono text-dash-muted">{d}</span>
                    <span className="mono font-bold text-dash-green">{faNum(dayTotal)} kcal</span>
                  </div>
                  <div className="mt-1 text-[10.5px] leading-relaxed text-dash-muted sm:text-[11.5px]">
                    {dayEntries.map((e) => `${e.customName} (${faNum(e.customCalories)}kcal)`).join("، ")}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-[11.5px] text-dash-muted sm:text-[12.5px]">هنوز تاریخچه‌ای ثبت نشده</div>
          )}
        </div>
      )}
    </DashCard>
  );
}
