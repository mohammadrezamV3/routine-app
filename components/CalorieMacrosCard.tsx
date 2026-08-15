"use client";

import { Beef, Droplet, Sparkles, Wheat } from "lucide-react";
import { faNum } from "@/lib/jalali";
import { DashCard } from "./DashCard";

type Entry = { proteinG?: number | null; carbsG?: number | null; fatG?: number | null; aiScanned?: boolean };

// «جزئیاتِ برنامه‌غذایی» — طبق طرح کاربر، سه باکس جداگانه‌ی پروتئین/کربوهیدرات/
// چربی توی یک باکس واحد ادغام شدن. این بخش فقط وقتی عدد نشون می‌ده که
// حداقل یک غذای این روز درشت‌مغذی ثبت‌شده داشته باشه — چه با اسکنِ AI، چه
// با واردکردنِ دستی توی فرمِ افزودنِ غذا؛ چون کاتالوگِ دستیِ درشت‌مغذی برای
// هزاران غذا نداریم و این تنها دو راهِ داشتنِ عددِ واقعی‌ان.
export function CalorieMacrosCard({
  entries,
  delay,
}: {
  entries: Entry[];
  delay?: number;
}) {
  const withMacros = entries.filter((e) => e.proteinG != null || e.carbsG != null || e.fatG != null);
  const totals = withMacros.reduce(
    (acc, e) => ({
      protein: acc.protein + (e.proteinG || 0),
      carbs: acc.carbs + (e.carbsG || 0),
      fat: acc.fat + (e.fatG || 0),
    }),
    { protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <DashCard delay={delay} className="p-3 sm:p-4">
      <h2 className="flex items-center gap-1.5 text-[13px] font-bold text-dash-text sm:text-[15px]">
        <Sparkles className="h-4 w-4 text-dash-green sm:h-[18px] sm:w-[18px]" />
        جزئیات برنامه غذایی
      </h2>

      <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-2.5">
        {[
          { icon: Beef, label: "پروتئین", value: totals.protein },
          { icon: Wheat, label: "کربوهیدرات", value: totals.carbs },
          { icon: Droplet, label: "چربی", value: totals.fat },
        ].map((m) => (
          <div key={m.label} className="flex flex-col items-center gap-1 rounded-2xl border border-dash-border bg-white/[0.02] px-2 py-2.5 text-center">
            <m.icon className="h-3.5 w-3.5 text-dash-green" />
            <div className="mono text-[12px] font-bold text-dash-text sm:text-[13.5px]">{faNum(Math.round(m.value))}<span className="text-[9px] font-semibold text-dash-muted"> گرم</span></div>
            <div className="text-[8.5px] font-semibold text-dash-muted sm:text-[10px]">{m.label}</div>
          </div>
        ))}
      </div>
    </DashCard>
  );
}
