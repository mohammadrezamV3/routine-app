"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { LineChart } from "lucide-react";
import { faNum, FA_WEEKDAY_SHORT, isoLocal } from "@/lib/jalali";
import { cn } from "@/lib/utils";
import { SegmentedTabs } from "./SegmentedTabs";
import { DashCard } from "./DashCard";

type Entry = { customCalories: number; date?: string; createdAt?: string };
type ChartRange = "weekly" | "monthly";

const MIN_DAYS = 3;

function formatKcal(n: number): string {
  return faNum(Math.round(n).toLocaleString("en-US"));
}

// نمودارِ روندِ کالری.
//
// حالتِ «روزانه» (نمودارِ خطیِ SVG از روی ساعتِ ثبتِ هر وعده) طبقِ درخواستِ
// صریحِ کاربر حذف شد؛ فقط هفتگی و ماهانه موند. هر دو حالا **یک** دیزاین
// دارن — همون میله‌های گردِ عمودیِ نمودارِ هفتگیِ «روتین من» — نه یکی
// میله‌ای و یکی SVGِ خط‌دار با رنگ‌بندیِ متفاوت. هر میله کلیک‌پذیره و با
// انتخاب، هم رنگش کاملاً عوض می‌شه (پررنگ + هاله) هم عددِ کالریِ همون روز
// بالای نمودار نشون داده می‌شه.
export function CalorieChartCard({
  rangeEntries,
  targetKcal,
  delay,
}: {
  rangeEntries: Entry[];
  targetKcal: number;
  delay?: number;
}) {
  const [range, setRange] = useState<ChartRange>("weekly");
  const [selected, setSelected] = useState<number | null>(null);
  const isMonthly = range === "monthly";

  const distinctDays = useMemo(() => {
    const set = new Set<string>();
    for (const e of rangeEntries) {
      const d = (e.date || "").slice(0, 10);
      if (d) set.add(d);
    }
    return set.size;
  }, [rangeEntries]);
  const locked = distinctDays < MIN_DAYS;

  const bars = useMemo(() => {
    const days = isMonthly ? 30 : 7;
    const byDate: Record<string, number> = {};
    for (const e of rangeEntries) {
      const d = (e.date || "").slice(0, 10);
      if (!d) continue;
      byDate[d] = (byDate[d] || 0) + e.customCalories;
    }
    const out: { value: number; label: string; key: string }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = isoLocal(d);
      // ماهانه ۳۰ برچسب کنارِ هم جا نمی‌شه — هر پنج روز یکی
      const showLabel = !isMonthly || i % 5 === 0;
      out.push({
        key,
        value: byDate[key] || 0,
        label: showLabel ? (isMonthly ? faNum(d.getDate()) : FA_WEEKDAY_SHORT[d.getDay()]) : "",
      });
    }
    return out;
  }, [isMonthly, rangeEntries]);

  const maxPct = Math.max(1, ...bars.map((b) => (targetKcal > 0 ? Math.round((b.value / targetKcal) * 100) : 0)));
  const sel = selected !== null ? bars[selected] : null;

  return (
    <DashCard delay={delay} className="flex h-full flex-col p-3 sm:p-4">
      {/* دکمه‌ی سوییچ هم‌ردیفِ تایتل و چپ‌چین (توی RTL یعنی انتهای ردیف) —
          دیگه روی موبایل هم به خطِ بعد نمی‌ره. */}
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h2 className="flex shrink-0 items-center gap-1.5 text-[13px] font-bold text-dash-text sm:text-[15px]">
          <LineChart className="h-4 w-4 text-dash-green sm:h-[18px] sm:w-[18px]" />
          نمودار کالری
        </h2>
        {!locked && (
          <div className="w-[140px] shrink-0 sm:w-[168px]">
            <SegmentedTabs
              active={range}
              onChange={(v) => { setRange(v); setSelected(null); }}
              options={[
                { value: "weekly" as ChartRange, label: "هفتگی" },
                { value: "monthly" as ChartRange, label: "ماهانه" },
              ]}
            />
          </div>
        )}
      </div>

      {locked ? (
        <div className="mt-3 flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-8 text-center" style={{ borderColor: "var(--line)" }}>
          <LineChart className="h-6 w-6 text-dash-muted" />
          <div className="text-[12px] font-bold text-dash-text sm:text-[13px]">نمودار هنوز آماده نیست</div>
          <div className="max-w-[260px] text-[10.5px] leading-relaxed text-dash-muted sm:text-[11.5px]">
            برای نمایشِ نمودار حداقل به ۳ روز داده نیاز داری — {faNum(MIN_DAYS - distinctDays)} روزِ دیگه مونده.
          </div>
        </div>
      ) : (
        <>
          {/* عددِ روزِ انتخاب‌شده — جای ثابتی بالای نمودار داره تا با
              انتخاب/لغوِ انتخاب، ارتفاعِ کارت نپره. */}
          <div className="mt-3 flex h-6 shrink-0 items-center justify-end">
            {sel && (
              <span
                className="mono rounded-full px-2.5 py-1 text-[10.5px] font-extrabold sm:text-[11.5px]"
                style={{ background: "var(--accent)", color: "var(--bg)" }}
              >
                {formatKcal(sel.value)} کالری
              </span>
            )}
          </div>

          <div className={cn("mt-1 flex items-end", isMonthly ? "gap-0.5 sm:gap-1" : "gap-1.5 sm:gap-2")}>
            {bars.map((b, i) => {
              const pct = targetKcal > 0 ? Math.round((b.value / targetKcal) * 100) : 0;
              const isActive = selected === i;
              const peak = !isActive && pct > 0 && pct === maxPct;
              return (
                <button
                  type="button"
                  key={b.key}
                  onClick={() => setSelected(isActive ? null : i)}
                  aria-label={`${b.label || b.key} — ${formatKcal(b.value)} کالری`}
                  className="flex min-w-0 flex-1 flex-col items-center gap-1 bg-transparent p-0 sm:gap-1.5"
                >
                  {/* درصد فقط توی هفتگی جا می‌شه؛ ماهانه ۳۰ ستون داره */}
                  {!isMonthly && (
                    <span className={cn("text-[9px] font-semibold sm:text-[10px]", isActive || peak ? "text-dash-green" : "text-dash-muted")}>
                      {faNum(pct)}٪
                    </span>
                  )}
                  <div className="flex h-24 w-full items-end justify-center sm:h-28">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(pct > 0 ? 4 : 1, Math.min(pct, 100))}%` }}
                      transition={{ duration: 0.5, ease: "easeOut", delay: Math.min(0.1 + i * 0.02, 0.5) }}
                      className={cn("rounded-full", isMonthly ? "w-1.5 sm:w-2" : "w-2 sm:w-2.5")}
                      style={{
                        // رنگِ انتخاب‌شده عمداً خیلی متفاوته (توپر + هاله‌ی
                        // پررنگ) تا کاربر بی‌شک بفهمه کدوم میله رو زده.
                        background: isActive ? "var(--accent)" : peak ? "var(--accent)" : "rgba(var(--accent-rgb),.45)",
                        boxShadow: isActive
                          ? "0 0 0 2px rgba(var(--accent-rgb),.35), 0 0 16px rgba(var(--accent-rgb),.85)"
                          : peak
                          ? "0 0 12px rgba(var(--accent-rgb),.6)"
                          : "none",
                      }}
                    />
                  </div>
                  {/* برچسبِ زیرِ میله سفید (رنگِ متنِ اصلی) و توی ماهانه
                      بزرگ‌تر — قبلاً خاکستریِ کم‌رنگ و ریز بود و دیده نمی‌شد. */}
                  <span
                    className={cn(
                      "whitespace-nowrap font-semibold",
                      isMonthly ? "text-[9.5px] sm:text-[11px]" : "text-[10px] sm:text-[11.5px]",
                      isActive ? "text-dash-green" : "text-dash-text"
                    )}
                  >
                    {b.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 shrink-0 text-[10px] text-dash-muted sm:text-[11px]">
            هر ستون درصدِ کالریِ اون روز نسبت به هدفِ {formatKcal(targetKcal)} کالریه — برای دیدنِ عدد، روی ستون بزن.
          </div>
        </>
      )}
    </DashCard>
  );
}
