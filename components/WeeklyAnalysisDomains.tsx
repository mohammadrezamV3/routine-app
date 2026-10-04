"use client";

import "./weekly-analysis.css";
import "./wa-viz.css";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronLeft, LayoutGrid } from "lucide-react";
import { ANALYSIS_DOMAIN_LABELS, type DayCell, type DomainResult } from "@/lib/weeklyAnalysis/types";
import { bestWorstDay, rankDomains } from "@/lib/weeklyAnalysis/domainView";
import { GradientRing } from "./GradientRing";
import {
  DOMAIN_HREFS, DOMAIN_ICONS, DeltaChip, Num, SectionHead, WK_EASE, domainGrad, scoreGrad, toneColor, useCalmMotion,
} from "./WeeklyAnalysisKit";

// هفت میله‌ی ریز روزها. شنبه سمت راست (محور x معکوس)، میله‌ها پله‌پله از پایین
// بالا می‌آن. روز آینده / بدون داده فقط یک خط کم‌رنگ.
function Spark({ daily, days, big, delay }: { daily: (number | null)[]; days: DayCell[]; big: boolean; delay: number }) {
  const calm = useCalmMotion();
  const W = big ? 140 : 84;
  const H = big ? 44 : 28;
  const gap = big ? 8 : 5;
  const bw = (W - gap * 6) / 7;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="wkv-spark" width="100%" height={H} preserveAspectRatio="none" aria-hidden="true">
      {daily.slice(0, 7).map((v, i) => {
        const day = days[i];
        const empty = v === null || !!day?.isFuture;
        const h = empty ? 2 : Math.max(3, (H * Math.min(100, Math.max(0, v as number))) / 100);
        const x = (6 - i) * (bw + gap);
        return (
          <motion.rect
            key={i}
            x={x}
            width={bw}
            rx={Math.min(3, bw / 2)}
            fill={empty ? "var(--box-line)" : "var(--ring-1a)"}
            fillOpacity={empty ? 1 : 0.35 + 0.65 * ((v as number) / 100)}
            initial={calm ? { y: H - h, height: h } : { y: H - 2, height: 2 }}
            whileInView={{ y: H - h, height: h }}
            viewport={{ once: true, margin: "0px 0px -20px 0px" }}
            transition={{ duration: 0.6, delay: calm ? 0 : delay + i * 0.05, ease: WK_EASE }}
          />
        );
      })}
    </svg>
  );
}

function DomainTile({
  d, days, rank, big,
}: { d: DomainResult; days: DayCell[]; rank: number; big: boolean }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const Icon = DOMAIN_ICONS[d.domain];
  const label = ANALYSIS_DOMAIN_LABELS[d.domain];
  const score = Math.round(d.score as number);
  const bw = useMemo(() => bestWorstDay(d.daily, days), [d.daily, days]);
  const ringSize = big ? 112 : 68;
  const delay = 0.05 * rank;

  return (
    <motion.article
      layout
      transition={{ duration: 0.4, ease: WK_EASE }}
      className={`wk-card wkv-tile${big ? " is-big" : ""}${open ? " is-open" : ""}`}
    >
      <button
        type="button"
        className="wk-ghost wkv-tile-head"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${label}، امتیاز ${score}، جزئیات`}
      >
        <span className="wkv-tile-top">
          <span className="wkv-tile-name"><Icon size={big ? 18 : 15} className="wk-dv-icon" aria-hidden="true" />{label}</span>
          <ChevronDown size={15} className={`wk-dv-chev${open ? " is-open" : ""}`} aria-hidden="true" />
        </span>
        <span className="wkv-tile-mid">
          <GradientRing value={score / 100} size={ringSize} stroke={big ? 9 : 6} grad={d.score === null ? domainGrad(d.domain) : scoreGrad(d.score)} delay={delay}>
            <span className={`wkv-ring-num${big ? " is-big" : ""}`}><Num value={score} duration={0.9} delay={delay} /></span>
          </GradientRing>
          <span className="wkv-tile-side">
            <DeltaChip delta={d.delta} size={big ? "md" : "sm"} />
            {big && <span className="wk-muted-sm">نسبت به هفته‌ی قبل</span>}
          </span>
        </span>
        <Spark daily={d.daily} days={days} big={big} delay={delay + 0.2} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="details"
            id={panelId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: WK_EASE }}
            className="wk-dv-details wkv-tile-details"
          >
            <div className="wk-dv-body">
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

              <Link href={DOMAIN_HREFS[d.domain]} className="wk-link-btn wk-dv-link" prefetch={false}>
                {`باز کردن ${label}`}
                <ChevronLeft size={14} />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function EmptyChip({ d }: { d: DomainResult }) {
  const Icon = DOMAIN_ICONS[d.domain];
  const label = ANALYSIS_DOMAIN_LABELS[d.domain];
  return (
    <motion.div layout transition={{ duration: 0.4, ease: WK_EASE }} className="wkv-chip-cell">
      <Link href={DOMAIN_HREFS[d.domain]} prefetch={false} className="wkv-chip" aria-label={`شروع ثبت ${label}`}>
        <Icon size={15} aria-hidden="true" />
        <span className="wkv-chip-name">{label}</span>
        <span className="wk-muted-sm">ثبت نشده</span>
        <ChevronLeft size={13} aria-hidden="true" />
      </Link>
    </motion.div>
  );
}

// «نمای بخش‌ها»: شبکه‌ی بنتو. بهترین بخش کاشی بزرگ (2×2 روی دسکتاپ)، بقیه
// کوچک؛ بخش بدون داده فقط یک چیپ باریک با لینک ثبت. زدن کاشی همون‌جا باز
// می‌شه (آمار، مقایسه، بهترین/ضعیف‌ترین روز، لینک ماژول) و کل ردیف رو می‌گیره.
export function WeeklyAnalysisDomains({ domains, days }: { domains: DomainResult[]; days: DayCell[] }) {
  const ranked = useMemo(() => rankDomains(domains), [domains]);
  if (domains.length === 0) return null;

  const withData = ranked.filter((d) => d.hasData && d.score !== null);
  const noData = ranked.filter((d) => !(d.hasData && d.score !== null));
  const bigKey = withData.length >= 2 ? [...withData].sort((a, b) => (b.score as number) - (a.score as number))[0].domain : null;

  return (
    <motion.section
      className="wkv-domains"
      aria-label="نمای بخش‌ها"
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -40px 0px" }}
      transition={{ duration: 0.5, ease: WK_EASE }}
    >
      <SectionHead icon={<LayoutGrid size={15} />} title="نمای بخش‌ها" />
      {withData.length === 0 && <div className="wk-empty-inline">این هفته در هیچ‌کدوم از بخش‌ها چیزی ثبت نشده.</div>}
      <div className="wkv-bento">
        {withData.map((d, i) => (
          <DomainTile key={d.domain} d={d} days={days} rank={i} big={d.domain === bigKey} />
        ))}
        {noData.map((d) => (
          <EmptyChip key={d.domain} d={d} />
        ))}
      </div>
    </motion.section>
  );
}
