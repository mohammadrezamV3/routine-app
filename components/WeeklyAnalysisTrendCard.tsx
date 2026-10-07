"use client";

import "./weekly-analysis.css";
import "./wa-bottom.css";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ANALYSIS_DOMAIN_LABELS, ANALYSIS_DOMAINS, type WeeklyAnalysis } from "@/lib/weeklyAnalysis/types";
import { SegmentedTabs } from "./SegmentedTabs";
import { V_WK_CARD } from "./WeeklyAnalysisKit";
import { WeeklyAnalysisTrend, type Series } from "./WeeklyAnalysisTrend";

// کارت «روند 8 هفته»: فیلتر بخش، نمودار مساحتی با خط چین میانگین، راهنما.
export function WeeklyAnalysisTrendCard({ analysis, onJump }: { analysis: WeeklyAnalysis; onJump: (offset: number) => void }) {
  const [series, setSeries] = useState<Series>("overall");
  const trend = analysis.trend;
  const available = useMemo(
    () => ANALYSIS_DOMAINS.filter((d) => trend.some((t) => typeof t.domains?.[d] === "number")),
    [trend]
  );
  const active: Series = series !== "overall" && !available.includes(series) ? "overall" : series;

  return (
    <motion.section id="trend" className="wk-card wb-card wb-trend" variants={V_WK_CARD} aria-label="روند 8 هفته">
      <header className="wb-head">
        <h2 className="wb-title">روند 8 هفته</h2>
        {available.length > 0 && (
          <div className="wk-tabs-scroll wb-tabs" data-noswipe>
            <SegmentedTabs<Series>
              className="wk-seg"
              ariaLabel="نمایش روند"
              active={active}
              onChange={setSeries}
              options={[{ value: "overall", label: "کل" }, ...available.map((d) => ({ value: d as Series, label: ANALYSIS_DOMAIN_LABELS[d] }))]}
            />
          </div>
        )}
      </header>
      <WeeklyAnalysisTrend trend={trend} offset={analysis.offset} onJump={onJump} series={active} onSeriesChange={setSeries} hideTabs showAvg />
      <div className="wb-legend">
        <span><i className="wb-lg-line" />امتیاز تو</span>
        <span><i className="wb-lg-dash" />میانگین 8 هفته</span>
      </div>
    </motion.section>
  );
}
