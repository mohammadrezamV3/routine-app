"use client";

// فصل «فصل‌ها»: هر دامنه یک کارت با قوس گرادیانی، یادداشت تحلیلی، آمار،
// ستون‌های کوچک 7 روز (MeterColumn) و بهترین/ضعیف‌ترین روز.
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { ArrowLeft, TrendingDown, TrendingUp } from "lucide-react";
import { ANALYSIS_DOMAIN_LABELS } from "@/lib/weeklyAnalysis/types";
import type { LetterDomain } from "@/lib/weeklyLetter/types";
import { DOMAIN_HREFS, DOMAIN_ICONS, DOM_GRAD, LazyRing, Reveal, WL_EASE, useLite } from "./WeeklyLetterShared";
import { domainRadarAxes, scoreIntensity } from "./WeeklyLetterUtils";
import { MeterColumn } from "./WeeklyMeter";
import WeeklyRadar from "./WeeklyRadar";

const DAY_LETTERS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
const DAY_NAMES = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

function MicroBars({ daily, best, worst }: { daily: (number | null)[]; best: string | null; worst: string | null }) {
  const lite = useLite();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -6% 0px" });
  const on = inView || lite;
  const cells = Array.from({ length: 7 }, (_, i) => (typeof daily[i] === "number" ? (daily[i] as number) : null));
  return (
    <div ref={ref} className="wl-bars" role="img" aria-label="امتیاز هر روز هفته">
      {cells.map((v, i) => {
        const isBest = best === DAY_NAMES[i];
        const isWorst = worst === DAY_NAMES[i];
        return (
          <div key={i} className={`wl-bar-col${isBest ? " is-best" : ""}${isWorst ? " is-worst" : ""}`}>
            <span className="wl-bar-slot">
              <MeterColumn size="sm" value={v} on={on} delay={i * 60} highlight={isBest} />
            </span>
            <span className="wl-bar-lbl">{DAY_LETTERS[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

/** مرور کلی فصل‌ها: رادار بخش‌ها (این هفته پر، هفته‌ی قبل خط‌چین) + فهرست رتبه‌بندی‌شده. رادار فقط با ≥4 دامنه، وگرنه فقط فهرست. */
function DomainsOverview({ domains }: { domains: LetterDomain[] }) {
  const lite = useLite();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -12% 0px" });
  const [active, setActive] = useState<string | null>(null);
  const axes = useMemo(() => domainRadarAxes(domains), [domains]);
  const rows = useMemo(
    () => domains.filter((d) => axes.some((a) => a.key === d.domain)).sort((a, b) => (b.score as number) - (a.score as number)),
    [domains, axes],
  );
  // با کمتر از 4 بخش رادار مثلثی و خالی می‌شه و فهرست فقط امتیاز کارت‌ها رو تکرار می‌کنه؛ پس هیچی
  const showRadar = axes.length >= 4;
  if (!showRadar) return null;
  const hasPrev = axes.some((a) => a.prev !== null);
  return (
    <Reveal className="wl-card wl-dov">
      <div ref={ref} className={`wl-dov-in${showRadar ? "" : " is-list"}`}>
        {showRadar && <div className="wl-dov-radar">
          <WeeklyRadar axes={axes} size={320} on={inView || lite} activeKey={active} ariaLabel={`امتیاز بخش‌ها: ${axes.map((a) => `${a.label} ${Math.round(a.value as number)}`).join("، ")}`} />
          <span className="wl-dov-key" aria-hidden="true">
            <i className="is-now" />این هفته
            {hasPrev && (<><i className="is-prev" />هفته‌ی قبل</>)}
          </span>
        </div>}
        <ol className="wl-dov-list" onMouseLeave={() => setActive(null)}>
          {rows.map((d, i) => {
            const Icon = DOMAIN_ICONS[d.domain];
            const delta = d.delta;
            return (
              <li key={d.domain}>
                <a
                  href={`#wl-dom-${d.domain}`}
                  className={`wl-dov-row${active === d.domain ? " is-active" : ""}`}
                  onMouseEnter={() => setActive(d.domain)}
                  onFocus={() => setActive(d.domain)}
                  onBlur={() => setActive(null)}
                >
                  <span className="wl-dov-rank" aria-hidden="true">{i + 1}</span>
                  <span className="wl-dov-ico"><Icon size={16} /></span>
                  <span className="wl-dov-name">{ANALYSIS_DOMAIN_LABELS[d.domain]}</span>
                  {delta !== null && delta !== 0 ? (
                    <span className={`wl-delta ${delta > 0 ? "is-good" : "is-bad"}`} dir="ltr">
                      {delta > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {delta > 0 ? "+" : "−"}{Math.abs(Math.round(delta))}
                    </span>
                  ) : <span />}
                  <b className="wl-dov-score">{Math.round(d.score as number)}</b>
                  <span className="wl-dov-track" aria-hidden="true"><i style={{ width: `${Math.max(3, Math.min(100, d.score as number))}%`, opacity: 0.45 + 0.55 * scoreIntensity(d.score) }} /></span>
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    </Reveal>
  );
}

function DomainCard({ d, i }: { d: LetterDomain; i: number }) {
  const Icon = DOMAIN_ICONS[d.domain];
  const label = ANALYSIS_DOMAIN_LABELS[d.domain];
  const has = d.hasData && d.score !== null;
  const delta = d.delta;
  return (
    <Reveal id={`wl-dom-${d.domain}`} className={`wl-card wl-dom${has ? "" : " is-empty"}`} delay={(i % 2) * 0.08} style={{ "--wl-k": scoreIntensity(d.score) } as React.CSSProperties}>
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
    <>
      <DomainsOverview domains={domains} />
      <div className="wl-dom-grid">
        {domains.map((d, i) => <DomainCard key={d.domain} d={d} i={i} />)}
      </div>
    </>
  );
}
