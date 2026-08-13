"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { faNum, FA_WEEKDAY_SHORT, isoLocal } from "@/lib/jalali";
import { SegmentedTabs } from "./SegmentedTabs";
import { DashCard } from "./DashCard";

type Entry = { customCalories: number; date?: string; createdAt?: string };
type ChartRange = "daily" | "weekly" | "monthly";
type Point = { x: number; y: number; value: number; label: string };

const VB_W = 320;
const VB_H = 160;
const PAD_L = 34;
const PAD_R = 6;
const PAD_T = 14;
const PAD_B = 20;
const PLOT_W = VB_W - PAD_L - PAD_R;
const PLOT_H = VB_H - PAD_T - PAD_B;

// محورِ Y همیشه ۵ فاصله‌ی «گرد» داره (دقیقاً مثلِ رفرنس: ۰/۵۰۰/۱۰۰۰/۱۵۰۰/۲۰۰۰/۲۵۰۰) —
// نه فاصله‌های درصدی؛ گامِ گرد بر اساسِ بزرگیِ عدد انتخاب می‌شه.
function niceStep(rawMax: number): number {
  const roughStep = Math.max(rawMax, 1) / 5;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const residual = roughStep / magnitude;
  const niceResidual = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10;
  return niceResidual * magnitude;
}

function formatKcal(n: number): string {
  return faNum(Math.round(n).toLocaleString("en-US"));
}

const HOUR_TICKS = [0, 4, 8, 12, 16, 20, 24];

// نمودارِ روندِ کالری — دقیقاً هم‌طرحِ عکسِ رفرنس: تایتل+تب‌ها توی یه ردیف،
// محورِ افقیِ روزانه با تیک‌های ثابتِ هر ۴ ساعت (۰۰:۰۰ تا ۲۴:۰۰) و نقطه‌ها
// بر اساسِ ساعتِ واقعیِ ثبت روی همون محور جا می‌گیرن (نه به‌ترتیبِ ایندکس)،
// خطِ هدفِ سبزِ نقطه‌چین با لیبلِ داخلِ نمودار بالا-راست، نقطه‌های سفیدِ
// درخشان با هاله‌ی سبز و تولتیپِ قرصی‌شکلِ سبز.
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
      const now = new Date();
      const nowHour = now.getHours() + now.getMinutes() / 60;
      return [{ value: 0, label: "۰۰:۰۰", hour: 0 }, ...pts, ...(pts.length ? [{ value: running, label: "اکنون", hour: nowHour }] : [])];
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

  const step = niceStep(Math.max(targetKcal * 1.15, ...rawPoints.map((p) => p.value), 100));
  const maxY = step * 5;

  const points: Point[] = rawPoints.map((p, i) => ({
    x:
      range === "daily"
        ? PAD_L + (("hour" in p ? p.hour! : i) / 24) * PLOT_W
        : PAD_L + (rawPoints.length > 1 ? (i / (rawPoints.length - 1)) * PLOT_W : PLOT_W / 2),
    y: PAD_T + PLOT_H - (p.value / maxY) * PLOT_H,
    value: p.value,
    label: p.label,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  const goalY = PAD_T + PLOT_H - (targetKcal / maxY) * PLOT_H;
  const yLabels = [0, 1, 2, 3, 4, 5].map((m) => m * step);
  const xTicks = range === "daily" ? HOUR_TICKS.map((h) => ({ x: PAD_L + (h / 24) * PLOT_W, label: `${faNum(String(h).padStart(2, "0"))}:۰۰` })) : null;
  const sel = selected !== null ? points[selected] : null;

  return (
    <DashCard delay={delay}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="shrink-0 text-[15px] font-bold text-dash-text sm:text-[19px]">نمودار کالری</h2>
        {/* .auth-tabs بدونِ عرضِ صریح، وقتی کنارِ تایتل توی یه ردیفِ flex
            می‌شینه (نه توی ردیفِ تمام‌عرضِ خودش)، بچه‌های flex:1/min-width:0
            داخلش به حداقل جمع می‌شن و کل کنترل جمع‌وجور/رویِ‌هم می‌افته؛
            یه عرضِ ثابتِ معقول (هم‌قدِ exercise-mode-tabs) این‌و می‌گیره. */}
        <div className="w-[184px] shrink-0 sm:w-[212px]">
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

      <div className="relative mt-4 w-full" style={{ aspectRatio: `${VB_W} / ${VB_H}` }}>
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" className="block overflow-visible">
          {yLabels.map((v, i) => {
            const y = PAD_T + PLOT_H - (v / maxY) * PLOT_H;
            return (
              <g key={i}>
                <line x1={PAD_L} y1={y} x2={VB_W - PAD_R} y2={y} stroke="var(--line)" strokeWidth="0.5" opacity="0.35" />
                <text x={PAD_L - 5} y={y + 2.6} fontSize="7" fill="var(--dash-muted)" textAnchor="end">{formatKcal(v)}</text>
              </g>
            );
          })}

          {xTicks
            ? xTicks.map((t, i) => (
                <text key={i} x={t.x} y={VB_H - 3} fontSize="7" fill="var(--dash-muted)" textAnchor="middle">{t.label}</text>
              ))
            : points.map((p, i) =>
                p.label ? (
                  <text key={`l${i}`} x={p.x} y={VB_H - 3} fontSize="7" fill="var(--dash-muted)" textAnchor="middle">{p.label}</text>
                ) : null
              )}

          <line x1={PAD_L} y1={goalY} x2={VB_W - PAD_R} y2={goalY} stroke="var(--accent)" strokeWidth="1" strokeDasharray="3.5 3" opacity="0.85" />

          {points.length > 1 && (
            <motion.path
              d={linePath}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: "drop-shadow(0 0 5px rgba(var(--accent-rgb),.85)) drop-shadow(0 0 1px rgba(var(--accent-rgb),1))" }}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            />
          )}

          {points.map((p, i) => {
            const isLast = i === points.length - 1;
            return (
              <motion.g
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.4 + i * 0.02 }}
                onClick={() => setSelected(selected === i ? null : i)}
                style={{ cursor: "pointer" }}
              >
                <circle cx={p.x} cy={p.y} r={isLast ? 7 : 5} fill="var(--accent)" opacity={isLast ? 0.32 : 0.2} />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isLast || selected === i ? 3.1 : 2.3}
                  fill={p.value > targetKcal ? "#E05252" : "#fff"}
                  stroke="var(--accent)"
                  strokeWidth="1.3"
                  style={{ filter: "drop-shadow(0 0 3px rgba(var(--accent-rgb),.9))" }}
                />
              </motion.g>
            );
          })}
        </svg>

        {/* لیبلِ هدف به‌جای <text>ِ SVG (که با مقادیرِ راست‌به‌چپِ ترکیبی مثلِ
            «هدف: ۲۷۲۰ کالری» توی مرورگرها گاهی text-anchor="end" رو غلط
            حساب می‌کنه و از لبه‌ی نمودار بیرون می‌زنه) یه overlayِ معمولیِ
            HTML ـه — دقیقاً مثلِ تولتیپِ زیرش، که RTL رو درست هندل می‌کنه. */}
        <div
          className="pointer-events-none absolute whitespace-nowrap text-[9.5px] font-bold text-dash-text sm:text-[11px]"
          style={{
            right: `${(PAD_R / VB_W) * 100}%`,
            top: `${(Math.max(PAD_T - 2, goalY - 9) / VB_H) * 100}%`,
          }}
        >
          هدف: {formatKcal(targetKcal)} کالری
        </div>

        {sel && (
          <div
            className="mono pointer-events-none absolute z-[2] whitespace-nowrap rounded-full px-2.5 py-1 text-[10.5px] font-bold shadow-lg"
            style={{
              left: `${(sel.x / VB_W) * 100}%`,
              top: `${(sel.y / VB_H) * 100}%`,
              transform: "translate(-50%, calc(-100% - 10px))",
              background: "var(--accent)",
              color: "var(--dash-bg, var(--bg))",
            }}
          >
            {formatKcal(sel.value)} کالری
          </div>
        )}
      </div>
    </DashCard>
  );
}
