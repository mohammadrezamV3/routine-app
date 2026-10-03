"use client";

// فصل «فصل‌ها»: هر دامنه یک کارت با قوس گرادیانی، یادداشت تحلیلی، آمار،
// میله‌های کوچک 7 روز و بهترین/ضعیف‌ترین روز.
import { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { ArrowLeft, TrendingDown, TrendingUp } from "lucide-react";
import { ANALYSIS_DOMAIN_LABELS } from "@/lib/weeklyAnalysis/types";
import type { LetterDomain } from "@/lib/weeklyLetter/types";
import { DOMAIN_HREFS, DOMAIN_ICONS, DOM_GRAD, LazyRing, Reveal, WL_EASE, domainClass, useLite } from "./WeeklyLetterShared";

const DAY_LETTERS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
const DAY_NAMES = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

function MicroBars({ daily, best, worst }: { daily: (number | null)[]; best: string | null; worst: string | null }) {
  const lite = useLite();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -6% 0px" });
  const cells = Array.from({ length: 7 }, (_, i) => (typeof daily[i] === "number" ? (daily[i] as number) : null));
  return (
    <div ref={ref} className="wl-bars" role="img" aria-label="امتیاز هر روز هفته">
      {cells.map((v, i) => {
        const isBest = best === DAY_NAMES[i];
        const isWorst = worst === DAY_NAMES[i];
        return (
          <div key={i} className={`wl-bar-col${isBest ? " is-best" : ""}${isWorst ? " is-worst" : ""}`}>
            <span className="wl-bar-slot">
              {v === null ? (
                <i className="wl-bar-empty" />
              ) : (
                <motion.i
                  className="wl-bar-fill"
                  style={{ transformOrigin: "bottom", height: `${Math.max(6, v)}%` }}
                  initial={{ scaleY: lite ? 1 : 0 }}
                  animate={{ scaleY: inView || lite ? 1 : 0 }}
                  transition={{ duration: lite ? 0.2 : 0.7, ease: WL_EASE as never, delay: lite ? 0 : 0.2 + i * 0.05 }}
                />
              )}
            </span>
            <span className="wl-bar-lbl">{DAY_LETTERS[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

function DomainCard({ d, i }: { d: LetterDomain; i: number }) {
  const Icon = DOMAIN_ICONS[d.domain];
  const label = ANALYSIS_DOMAIN_LABELS[d.domain];
  const has = d.hasData && d.score !== null;
  const delta = d.delta;
  return (
    <Reveal className={`wl-card wl-dom ${domainClass(d.domain)}${has ? "" : " is-empty"}`} delay={(i % 2) * 0.08}>
      <div className="wl-dom-head">
        <span className="wl-dom-ico"><Icon size={18} /></span>
        <h3 className="wl-dom-name">{label}</h3>
        {has && delta !== null && delta !== 0 && (
          <span className={`wl-delta ${delta > 0 ? "is-good" : "is-bad"}`} dir="ltr">
            {delta > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {delta > 0 ? "+" : "−"}{Math.abs(Math.round(delta))}
          </span>
        )}
      </div>

      {has ? (
        <>
          <div className="wl-dom-main">
            <LazyRing value={(d.score as number) / 100} size={96} stroke={9} grad={DOM_GRAD} delay={0.1}>
              <span className="wl-dom-score">{Math.round(d.score as number)}</span>
            </LazyRing>
            {d.stats.length > 0 && (
              <dl className="wl-stats">
                {d.stats.map((s, k) => (
                  <div key={k} className="wl-stat">
                    <dt>{s.label}</dt>
                    <dd className={`is-${s.tone ?? "neutral"}`}>{s.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
          {d.note && <p className="wl-dom-note">{d.note}</p>}
          <MicroBars daily={d.daily} best={d.bestDay} worst={d.worstDay} />
          {(d.bestDay || d.worstDay) && (
            <div className="wl-dom-days">
              {d.bestDay && <span className="wl-mark is-good"><TrendingUp size={12} />اوج: {d.bestDay}</span>}
              {d.worstDay && d.worstDay !== d.bestDay && <span className="wl-mark is-bad"><TrendingDown size={12} />افت: {d.worstDay}</span>}
            </div>
          )}
        </>
      ) : (
        <p className="wl-dom-note">این هفته در {label} چیزی ثبت نشد.</p>
      )}

      <Link href={DOMAIN_HREFS[d.domain]} className="wl-link">
        {has ? `برو به ${label}` : `شروع ثبت ${label}`}
        <ArrowLeft size={14} />
      </Link>
    </Reveal>
  );
}

export function WeeklyLetterDomains({ domains }: { domains: LetterDomain[] }) {
  return (
    <div className="wl-dom-grid">
      {domains.map((d, i) => <DomainCard key={d.domain} d={d} i={i} />)}
    </div>
  );
}
