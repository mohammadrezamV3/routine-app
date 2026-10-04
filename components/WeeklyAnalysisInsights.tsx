"use client";

import "./weekly-analysis.css";
import { motion } from "framer-motion";
import {
  AlertTriangle, CalendarDays, Flame, Lightbulb, Link2, TrendingDown, TrendingUp, Trophy, Zap, type LucideIcon,
} from "lucide-react";
import { ANALYSIS_DOMAIN_LABELS, type Insight } from "@/lib/weeklyAnalysis/types";
import { SectionHead, V_WK_CARD, toneColor } from "./WeeklyAnalysisKit";

const INSIGHT_ICONS: Record<Insight["icon"], LucideIcon> = {
  link: Link2,
  flame: Flame,
  trophy: Trophy,
  alert: AlertTriangle,
  trend_up: TrendingUp,
  trend_down: TrendingDown,
  calendar: CalendarDays,
  zap: Zap,
};

// بینش‌های قطعی موتور محاسبه (نه AI) — هرکدوم با رنگ لحن خودش. ورود پله‌ای
// با CSS (تاخیر هر ردیف از --i) تا با عوض‌شدن هفته هم دوباره نرم بیاد.
export function WeeklyAnalysisInsights({ insights }: { insights: Insight[] }) {
  return (
    <motion.section className="wk-card wk-insights" variants={V_WK_CARD} aria-label="بینش‌های این هفته">
      <SectionHead icon={<Lightbulb size={15} />} title="بینش‌های این هفته" />
      {insights.length === 0 ? (
        <div className="wk-empty-inline">هنوز الگوی قابل‌اتکایی پیدا نشده — با چند روز داده‌ی بیشتر، بینش‌ها ظاهر می‌شن.</div>
      ) : (
        <ul className="wk-insight-list">
          {insights.map((ins, i) => {
            const Icon = INSIGHT_ICONS[ins.icon] ?? Lightbulb;
            const color = toneColor(ins.tone);
            return (
              <li key={ins.id} className="wk-insight" style={{ ["--i" as string]: i }}>
                <span className="wk-insight-icon" style={{ color, borderColor: color }}><Icon size={15} /></span>
                <div className="wk-insight-text">
                  <div className="wk-insight-title">
                    {ins.title}
                    {ins.domain && <span className="wk-chip">{ANALYSIS_DOMAIN_LABELS[ins.domain]}</span>}
                  </div>
                  <div className="wk-insight-body">{ins.body}</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </motion.section>
  );
}
