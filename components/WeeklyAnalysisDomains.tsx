"use client";

import "./weekly-analysis.css";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronLeft, Radar } from "lucide-react";
import { ANALYSIS_DOMAIN_LABELS, type DayCell, type DomainResult } from "@/lib/weeklyAnalysis/types";
import { bestWorstDay, radarAxes, rankDomains } from "@/lib/weeklyAnalysis/domainView";
import { MeterColumn } from "./WeeklyMeter";
import WeeklyRadar from "./WeeklyRadar";
import {
  DOMAIN_HREFS, DOMAIN_ICONS, DeltaChip, LineMeter, Num, SectionHead, V_WK_CARD, WK_EASE, toneColor, useSeen,
} from "./WeeklyAnalysisKit";

// یک ردیف فهرست: اسم + امتیاز + تغییر، خط امتیاز، هفت ستون ریز روزها. با زدن
// همون‌جا باز می‌شه (آمار، بهترین/ضعیف‌ترین روز، مقایسه، لینک ماژول).
function DomainRow({
  d, days, rank, expanded, ready, onToggle, onActive,
}: {
  d: DomainResult;
  days: DayCell[];
  rank: number;
  expanded: boolean;
  ready: boolean;
  onToggle: () => void;
  onActive: (on: boolean) => void;
}) {
  const panelId = useId();
  const Icon = DOMAIN_ICONS[d.domain];
  const label = ANALYSIS_DOMAIN_LABELS[d.domain];
  const has = d.hasData && d.score !== null;
  const score = d.score === null ? null : Math.round(d.score);
  const bw = useMemo(() => bestWorstDay(d.daily, days), [d.daily, days]);

  return (
    <motion.li
      layout="position"
      transition={{ duration: 0.35, ease: WK_EASE }}
      className={`wk-dv-row${expanded ? " is-open" : ""}${has ? "" : " is-empty"}`}
    >
      <button
        type="button"
        className="wk-ghost wk-dv-head"
        onClick={onToggle}
        onPointerEnter={(e) => { if (e.pointerType === "mouse") onActive(true); }}
        onPointerLeave={(e) => { if (e.pointerType === "mouse") onActive(false); }}
        onFocus={() => onActive(true)}
        onBlur={() => onActive(false)}
        aria-expanded={expanded}
        aria-controls={panelId}
        aria-label={`${label}${has ? `، امتیاز ${score}` : "، ثبت نشده"}، جزئیات`}
      >
        <span className="wk-dv-line1">
          <span className="wk-dv-name"><Icon size={16} className="wk-dv-icon" aria-hidden="true" />{label}</span>
          <span className="wk-dv-score"><Num value={has ? score : null} duration={0.8} delay={0.04 * rank} /></span>
          {has ? <DeltaChip delta={d.delta} size="sm" /> : <span className="wk-muted-sm">ثبت نشده</span>}
          <ChevronDown size={16} className={`wk-dv-chev${expanded ? " is-open" : ""}`} aria-hidden="true" />
        </span>
        <span className="wk-dv-line2" aria-hidden="true">
          <LineMeter pct={has ? d.score : null} ready={ready} delay={80 * rank} className="wk-dv-track" />
          <span className="wk-dv-cols">
            {d.daily.map((v, i) => {
              const day = days[i];
              return (
                <span key={i} className="wk-dv-col" title={day ? `${day.weekday}: ${day.isFuture ? "هنوز نرسیده" : v === null ? "بدون داده" : Math.round(v)}` : undefined}>
                  <MeterColumn size="xs" value={day?.isFuture ? null : v} future={!!day?.isFuture} on={ready} delay={80 * rank + i * 30} />
                </span>
              );
            })}
          </span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="details"
            id={panelId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: WK_EASE }}
            className="wk-dv-details"
          >
            <div className="wk-dv-body">
              {has ? (
                <>
                  <div className="wk-compare">
                    <span>این هفته <b className="wk-num">{score}</b></span>
                    <span>هفته‌ی قبل <b className="wk-num">{d.prevScore === null ? "—" : Math.round(d.prevScore)}</b></span>
                    <span><b className="wk-num">{d.daysWithData}</b> روز داده</span>
                  </div>

                  {d.stats.length > 0 && (
                    <ul className="wk-stats">
                      {d.stats.map((s, i) => (
                        <li key={i}>
                          <span className="wk-stats-label">{s.label}</span>
                          <span className="wk-stats-value wk-num" style={s.tone && s.tone !== "neutral" ? { color: toneColor(s.tone) } : undefined}>{s.value}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {bw && (
                    <div className="wk-bw">
                      <span><i className="wk-dot good" />بهترین روز: {days[bw.best].weekday} <b className="wk-num">{Math.round(d.daily[bw.best] as number)}</b></span>
                      <span><i className="wk-dot bad" />ضعیف‌ترین: {days[bw.worst].weekday} <b className="wk-num">{Math.round(d.daily[bw.worst] as number)}</b></span>
                    </div>
                  )}
                </>
              ) : (
                <div className="wk-empty-inline">این هفته چیزی ثبت نشده.</div>
              )}

              <Link href={DOMAIN_HREFS[d.domain]} className="wk-link-btn wk-dv-link" prefetch={false}>
                {has ? `باز کردن ${label}` : `شروع ثبت ${label}`}
                <ChevronLeft size={14} />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

// «نمای بخش‌ها»: رادار (هر بخش دارای داده یک محور؛ این هفته پر، هفته‌ی قبل
// خط‌چین) کنار فهرست رتبه‌بندی‌شده‌ی بخش‌ها. هاور/فوکوس یک ردیف (یا باز بودنش)
// محور و نقطه‌ی همون بخش رو روی رادار پررنگ می‌کنه. هر بار فقط یک ردیف باز
// می‌شه. با کمتر از سه بخش دارای داده، رادار نداریم و فقط فهرسته.
export function WeeklyAnalysisDomains({ domains, days }: { domains: DomainResult[]; days: DayCell[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [seenRef, ready] = useSeen<HTMLDivElement>("0px 0px -60px 0px");
  const ranked = useMemo(() => rankDomains(domains), [domains]);
  const axes = useMemo(() => radarAxes(domains, (d) => ANALYSIS_DOMAIN_LABELS[d.domain]), [domains]);
  if (domains.length === 0) return null;

  const hasRadar = axes.length > 0;
  const hasPrev = axes.some((a) => a.prev !== null);
  const anyData = ranked.some((d) => d.hasData && d.score !== null);
  const active = hover ?? open;

  return (
    <motion.section className="wk-card wk-dv" variants={V_WK_CARD} aria-label="نمای بخش‌ها">
      <SectionHead
        icon={<Radar size={15} />}
        title="نمای بخش‌ها"
        aside={hasRadar ? (
          <span className="wk-dv-legend">
            <span className="wk-legend"><i className="wk-legend-fill" />این هفته</span>
            {hasPrev && <span className="wk-legend"><i className="wk-legend-dash" />هفته‌ی قبل</span>}
          </span>
        ) : undefined}
      />

      {!anyData && <div className="wk-empty-inline">این هفته در هیچ‌کدوم از بخش‌ها چیزی ثبت نشده.</div>}

      <div ref={seenRef} className={`wk-dv-grid${hasRadar ? " has-radar" : ""}`}>
        {hasRadar && (
          <div className="wk-dv-radar">
            <WeeklyRadar
              axes={axes}
              size={400}
              on={ready}
              activeKey={active}
              ariaLabel={`رادار امتیاز بخش‌ها: ${axes.map((a) => `${a.label} ${Math.round(a.value as number)}`).join("، ")}`}
            />
          </div>
        )}
        <ul className="wk-dv-list">
          {ranked.map((d, i) => (
            <DomainRow
              key={d.domain}
              d={d}
              days={days}
              rank={i}
              ready={ready}
              expanded={open === d.domain}
              onToggle={() => setOpen((v) => (v === d.domain ? null : d.domain))}
              onActive={(on) => setHover((h) => (on ? d.domain : h === d.domain ? null : h))}
            />
          ))}
        </ul>
      </div>
    </motion.section>
  );
}
