"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { LineChart } from "lucide-react";
import { faNum, FA_WEEKDAY_SHORT, isoLocal } from "@/lib/jalali";
import { cn } from "@/lib/utils";
import { SegmentedTabs } from "./SegmentedTabs";
import { DashCard } from "./DashCard";

type Entry = { customCalories: number; date?: string; createdAt?: string };
type ChartRange = "daily" | "weekly" | "monthly";

const MIN_DAYS = 3;

const VB_W = 320;
const VB_H = 128;
const PAD_L = 30;
const PAD_R = 6;
const PAD_T = 14;
const PAD_B = 18;
const PLOT_W = VB_W - PAD_L - PAD_R;
const PLOT_H = VB_H - PAD_T - PAD_B;

function formatKcal(n: number): string {
  return faNum(Math.round(n).toLocaleString("en-US"));
}

// نمودارِ روندِ کالری — نسخه‌ی سوم. حالا که توی چیدمانِ جدید (ردیفِ
// دوستان/روند موفقیت/نمودار) سهمِ عرضِ بیشتری داره (دو برابرِ استریک/دوستان)،
// دیگه لازم نبود بی‌نهایت جمع‌وجور بشه — یه محورِ Yِ سبک (فقط ۳ خط، نه ۵ تا)
// برگشت تا نمودار بدونِ نقطه‌ی مرجع شناور به‌نظر نرسه، ارتفاع/فونت‌ها هم بزرگ‌تر
// شدن. تا وقتی کاربر حداقل ۳ روز داده ثبت نکرده، به‌جای نموداری که با یکی‌دو
// نقطه بی‌معنیه، یه پیامِ روشن نشون می‌ده که چند روزِ دیگه مونده.
export function CalorieChartCard({
  todayEntries,
  rangeEntries,
  targetKcal,
  delay,
}: {
  todayEntries: Entry[];
  rangeEntries: Entry[];
  targetKcal: number;
  delay?: number;
}) {
  const [range, setRange] = useState<ChartRange>("daily");
  const [selected, setSelected] = useState<number | null>(null);
  const isDaily = range === "daily";

  const distinctDays = useMemo(() => {
    const set = new Set<string>();
    for (const e of rangeEntries) {
      const d = (e.date || "").slice(0, 10);
      if (d) set.add(d);
    }
    return set.size;
  }, [rangeEntries]);
  const locked = distinctDays < MIN_DAYS;

  const rawPoints = useMemo(() => {
    if (range === "daily") {
      const sorted = [...todayEntries]
        .filter((e) => e.createdAt)
        .sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
      let running = 0;
      const pts = sorted.map((e) => {
        running += e.customCalories;
        const d = new Date(e.createdAt!);
        return { value: running, hour: d.getHours() + d.getMinutes() / 60 };
      });
      const now = new Date();
      return [{ value: 0, hour: 0 }, ...pts, ...(pts.length ? [{ value: running, hour: now.getHours() + now.getMinutes() / 60 }] : [])];
    }

    const days = range === "weekly" ? 7 : 30;
    const byDate: Record<string, number> = {};
    for (const e of rangeEntries) {
      const d = (e.date || "").slice(0, 10);
      if (!d) continue;
      byDate[d] = (byDate[d] || 0) + e.customCalories;
    }
    const out: { value: number; label: string }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = isoLocal(d);
      const showLabel = range === "weekly" || i % 6 === 0;
      out.push({ value: byDate[key] || 0, label: showLabel ? (range === "weekly" ? FA_WEEKDAY_SHORT[d.getDay()] : faNum(d.getDate())) : "" });
    }
    return out;
  }, [range, todayEntries, rangeEntries]);

  const n = rawPoints.length;
  const maxVal = Math.max(targetKcal * 1.15, ...rawPoints.map((p) => p.value), 1);
  const weeklyMaxPct = Math.max(1, ...rawPoints.map((p) => (targetKcal > 0 ? Math.round((p.value / targetKcal) * 100) : 0)));

  const points = rawPoints.map((p, i) => ({
    x: isDaily
      ? PAD_L + (("hour" in p ? p.hour! : i) / 24) * PLOT_W
      : PAD_L + ((i + 0.5) / n) * PLOT_W,
    y: PAD_T + PLOT_H - (p.value / maxVal) * PLOT_H,
    value: p.value,
    label: "label" in p ? p.label : "",
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = points.length
    ? `${linePath} L${points[points.length - 1].x.toFixed(1)},${(PAD_T + PLOT_H).toFixed(1)} L${points[0].x.toFixed(1)},${(PAD_T + PLOT_H).toFixed(1)} Z`
    : "";

  const barWidth = isDaily ? 0 : Math.min(20, (PLOT_W / n) * 0.55);
  const goalY = PAD_T + PLOT_H - (targetKcal / maxVal) * PLOT_H;
  const yTicks = [0, 0.5, 1].map((f) => f * maxVal);
  const sel = selected !== null ? points[selected] : null;

  return (
    <DashCard delay={delay} className="flex h-full flex-col p-3 sm:p-4">
      <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-1.5 text-[13px] font-bold text-dash-text sm:text-[15px]">
          <LineChart className="h-4 w-4 text-dash-green sm:h-[18px] sm:w-[18px]" />
          نمودار کالری
        </h2>
        {!locked && (
          <div className="w-full shrink-0 sm:w-[184px]">
            <SegmentedTabs
              active={range}
              onChange={(v) => { setRange(v); setSelected(null); }}
              options={[
                { value: "daily" as ChartRange, label: "روزانه" },
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
      ) : range === "weekly" ? (
        // دیزاینِ این حالت عمداً همون دیزاینِ DashWeeklyChartCard (بخشِ
        // «روتین من») ه — میله‌های سادهِ گردِ افقی به‌جایِ SVGِ خط‌دار، تا
        // نمودارهای هفتگیِ اپ همه یک زبانِ بصری یکسان داشته باشن.
        <div className="mt-5 flex items-end gap-3">
          <div className="flex flex-1 items-end justify-between gap-1.5 sm:gap-2">
            {rawPoints.map((p, i) => {
              const pct = targetKcal > 0 ? Math.round((p.value / targetKcal) * 100) : 0;
              const peak = pct > 0 && pct === weeklyMaxPct;
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-1 sm:gap-1.5">
                  <span className={cn("text-[9px] font-semibold sm:text-[10px]", peak ? "text-dash-green" : "text-dash-muted")}>{faNum(pct)}٪</span>
                  <div className="flex h-24 w-full items-end justify-center sm:h-28">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(pct > 0 ? 4 : 1, Math.min(pct, 100))}%` }}
                      transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 + i * 0.05 }}
                      className="w-2 rounded-full sm:w-2.5"
                      style={{
                        background: peak ? "var(--accent)" : "rgba(var(--accent-rgb),.45)",
                        boxShadow: peak ? "0 0 12px rgba(var(--accent-rgb),.6)" : "none",
                      }}
                    />
                  </div>
                  <span className="text-[9.5px] text-dash-muted sm:text-[11.5px]">{"label" in p ? p.label : ""}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="relative mt-3 w-full flex-1" style={{ aspectRatio: `${VB_W} / ${VB_H}` }}>
          <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" className="block overflow-visible">
            <defs>
              <linearGradient id="calorie-chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="calorie-chart-bar-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.95" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.45" />
              </linearGradient>
            </defs>

            {yTicks.map((v, i) => {
              const y = PAD_T + PLOT_H - (v / maxVal) * PLOT_H;
              return (
                <g key={i}>
                  <line x1={PAD_L} y1={y} x2={VB_W - PAD_R} y2={y} stroke="var(--line)" strokeWidth="0.6" opacity="0.55" />
                  <text x={PAD_L - 5} y={y + 2.6} fontSize="7.5" fill="var(--dash-muted)" textAnchor="end">{formatKcal(v)}</text>
                </g>
              );
            })}

            {!isDaily &&
              points.map((p, i) =>
                p.label ? (
                  <text key={`l${i}`} x={p.x} y={VB_H - 3} fontSize="7.5" fill="var(--dash-muted)" textAnchor="middle">{p.label}</text>
                ) : null
              )}

            <line x1={PAD_L} y1={goalY} x2={VB_W - PAD_R} y2={goalY} stroke="var(--accent)" strokeWidth="1" strokeDasharray="3 2.5" opacity="0.6" />

            {isDaily ? (
              <>
                {points.length > 1 && (
                  <motion.path
                    d={areaPath}
                    fill="url(#calorie-chart-area-grad)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.25 }}
                  />
                )}
                {points.length > 1 && (
                  <motion.path
                    d={linePath}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                )}
                {points.map((p, i) => {
                  const isLast = i === points.length - 1;
                  return (
                    <motion.g
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.25, delay: 0.35 + i * 0.02 }}
                      onClick={() => setSelected(selected === i ? null : i)}
                      style={{ cursor: "pointer" }}
                    >
                      <circle cx={p.x} cy={p.y} r={isLast ? 5.5 : 4} fill="var(--accent)" opacity={isLast ? 0.22 : 0.14} />
                      <circle cx={p.x} cy={p.y} r={isLast || selected === i ? 2.8 : 2.1} fill="var(--bg)" stroke="var(--accent)" strokeWidth="1.4" />
                    </motion.g>
                  );
                })}
              </>
            ) : (
              points.map((p, i) => {
                const barTop = Math.min(p.y, PAD_T + PLOT_H - 1.5);
                const barH = Math.max(0, PAD_T + PLOT_H - barTop);
                const isActive = selected === i;
                return (
                  <motion.rect
                    key={i}
                    x={p.x - barWidth / 2}
                    width={barWidth}
                    rx={barWidth / 2.6}
                    fill="url(#calorie-chart-bar-grad)"
                    opacity={p.value === 0 ? 0.08 : isActive ? 1 : 0.85}
                    style={{ cursor: p.value ? "pointer" : "default" }}
                    onClick={() => p.value && setSelected(isActive ? null : i)}
                    initial={{ y: PAD_T + PLOT_H, height: 0 }}
                    animate={{ y: p.value === 0 ? PAD_T + PLOT_H - 1.5 : barTop, height: p.value === 0 ? 1.5 : barH }}
                    transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.012 }}
                  />
                );
              })
            )}
          </svg>

          <div
            className="pointer-events-none absolute flex items-center whitespace-nowrap rounded-dash border border-dash-border bg-dash-card px-1.5 py-0.5 text-[8.5px] font-bold text-dash-text sm:text-[9.5px]"
            style={{ right: `${(PAD_R / VB_W) * 100}%`, top: `${(Math.max(PAD_T - 8, goalY - 8) / VB_H) * 100}%` }}
          >
            هدف: {formatKcal(targetKcal)}
          </div>

          {sel && (
            <div
              className="mono pointer-events-none absolute z-[2] whitespace-nowrap rounded-full px-2 py-0.5 text-[9.5px] font-bold shadow-lg"
              style={{
                left: `${(sel.x / VB_W) * 100}%`,
                top: `${(sel.y / VB_H) * 100}%`,
                transform: "translate(-50%, calc(-100% - 8px))",
                background: "var(--accent)",
                color: "var(--bg)",
              }}
            >
              {formatKcal(sel.value)} کالری
            </div>
          )}
        </div>
      )}
    </DashCard>
  );
}
