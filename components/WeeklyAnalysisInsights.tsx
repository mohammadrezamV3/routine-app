"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle, CalendarDays, Flame, Lightbulb, Link2, TrendingDown, TrendingUp, Trophy, Zap, type LucideIcon,
} from "lucide-react";
import { ANALYSIS_DOMAIN_LABELS, type Insight } from "@/lib/weeklyAnalysis/types";
import { DashCard } from "./DashCard";
import { toneColor } from "./WeeklyAnalysisShared";

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

// بینش‌های قطعیِ موتورِ محاسبه (نه AI) — هرکدوم با رنگِ لحنِ خودش
export function WeeklyAnalysisInsights({ insights }: { insights: Insight[] }) {
  return (
    <DashCard className="wa-insights-card">
      <div className="wa-card-head">
        <h2 className="wa-card-title"><Lightbulb size={16} className="wa-title-icon" />بینش‌های این هفته</h2>
      </div>
      {insights.length === 0 ? (
        <div className="wa-empty-inline">هنوز الگوی قابل‌اتکایی پیدا نشده — با چند روز داده‌ی بیشتر، بینش‌ها ظاهر می‌شن.</div>
      ) : (
        <ul className="wa-insight-list">
          {insights.map((ins, i) => {
            const Icon = INSIGHT_ICONS[ins.icon] ?? Lightbulb;
            const color = toneColor(ins.tone);
            return (
              <motion.li
                key={ins.id}
                className="wa-insight"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.06, 0.36) }}
              >
                <span className="wa-insight-icon" style={{ color, borderColor: color }}>
                  <Icon size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="wa-insight-title">
                    {ins.title}
                    {ins.domain && <span className="wa-tag">{ANALYSIS_DOMAIN_LABELS[ins.domain]}</span>}
                  </div>
                  <div className="wa-insight-body">{ins.body}</div>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </DashCard>
  );
}
