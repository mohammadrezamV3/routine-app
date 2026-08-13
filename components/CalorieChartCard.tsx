"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { LineChart } from "lucide-react";
import { faNum, FA_WEEKDAY_SHORT, isoLocal } from "@/lib/jalali";
import { SegmentedTabs } from "./SegmentedTabs";
import { DashCard } from "./DashCard";

type Entry = { customCalories: number; date?: string; createdAt?: string };
type ChartRange = "daily" | "weekly" | "monthly";
type Point = { x: number; y: number; value: number; label: string };

const VB_W = 320;
const VB_H = 160;
const PAD_L = 30;
const PAD_R = 8;
const PAD_T = 12;
const PAD_B = 22;
const PLOT_W = VB_W - PAD_L - PAD_R;
const PLOT_H = VB_H - PAD_T - PAD_B;

function niceCeil(n: number): number {
  if (n <= 500) return 500;
  const step = n <= 2000 ? 250 : n <= 6000 ? 500 : 1000;
  return Math.ceil(n / step) * step;
}

// نمودارِ روندِ کالری — روزانه (تجمعیِ امروز بر اساسِ ساعتِ ثبت)، هفتگی و
// ماهانه (جمعِ هر روز، آخرین N روز). بدونِ کتابخانه‌ی چارت — یه SVGِ
// دست‌ساز با همون قراردادِ خطِ صاف/گرادیانِ زیرِ خط که بقیه‌ی اپ برای
// نمودار میله‌ای هفتگی استفاده می‌کنه، فقط این‌جا خطیه. viewBox با
// preserveAspectRatio="xMidYMid meet" رندر می‌شه (نه "none") تا با تغییرِ
// عرضِ کانتینر (موبایل/دسکتاپ) نسبتِ ابعادش خراب نشه.
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

  const rawPoints = useMemo(() => {
    if (range === "daily") {
      const sorted = [...todayEntries]
        .filter((e) => e.createdAt)
        .sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
      let running = 0;
      const pts = sorted.map((e) => {
        running += e.customCalories;
        const d = new Date(e.createdAt!);
        const hour = d.getHours() + d.getMinutes() / 60;
        return { value: running, label: `${faNum(d.getHours())}:${faNum(String(d.getMinutes()).padStart(2, "0"))}`, hour };
      });
      return [{ value: 0, label: "۰۰:۰۰", hour: 0 }, ...pts, ...(pts.length ? [{ value: running, label: "اکنون", hour: 24 }] : [])];
    }

    const days = range === "weekly" ? 7 : 30;
    const byDate: Record<string, number> = {};
    for (const e of rangeEntries) {
      const d = (e.date || "").slice(0, 10);
      if (!d) continue;
      byDate[d] = (byDate[d] || 0) + e.customCalories;
    }
    const out: { value: number; label: string; hour?: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = isoLocal(d);
      const value = byDate[key] || 0;
      const showLabel = range === "weekly" || i % 6 === 0;
      out.push({ value, label: showLabel ? (range === "weekly" ? FA_WEEKDAY_SHORT[d.getDay()] : faNum(d.getDate())) : "" });
    }
    return out;
  }, [range, todayEntries, rangeEntries]);

  const maxVal = Math.max(targetKcal * 1.15, ...rawPoints.map((p) => p.value), 100);
  const maxY = niceCeil(maxVal);

  const points: Point[] = rawPoints.map((p, i) => ({
    x: PAD_L + (rawPoints.length > 1 ? (i / (rawPoints.length - 1)) * PLOT_W : PLOT_W / 2),
    y: PAD_T + PLOT_H - (p.value / maxY) * PLOT_H,
    value: p.value,
    label: p.label,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = points.length
    ? `${linePath} L${points[points.length - 1].x.toFixed(1)},${(PAD_T + PLOT_H).toFixed(1)} L${points[0].x.toFixed(1)},${(PAD_T + PLOT_H).toFixed(1)} Z`
    : "";

  const goalY = PAD_T + PLOT_H - (targetKcal / maxY) * PLOT_H;
  const gridLines = [0, 0.25, 0.5, 0.75, 1];
  const sel = selected !== null ? points[selected] : null;

  return (
    <DashCard delay={delay}>
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-[13px] font-bold text-dash-text sm:text-[15px]">
          <LineChart className="h-4 w-4 text-dash-green sm:h-[18px] sm:w-[18px]" />
          نمودار کالری
        </h2>
      </div>

      <div className="mt-3">
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

      <div className="mono mt-2.5 text-[10.5px] font-bold sm:text-[11.5px]" style={{ color: "#F5A623" }}>
        هدف: {faNum(targetKcal)} کالری
      </div>

      <div className="relative mt-1.5 w-full" style={{ aspectRatio: `${VB_W} / ${VB_H}` }}>
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" className="block">
          <defs>
            <linearGradient id="calorie-chart-area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {gridLines.map((g) => {
            const y = PAD_T + PLOT_H - g * PLOT_H;
            return (
              <g key={g}>
                <line x1={PAD_L} y1={y} x2={VB_W - PAD_R} y2={y} stroke="var(--line)" strokeWidth="0.5" opacity="0.5" />
                <text x={PAD_L - 4} y={y + 3} fontSize="7" fill="var(--muted2)" textAnchor="end">{faNum(Math.round(maxY * g))}</text>
              </g>
            );
          })}

          <line x1={PAD_L} y1={goalY} x2={VB_W - PAD_R} y2={goalY} stroke="#F5A623" strokeWidth="1" strokeDasharray="4 3" />

          {points.length > 1 && (
            <motion.path
              d={areaPath}
              fill="url(#calorie-chart-area-grad)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
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
              style={{ filter: "drop-shadow(0 0 3px rgba(var(--accent-rgb),.6))" }}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            />
          )}

          {points.map((p, i) => (
            <motion.circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={selected === i ? 3.5 : 2.2}
              fill={p.value > targetKcal ? "#E05252" : "var(--accent)"}
              stroke="var(--bg)"
              strokeWidth="1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.4 + i * 0.02 }}
              onClick={() => setSelected(selected === i ? null : i)}
              style={{ cursor: "pointer" }}
            />
          ))}

          {points.map((p, i) =>
            p.label ? (
              <text key={`l${i}`} x={p.x} y={VB_H - 4} fontSize="7" fill="var(--muted2)" textAnchor="middle">{p.label}</text>
            ) : null
          )}
        </svg>

        {sel && (
          <div
            className="mono pointer-events-none absolute z-[2] whitespace-nowrap rounded-lg border px-2 py-1 text-[11px] font-bold shadow-lg"
            style={{
              left: `${(sel.x / VB_W) * 100}%`,
              top: `${(sel.y / VB_H) * 100}%`,
              transform: "translate(-50%, calc(-100% - 8px))",
              background: "var(--dash-bg, var(--bg))",
              borderColor: "var(--accent)",
              color: "var(--accent)",
            }}
          >
            {faNum(Math.round(sel.value))} کالری
          </div>
        )}
      </div>
    </DashCard>
  );
}
