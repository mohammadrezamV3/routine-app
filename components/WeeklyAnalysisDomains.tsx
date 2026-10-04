"use client";

import "./weekly-analysis.css";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronLeft } from "lucide-react";
import { ANALYSIS_DOMAIN_LABELS, type DayCell, type DomainResult } from "@/lib/weeklyAnalysis/types";
import { GradientRing, RING_GREEN } from "./GradientRing";
import {
  DOMAIN_HREFS, DOMAIN_ICONS, DeltaChip, Liquid, Num, V_WK_CARD, WK_EASE, scoreGrad, toneColor, useMounted, weekdayLetter,
} from "./WeeklyAnalysisKit";

// 7 ستون ریز (شنبه سمت راست): روز آینده خط‌چین توخالی، روز گذشته‌ی بدون
// داده خط‌چین کم‌رنگ (یعنی «ثبت نشده»، نه صفر)، بقیه به نسبت امتیاز پر.
export function MiniBars({ d, days, ready, tall = false }: { d: DomainResult; days: DayCell[]; ready: boolean; tall?: boolean }) {
  return (
    <div className={`wk-minibars${tall ? " is-tall" : ""}`} aria-hidden="true">
      {d.daily.map((v, i) => {
        const day = days[i];
        const future = !!day?.isFuture;
        return (
          <div key={i} className="wk-minibar" title={day ? `${day.weekday}: ${v === null ? (future ? "هنوز نرسیده" : "بدون داده") : Math.round(v)}` : undefined}>
            <Liquid
              pct={future ? null : v}
              grad={scoreGrad(future ? null : v)}
              ready={ready}
              delay={i * 40}
              className={`${future ? "is-future" : ""}${day?.isToday ? " is-today" : ""}`}
            />
            {tall && day && <span className={`wk-minibar-letter${day.isToday ? " is-today" : ""}`}>{weekdayLetter(day.weekday)}</span>}
          </div>
        );
      })}
    </div>
  );
}

// بهترین و ضعیف‌ترین روز همین دامنه از روی daily
function bestWorst(d: DomainResult, days: DayCell[]) {
  let best = -1;
  let worst = -1;
  d.daily.forEach((v, i) => {
    if (v === null || days[i]?.isFuture) return;
    if (best < 0 || v > (d.daily[best] as number)) best = i;
    if (worst < 0 || v < (d.daily[worst] as number)) worst = i;
  });
  if (best < 0 || best === worst) return null;
  return { best, worst };
}

function DomainCard({
  d, days, expanded, onToggle, ready,
}: { d: DomainResult; days: DayCell[]; expanded: boolean; onToggle: () => void; ready: boolean }) {
  const Icon = DOMAIN_ICONS[d.domain];
  const label = ANALYSIS_DOMAIN_LABELS[d.domain];
  const bw = useMemo(() => bestWorst(d, days), [d, days]);
  const score = d.score === null ? null : Math.round(d.score);

  return (
    <motion.div
      variants={V_WK_CARD}
      className={`wk-card wk-domain${expanded ? " is-open" : ""}${d.hasData ? "" : " is-empty"}`}
    >
      <button
        type="button"
        className="wk-ghost wk-domain-head"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`${label}، جزئیات`}
      >
        <GradientRing value={(d.score ?? 0) / 100} size={58} stroke={6} grad={RING_GREEN}>
          <span className="wk-domain-score"><Num value={score} duration={0.8} /></span>
        </GradientRing>
        <span className="wk-domain-meta">
          <span className="wk-domain-name"><Icon size={15} className="wk-domain-icon" />{label}</span>
          <span className="wk-domain-sub">
            {d.hasData ? (
              <>
                <DeltaChip delta={d.delta} size="sm" />
                <span className="wk-muted-sm"><span className="wk-num">{d.daysWithData}</span> روز داده</span>
              </>
            ) : (
              <span className="wk-muted-sm">این هفته چیزی ثبت نشده</span>
            )}
          </span>
        </span>
        <ChevronDown size={16} className={`wk-domain-chev${expanded ? " is-open" : ""}`} aria-hidden="true" />
      </button>

      <MiniBars d={d} days={days} ready={ready} tall={expanded} />

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="details"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: WK_EASE }}
            className="wk-domain-details"
          >
            <div className="wk-domain-body">
              <div className="wk-compare">
                <span>این هفته <b className="wk-num">{score === null ? "—" : score}</b></span>
                <span>هفته‌ی قبل <b className="wk-num">{d.prevScore === null ? "—" : Math.round(d.prevScore)}</b></span>
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

              <Link href={DOMAIN_HREFS[d.domain]} className="wk-link-btn wk-domain-link" prefetch={false}>
                {d.hasData ? `باز کردن ${label}` : `شروع ثبت ${label}`}
                <ChevronLeft size={14} />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// کارت هر دامنه‌ی فعال — با زدن، همون‌جا باز می‌شه (ارتفاع نرم، بقیه‌ی
// کارت‌ها با layout framer جابه‌جا می‌شن). کارت‌ها همیشه سرجاشونه و با
// عوض‌شدن هفته فقط عدد/قوس/ستون‌ها از مقدار قبلی می‌کشن.
export function WeeklyAnalysisDomains({ domains, days }: { domains: DomainResult[]; days: DayCell[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const ready = useMounted();
  if (domains.length === 0) return null;
  return (
    <div className="wk-domain-grid">
        {domains.map((d) => (
          <DomainCard
            key={d.domain}
            d={d}
            days={days}
            ready={ready}
            expanded={open === d.domain}
            onToggle={() => setOpen((v) => (v === d.domain ? null : d.domain))}
          />
        ))}
    </div>
  );
}
