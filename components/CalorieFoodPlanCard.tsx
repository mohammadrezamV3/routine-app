"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Plus, UtensilsCrossed, X } from "lucide-react";
import { faNum } from "@/lib/jalali";
import { DashCard } from "./DashCard";
import { CalorieAddEntryModal } from "./CalorieAddEntryModal";
import { CalorieAiScanModal } from "./CalorieAiScanModal";
import type { Target } from "./CaloriePanel";

type Entry = { id: string; customName: string; customCalories: number; grams: number; date?: string };

// «برنامه غذایی» — کارتِ اصلیِ ستونِ راست، هم‌قاعده‌ی اندازه‌ی
// ExerciseTaskListِ داشبوردِ بدنسازی: با h-full توی گریدِ items-stretch
// قدِّ کلِ ستونِ کناری (استریک+دوستان) رو می‌گیره و خودِ لیستِ غذاها هم
// مثلِ اونجا داخلِ یه بخشِ اسکرول‌شونده با سقفِ ارتفاعِ ثابت جا می‌گیره،
// نه اینکه با هر ثبتِ جدید کلِ کارت بی‌نهایت درازتر بشه. بالای کارت
// خلاصه‌ی مصرفِ همون روزِ انتخاب‌شده (عدد/هدف + خطِ نازکِ پیشرفت + دکمه‌ی
// «تغییر برنامه»، بدونِ متنِ «کالری امروز» و بدونِ درصد — طبقِ طرحِ کاربر)،
// بعدش یه جداکننده و لیستِ غذاها + دکمه‌ی «افزودن». دکمه‌ی افزودن فقط
// برای «امروز» فعاله — روزهای گذشته/آینده فقط نمایشی‌ان.
export function CalorieFoodPlanCard({
  date,
  isToday,
  entries,
  onRemove,
  onAdded,
  mealTypes,
  target,
  totalToday,
  pct,
  onEditGoal,
  delay,
}: {
  date: string;
  isToday: boolean;
  entries: Entry[];
  onRemove: (id: string) => void;
  onAdded: () => void;
  mealTypes: { key: string; label: string }[];
  target: Target;
  totalToday: number;
  pct: number;
  onEditGoal: () => void;
  delay?: number;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const overGoal = pct > 100;
  const barColor = overGoal ? "#E05252" : "var(--accent)";

  return (
    <DashCard delay={delay} className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between">
        <div className="mono text-[15px] font-extrabold sm:text-[18px]" style={{ color: barColor }}>
          {faNum(totalToday)}
          <span className="mx-1 text-dash-muted">/</span>
          {faNum(target.dailyTargetKcal)}
          <span className="mr-1.5 text-[10.5px] font-semibold text-dash-muted sm:text-[12px]">کالری</span>
        </div>
        <button type="button" onClick={onEditGoal} className="text-[11px] font-semibold text-dash-green transition hover:brightness-110 sm:text-[12.5px]">
          تغییر برنامه
        </button>
      </div>

      <div className="mt-2.5 shrink-0" style={{ height: 2, background: "rgba(255,255,255,.08)" }}>
        <motion.div
          className="h-full"
          style={{ background: barColor }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, pct)}%` }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </div>

      <div className="mt-4 flex shrink-0 items-center justify-between border-t pt-3.5 sm:mt-5 sm:pt-4" style={{ borderColor: "var(--line)" }}>
        <h2 className="flex items-center gap-1.5 text-[13px] font-bold text-dash-text sm:text-[15px]">
          <UtensilsCrossed className="h-4 w-4 text-dash-green sm:h-[18px] sm:w-[18px]" />
          برنامه غذایی
        </h2>
        {isToday && (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1 text-[11.5px] font-semibold text-dash-green transition hover:brightness-110 sm:gap-1.5 sm:text-[13.5px]"
          >
            <Plus className="h-[15px] w-[15px] sm:h-[17px] sm:w-[17px]" />
            افزودن
          </button>
        )}
      </div>

      <div className="thin-scroll mt-3 min-h-0 flex-1 overflow-y-auto overflow-x-hidden" style={{ maxHeight: 360 }}>
        <div className="flex flex-col gap-2">
          {entries.length ? (
            entries.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 rounded-xl border border-dash-border bg-white/[0.02] px-3 py-2.5">
                <span className="min-w-0 truncate text-[11.5px] font-semibold text-dash-text sm:text-[12.5px]">
                  {e.customName} <span className="mono text-dash-muted">({faNum(e.grams)}g)</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="mono text-[11px] text-dash-muted sm:text-[12px]">{faNum(e.customCalories)} kcal</span>
                  {isToday && (
                    <button
                      type="button"
                      onClick={() => onRemove(e.id)}
                      aria-label="حذف"
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[13px] transition hover:bg-[rgba(224,82,82,.12)] hover:border-[#E05252] hover:text-[#E05252] sm:h-[26px] sm:w-[26px]"
                      style={{ borderColor: "rgba(224,82,82,.35)", color: "#E05252" }}
                    >
                      <X size={13} />
                    </button>
                  )}
                </span>
              </div>
            ))
          ) : (
            <div className="text-[11.5px] text-dash-muted sm:text-[12.5px]">
              {isToday ? "هنوز چیزی برای امروز ثبت نشده" : "برای این روز چیزی ثبت نشده"}
            </div>
          )}
        </div>
      </div>

      {addOpen && createPortal(
        <CalorieAddEntryModal
          date={date}
          mealTypes={mealTypes}
          onClose={() => setAddOpen(false)}
          onAdded={onAdded}
          onOpenAiScan={() => { setAddOpen(false); setScanOpen(true); }}
        />,
        document.body
      )}

      {scanOpen && createPortal(
        <CalorieAiScanModal date={date} mealTypes={mealTypes} onClose={() => setScanOpen(false)} onLogged={onAdded} />,
        document.body
      )}
    </DashCard>
  );
}
