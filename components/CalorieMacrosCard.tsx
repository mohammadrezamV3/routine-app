"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Beef, Droplet, Sparkles, Wheat } from "lucide-react";
import { faNum } from "@/lib/jalali";
import { DashCard } from "./DashCard";
import { CalorieAiScanModal } from "./CalorieAiScanModal";

type Entry = { proteinG?: number | null; carbsG?: number | null; fatG?: number | null; aiScanned?: boolean };

// «ریز درشت‌مغذی‌ها» — طبق طرح کاربر، سه باکس جداگانه‌ی پروتئین/کربوهیدرات/
// چربی توی یک باکس واحد ادغام شدن. این بخش فقط وقتی عدد نشون می‌ده که
// کاربر حداقل یک غذا رو امروز با اسکن AI ثبت کرده باشه — چون تنها راه
// این اپ برای داشتن داده‌ی واقعی درشت‌مغذی (بدون کاتالوگ دستی هزاران
// غذا) همینه؛ وگرنه یک حالت قفل با دعوت به اسکن نشون می‌ده.
export function CalorieMacrosCard({
  entries,
  mealTypes,
  onLogged,
  delay,
}: {
  entries: Entry[];
  mealTypes: { key: string; label: string }[];
  onLogged: () => void;
  delay?: number;
}) {
  const [scanOpen, setScanOpen] = useState(false);

  const scanned = entries.filter((e) => e.aiScanned);
  const hasData = scanned.length > 0;
  const totals = scanned.reduce(
    (acc, e) => ({
      protein: acc.protein + (e.proteinG || 0),
      carbs: acc.carbs + (e.carbsG || 0),
      fat: acc.fat + (e.fatG || 0),
    }),
    { protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <DashCard delay={delay}>
      <h2 className="flex items-center gap-1.5 text-[13px] font-bold text-dash-text sm:text-[15px]">
        <Sparkles className="h-4 w-4 text-dash-green sm:h-[18px] sm:w-[18px]" />
        ریز درشت‌مغذی‌ها
      </h2>

      {hasData ? (
        <>
          <div className="mt-3.5 grid grid-cols-3 gap-2.5 sm:gap-3">
            {[
              { icon: Beef, label: "پروتئین", value: totals.protein },
              { icon: Wheat, label: "کربوهیدرات", value: totals.carbs },
              { icon: Droplet, label: "چربی", value: totals.fat },
            ].map((m) => (
              <div key={m.label} className="flex flex-col items-center gap-1.5 rounded-2xl border border-dash-border bg-white/[0.02] px-2 py-3 text-center">
                <m.icon className="h-4 w-4 text-dash-green" />
                <div className="mono text-[13px] font-bold text-dash-text sm:text-[15px]">{faNum(Math.round(m.value))}<span className="text-[9.5px] font-semibold text-dash-muted"> گرم</span></div>
                <div className="text-[9px] font-semibold text-dash-muted sm:text-[10.5px]">{m.label}</div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setScanOpen(true)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 text-[11px] font-semibold text-dash-green transition hover:brightness-110 sm:text-[12.5px]"
          >
            <Sparkles size={14} />
            اسکن غذای دیگه
          </button>
        </>
      ) : (
        <div className="mt-3.5 flex flex-col items-center gap-3 py-2 text-center">
          <div className="text-[11px] leading-relaxed text-dash-muted sm:text-[12.5px]">
            برای دیدن ریز پروتئین/کربوهیدرات/چربی، یه عکس از غذات بگیر تا هوش مصنوعی تحلیلش کنه.
          </div>
          <button
            type="button"
            onClick={() => setScanOpen(true)}
            className="flex items-center justify-center gap-1.5 rounded-2xl border px-4 py-2.5 text-[11.5px] font-bold sm:text-[13px]"
            style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
          >
            <Sparkles size={14} />
            اسکن غذا با هوش مصنوعی
          </button>
        </div>
      )}

      {scanOpen && createPortal(
        <CalorieAiScanModal mealTypes={mealTypes} onClose={() => setScanOpen(false)} onLogged={onLogged} />,
        document.body
      )}
    </DashCard>
  );
}
