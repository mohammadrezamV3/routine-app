"use client";

import { Beef, Droplet, Sparkles, Wheat } from "lucide-react";
import { faNum } from "@/lib/jalali";
import { DashCard } from "./DashCard";

type Entry = { proteinG?: number | null; carbsG?: number | null; fatG?: number | null; aiScanned?: boolean };

// «جزئیات برنامه‌غذایی» — طبق طرح کاربر، سه باکس جداگانه‌ی پروتئین/کربوهیدرات/
// چربی توی یک باکس واحد ادغام شدن. این بخش فقط وقتی عدد نشون می‌ده که
// حداقل یک غذای این روز درشت‌مغذی ثبت‌شده داشته باشه — چه با اسکن AI، چه
// با واردکردن دستی توی فرم افزودن غذا؛ چون کاتالوگ دستی درشت‌مغذی برای
// هزاران غذا نداریم و این تنها دو راه داشتن عدد واقعی‌ان.
export function CalorieMacrosCard({
  entries,
  target,
  delay,
}: {
  entries: Entry[];
  target?: { proteinTargetG?: number | null; carbsTargetG?: number | null; fatTargetG?: number | null };
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
        درشت مغذی‌ها
      </h2>

      {/* اگه کاربر توی «وارد کردن دستی» هدف درشت‌مغذی گذاشته باشه، هر باکس
          علاوه‌بر مصرف، هدف و یه نوار پیشرفت کوچیک هم نشون می‌ده. */}
      <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-2.5">
        {[
          { icon: Beef, label: "پروتئین", value: totals.protein, goal: target?.proteinTargetG ?? null },
          { icon: Wheat, label: "کربوهیدرات", value: totals.carbs, goal: target?.carbsTargetG ?? null },
          { icon: Droplet, label: "چربی", value: totals.fat, goal: target?.fatTargetG ?? null },
        ].map((m) => {
          const pct = m.goal && m.goal > 0 ? Math.min(100, Math.round((m.value / m.goal) * 100)) : null;
          const over = !!m.goal && m.goal > 0 && m.value > m.goal;
          return (
            <div key={m.label} className="flex flex-col items-center gap-1 rounded-2xl border border-dash-border bg-white/[0.02] px-2 py-2.5 text-center">
              <m.icon className="h-3.5 w-3.5 text-dash-green" />
              <div className="mono text-[12px] font-bold text-dash-text sm:text-[13.5px]">
                {faNum(Math.round(m.value))}
                {m.goal ? <span className="text-[9px] font-semibold text-dash-muted">/{faNum(m.goal)}</span> : null}
                <span className="text-[9px] font-semibold text-dash-muted"> گرم</span>
              </div>
              {pct !== null && (
                <div className="h-[3px] w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,.08)" }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: over ? "#E05252" : "var(--accent)" }} />
                </div>
              )}
              <div className="text-[8.5px] font-semibold text-dash-muted sm:text-[10px]">{m.label}</div>
            </div>
          );
        })}
      </div>
    </DashCard>
  );
}
