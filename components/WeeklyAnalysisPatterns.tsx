"use client";

import "./weekly-analysis.css";
import "./wa-viz.css";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, Grid3x3, Hash, Layers, TrendingUp } from "lucide-react";
import type { WeeklyAnalysis } from "@/lib/weeklyAnalysis/types";
import { SectionHead, WK_EASE } from "./WeeklyAnalysisKit";
import { WeeklyAnalysisRhythm } from "./WeeklyAnalysisRhythm";
import { WeeklyAnalysisHeatmap } from "./WeeklyAnalysisHeatmap";
import { WeeklyAnalysisTrend } from "./WeeklyAnalysisTrend";
import { WeeklyAnalysisNumbers } from "./WeeklyAnalysisNumbers";

type PanelKey = "rhythm" | "heatmap" | "trend" | "numbers";

const PANEL_META: Record<PanelKey, { label: string; icon: React.ReactNode }> = {
  rhythm: { label: "ریتم", icon: <Activity /> },
  heatmap: { label: "نقشه", icon: <Grid3x3 /> },
  trend: { label: "روند", icon: <TrendingUp /> },
  numbers: { label: "اعداد", icon: <Hash /> },
};

// الگوهای هفته: یک کارت و یک گروه باکس آیکونی (عین SleepStatsPanels) که بین
// ریتم، نقشه‌ی حرارتی، روند و اعداد عوض می‌کنه. پیش‌فرض: ریتم.
export function WeeklyAnalysisPatterns({
  analysis, selectedDay, onPickDay, onJump,
}: {
  analysis: WeeklyAnalysis;
  selectedDay: number | null;
  onPickDay: (i: number) => void;
  onJump: (offset: number) => void;
}) {
  const [active, setActive] = useState<PanelKey>("rhythm");
  const order: PanelKey[] = ["rhythm", "heatmap", "trend", ...(analysis.numbers.length ? (["numbers"] as PanelKey[]) : [])];
  const cur: PanelKey = order.includes(active) ? active : "rhythm";

  return (
    <motion.section
      className="wk-card wkv-patterns"
      aria-label="الگوهای هفته"
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -40px 0px" }}
      transition={{ duration: 0.5, ease: WK_EASE }}
    >
      <SectionHead icon={<Layers size={15} />} title="الگوهای هفته" />

      <div className="flex items-end justify-center gap-2.5 sm:gap-3.5" role="tablist" aria-label="الگوهای هفته" data-noswipe>
        {order.map((key) => {
          const on = key === cur;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={on}
              aria-label={PANEL_META[key].label}
              title={PANEL_META[key].label}
              onClick={() => setActive(key)}
              className={`dash-quick-tile rounded-dash border bg-dash-card backdrop-blur-xl${on ? " is-on" : ""}`}
            >
              <span className="dash-quick-tile-icon">{PANEL_META[key].icon}</span>
              <span className="dash-quick-tile-label" aria-hidden={!on}>{PANEL_META[key].label}</span>
            </button>
          );
        })}
      </div>

      <div className="wkv-patterns-body">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={cur}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {cur === "rhythm" && (
              <WeeklyAnalysisRhythm days={analysis.days} prevDays={analysis.prevDays} selected={selectedDay} onPick={onPickDay} />
            )}
            {cur === "heatmap" && <WeeklyAnalysisHeatmap domains={analysis.domains} days={analysis.days} onPickDay={onPickDay} />}
            {cur === "trend" && <WeeklyAnalysisTrend trend={analysis.trend} offset={analysis.offset} onJump={onJump} />}
            {cur === "numbers" && <WeeklyAnalysisNumbers numbers={analysis.numbers} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
