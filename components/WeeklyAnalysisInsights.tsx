"use client";

import "./weekly-analysis.css";
import "./wa-cards.css";
import { useRef, useState } from "react";
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

// بینش‌های قطعی موتور محاسبه (نه AI) — بخش باز (بدون باکس بیرونی). هر بینش یک
// کارت کوچک با خط رنگ لحن در لبه‌ی ابتدایی. موبایل: ردیف اسکرول افقی با نشانگر
// نقطه‌ای، دسکتاپ: دو ستون. ورود پله‌ای با CSS (تاخیر از --i).
export function WeeklyAnalysisInsights({ insights }: { insights: Insight[] }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);

  function onScroll() {
    const el = trackRef.current;
    if (!el || el.children.length < 2) return;
    const first = el.children[0] as HTMLElement;
    const step = (el.children[1] as HTMLElement).offsetLeft - first.offsetLeft;
    if (!step) return;
    const idx = Math.round(Math.abs(el.scrollLeft) / Math.abs(step));
    setActive(Math.max(0, Math.min(el.children.length - 1, idx)));
  }

  return (
    <motion.section className="wc-ins" variants={V_WK_CARD} aria-label="بینش‌های این هفته">
      <SectionHead icon={<Lightbulb size={15} />} title="بینش‌های این هفته" />
      {insights.length === 0 ? (
        <div className="wk-empty-inline">هنوز الگوی قابل‌اتکایی پیدا نشده — با چند روز داده‌ی بیشتر، بینش‌ها ظاهر می‌شن.</div>
      ) : (
        <>
          <ul className={`wc-ins-track${insights.length === 1 ? " is-one" : ""}`} ref={trackRef} onScroll={onScroll} data-noswipe>
            {insights.map((ins, i) => {
              const Icon = INSIGHT_ICONS[ins.icon] ?? Lightbulb;
              const color = toneColor(ins.tone);
              return (
                <li key={ins.id} className="wc-ins-card wk-card" style={{ ["--i" as string]: i, ["--wc-tone" as string]: color }}>
                  <span className="wc-ins-ic"><Icon size={15} /></span>
                  <div>
                    <div className="wc-ins-title">
                      {ins.title}
                      {ins.domain && <span className="wk-chip">{ANALYSIS_DOMAIN_LABELS[ins.domain]}</span>}
                    </div>
                    <div className="wc-ins-body">{ins.body}</div>
                  </div>
                </li>
              );
            })}
          </ul>
          {insights.length > 1 && (
            <div className="wc-dots" aria-hidden="true">
              {insights.map((ins, i) => <i key={ins.id} className={i === active ? "on" : ""} />)}
            </div>
          )}
        </>
      )}
    </motion.section>
  );
}
