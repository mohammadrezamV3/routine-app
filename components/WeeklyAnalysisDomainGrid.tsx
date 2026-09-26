"use client";

import { useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { ANALYSIS_DOMAIN_LABELS, type DayCell, type DomainResult } from "@/lib/weeklyAnalysis/types";
import { cn } from "@/lib/utils";
import { ProgressRing } from "./ProgressRing";
import { DOMAIN_ICONS, DeltaBadge, WA_CARD_CLASS, scoreFill, toneColor, weekdayLetter } from "./WeeklyAnalysisShared";

// ۷ ستونِ ریز: روزِ آینده توخالی، روزِ گذشته‌ی بدون داده خط‌چین (یعنی
// «ثبت نشده»، نه صفر)، بقیه به نسبتِ امتیاز پر.
export function WeeklyAnalysisMiniBars({ daily, days, tall = false }: { daily: (number | null)[]; days: DayCell[]; tall?: boolean }) {
  return (
    <div className={cn("wa-minibars", tall && "tall")} dir="rtl">
      {daily.map((v, i) => {
        const day = days[i];
        const future = !!day?.isFuture;
        const state = future ? "future" : v === null ? "empty" : "data";
        return (
          <div key={i} className="wa-minibar-col" title={day ? `${day.weekday}: ${v === null ? (future ? "هنوز نرسیده" : "بدون داده") : Math.round(v)}` : undefined}>
            <div className={cn("wa-minibar-track", state, day?.isToday && "today")}>
              {state === "data" && (
                <motion.div
                  className="wa-minibar-fill"
                  style={{ background: scoreFill(v as number) }}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(6, Math.min(100, v as number))}%` }}
                  transition={{ duration: 0.5, ease: "easeOut", delay: 0.05 * i }}
                />
              )}
            </div>
            {tall && day && <span className={cn("wa-minibar-letter", day.isToday && "today")}>{weekdayLetter(day.weekday)}</span>}
          </div>
        );
      })}
    </div>
  );
}

function DomainCard({
  d, days, expanded, onToggle, index,
}: { d: DomainResult; days: DayCell[]; expanded: boolean; onToggle: () => void; index: number }) {
  const Icon = DOMAIN_ICONS[d.domain];
  const label = ANALYSIS_DOMAIN_LABELS[d.domain];
  return (
    <motion.div
      layout
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onClick={onToggle}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3), layout: { duration: 0.35, ease: "easeInOut" } }}
      className={cn(WA_CARD_CLASS, "wa-domain-card", expanded && "expanded", !d.hasData && "nodata")}
    >
      <motion.div layout="position" className="wa-domain-head">
        <ProgressRing pct={(d.score ?? 0) / 100} size={50} strokeWidth={5}>
          <span className="wa-domain-ring-num mono">{d.score === null ? "—" : Math.round(d.score)}</span>
        </ProgressRing>
        <div className="wa-domain-meta">
          <div className="wa-domain-name">
            <Icon size={15} className="wa-domain-icon" />
            {label}
          </div>
          <div className="wa-domain-sub">
            {d.hasData ? <DeltaBadge delta={d.delta} /> : <span className="wa-muted-sm">این هفته چیزی ثبت نشده</span>}
            {d.hasData && <span className="wa-muted-sm"><span className="mono">{d.daysWithData}</span> روز داده</span>}
          </div>
        </div>
        <ChevronDown size={16} className={cn("wa-domain-chevron", expanded && "open")} />
      </motion.div>

      <motion.div layout="position">
        <WeeklyAnalysisMiniBars daily={d.daily} days={days} tall={expanded} />
      </motion.div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="details"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="wa-domain-details"
          >
            <div className="wa-domain-compare">
              <span>این هفته <b className="mono">{d.score === null ? "—" : Math.round(d.score)}</b></span>
              <span>هفته‌ی قبل <b className="mono">{d.prevScore === null ? "—" : Math.round(d.prevScore)}</b></span>
            </div>
            {d.stats.length > 0 ? (
              <ul className="wa-stats-list">
                {d.stats.map((s, i) => (
                  <li key={i}>
                    <span className="wa-stats-label">{s.label}</span>
                    <span className="wa-stats-value" style={s.tone && s.tone !== "neutral" ? { color: toneColor(s.tone) } : undefined}>{s.value}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="wa-muted-sm">آمار بیشتری برای این بخش نداریم.</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// کارتِ هر دامنه‌ی فعال — با زدن، کارت تمام‌عرض می‌شه و جزئیات باز می‌شه
// (انیمیشنِ layoutِ framer-motion جابه‌جاییِ بقیه‌ی کارت‌ها رو نرم می‌کنه).
export function WeeklyAnalysisDomainGrid({ domains, days }: { domains: DomainResult[]; days: DayCell[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (domains.length === 0) return null;
  return (
    <div className="wa-block">
      <div className="wa-block-title">عملکرد هر بخش</div>
      <LayoutGroup>
        <div className="wa-domain-grid">
          {domains.map((d, i) => (
            <DomainCard
              key={d.domain}
              d={d}
              days={days}
              index={i}
              expanded={open === d.domain}
              onToggle={() => setOpen((v) => (v === d.domain ? null : d.domain))}
            />
          ))}
        </div>
      </LayoutGroup>
    </div>
  );
}
