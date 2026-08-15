"use client";

import { UtensilsCrossed } from "lucide-react";
import { faNum } from "@/lib/jalali";
import { DashCard } from "./DashCard";
import { ProgressRing } from "./ProgressRing";
import type { Target } from "./CaloriePanel";

type Entry = { customCalories: number; mealType: string | null };

// «کالری هر وعده» — از کارتِ «کالری امروز» جدا شده و کارتِ بزرگ‌ترِ خودش رو
// داره، چون تعدادِ وعده‌ها متغیره (۲ تا ۶ تا) و توی یه باکسِ کوچیک جا نمی‌شد.
// ویرایشِ وعده‌ها دیگه اینجا نیست — از پاپ‌آپِ «تغییر برنامه» (حالتِ دستی)
// انجام می‌شه، این کارت فقط نمایشیه.
export function CalorieMealBreakdownCard({
  target,
  entries,
  delay,
}: {
  target: Target;
  entries: Entry[];
  delay?: number;
}) {
  if (!target.mealBreakdown?.length) return null;

  return (
    <DashCard delay={delay} className="p-3 sm:p-4">
      <h2 className="flex items-center gap-1.5 text-[13px] font-bold text-dash-text sm:text-[15px]">
        <UtensilsCrossed className="h-4 w-4 text-dash-green sm:h-[18px] sm:w-[18px]" />
        کالری هر وعده
      </h2>

      <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5">
        {target.mealBreakdown.map((m) => {
          const consumed = entries.filter((e) => e.mealType === m.key).reduce((s, e) => s + e.customCalories, 0);
          const mealPct = m.kcal > 0 ? consumed / m.kcal : 0;
          const over = mealPct > 1;
          return (
            <div key={m.key} className="flex flex-col items-center gap-1.5 rounded-2xl border border-dash-border bg-white/[0.02] px-2 py-2.5 text-center">
              <span className="shrink-0 sm:hidden">
                <ProgressRing pct={mealPct} size={38} strokeWidth={4} color={over ? "#E05252" : "var(--accent)"}>
                  <span className="mono text-[8.5px] font-extrabold" style={{ color: "var(--text)" }}>{faNum(Math.round(mealPct * 100))}٪</span>
                </ProgressRing>
              </span>
              <span className="hidden shrink-0 sm:inline-flex">
                <ProgressRing pct={mealPct} size={44} strokeWidth={4.5} color={over ? "#E05252" : "var(--accent)"}>
                  <span className="mono text-[9.5px] font-extrabold" style={{ color: "var(--text)" }}>{faNum(Math.round(mealPct * 100))}٪</span>
                </ProgressRing>
              </span>
              <div className="text-[9px] font-semibold text-dash-muted sm:text-[10.5px]">{m.label}</div>
              <div className="mono text-[10px] font-bold text-dash-text sm:text-[12px]">
                {faNum(consumed)}<span className="text-[9px] font-semibold text-dash-muted sm:text-[10.5px]"> / {faNum(m.kcal)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </DashCard>
  );
}
