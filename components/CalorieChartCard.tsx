"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { LineChart } from "lucide-react";
import { faNum, FA_WEEKDAY_SHORT, isoLocal } from "@/lib/jalali";
import { SegmentedTabs } from "./SegmentedTabs";
import { DashCard } from "./DashCard";

type Entry = { customCalories: number; date?: string; createdAt?: string };
type ChartRange = "daily" | "weekly" | "monthly";

// نمودارِ روندِ کالری — نسخه‌ی دوم، از صفر بازساخته‌شده تا با ابعادِ کوچیک‌ترِ
// باکسِ جدید (ستونِ فشرده‌ی سمتِ چپ، کنارِ ریزِ درشت‌مغذی‌ها و کالری هر
// وعده) جفت‌وجور باشه: ارتفاعِ کمتر، بدونِ محورِ Yِ شلوغ (فقط خطِ هدف +
// مقدارِ خودِ هدف)، میله‌ایِ ساده برای هفتگی/ماهانه، خطِ نرم برای روزانه.
const VB_W = 300;
const VB_H = 96;
const PAD_X = 4;
const PAD_T = 10;
const PAD_B = 16;
const PLOT_W = VB_W - PAD_X * 2;
const PLOT_H = VB_H - PAD_T - PAD_B;

function formatKcal(n: number): string {
  return faNum(Math.round(n).toLocaleString("en-US"));
}

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
  const maxVal = Math.max(targetKcal * 1.1, ...rawPoints.map((p) => p.value), 1);

  const points = rawPoints.map((p, i) => ({
    x: isDaily
      ? PAD_X + (("hour" in p ? p.hour! : i) / 24) * PLOT_W
      : PAD_X + ((i + 0.5) / n) * PLOT_W,
    y: PAD_T + PLOT_H - (p.value / maxVal) * PLOT_H,
    value: p.value,
    label: "label" in p ? p.label : "",
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = points.length
    ? `${linePath} L${points[points.length - 1].x.toFixed(1)},${(PAD_T + PLOT_H).toFixed(1)} L${points[0].x.toFixed(1)},${(PAD_T + PLOT_H).toFixed(1)} Z`
    : "";

  const barWidth = isDaily ? 0 : Math.min(16, (PLOT_W / n) * 0.55);
  const goalY = PAD_T + PLOT_H - (targetKcal / maxVal) * PLOT_H;
  const sel = selected !== null ? points[selected] : null;

  return (
    <DashCard delay={delay} className="p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex shrink-0 items-center gap-1.5 text-[13px] font-bold text-dash-text sm:text-[15px]">
          <LineChart className="h-4 w-4 text-dash-green sm:h-[18px] sm:w-[18px]" />
          نمودار کالری
        </h2>
        <div className="w-[150px] shrink-0 sm:w-[172px]">
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
      </div>

      <div className="relative mt-3 w-full" style={{ aspectRatio: `${VB_W} / ${VB_H}` }}>
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

          <line x1={PAD_X} y1={goalY} x2={VB_W - PAD_X} y2={goalY} stroke="var(--accent)" strokeWidth="1" strokeDasharray="3 2.5" opacity="0.55" />

          {!isDaily &&
            points.map((p, i) =>
              p.label ? (
                <text key={`l${i}`} x={p.x} y={VB_H - 3} fontSize="7" fill="var(--dash-muted)" textAnchor="middle">{p.label}</text>
              ) : null
            )}

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
                  strokeWidth="1.8"
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
                    <circle cx={p.x} cy={p.y} r={isLast ? 5 : 3.6} fill="var(--accent)" opacity={isLast ? 0.22 : 0.14} />
                    <circle cx={p.x} cy={p.y} r={isLast || selected === i ? 2.4 : 1.8} fill="var(--bg)" stroke="var(--accent)" strokeWidth="1.2" />
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
          style={{ right: `${(PAD_X / VB_W) * 100}%`, top: `${(Math.max(PAD_T - 8, goalY - 8) / VB_H) * 100}%` }}
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
    </DashCard>
  );
}
