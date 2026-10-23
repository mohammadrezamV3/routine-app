"use client";

// فصل «بخش‌ها»: هر دامنه یک کارت با امتیاز بزرگ، تغییر نسبت به هفته‌ی قبل،
// اکولایزر 7 روز، بهترین/ضعیف‌ترین روز، یادداشت و آمار.
import { useMemo, useRef, useState } from "react";
import { SmartLink as Link } from "@/components/SmartLink";
import { m as motion, useInView } from "framer-motion";
import { ArrowLeft, TrendingDown, TrendingUp } from "lucide-react";
import { ANALYSIS_DOMAIN_LABELS } from "@/lib/weeklyAnalysis/types";
import type { LetterDomain } from "@/lib/weeklyLetter/types";
import { DOMAIN_HREFS, DOMAIN_ICONS, Reveal, WL_EASE, useLite } from "./WeeklyLetterShared";
import { CAL_WEEK_ORDER, weekdayName, weekdayShort } from "@/lib/jalali";
import { tr } from "@/lib/i18n";
import { domainRadarAxes, scoreIntensity } from "./WeeklyLetterUtils";
import "./wl-hero.css";
import WeeklyRadar from "./WeeklyRadar";

// شنبه تا جمعه به زبان جاری (فارسی: ش ی د س چ پ ج)
const dayLetters = () => CAL_WEEK_ORDER.map(weekdayShort);
const dayNames = () => CAL_WEEK_ORDER.map(weekdayName);

function MicroBars({ daily, best, worst }: { daily: (number | null)[]; best: string | null; worst: string | null }) {
  const lite = useLite();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -6% 0px" });
  const on = inView || lite;
  const letters = dayLetters();
  const names = dayNames();
  const cells = Array.from({ length: 7 }, (_, i) => (typeof daily[i] === "number" ? (daily[i] as number) : null));
  return (
    <div ref={ref} className="wld-eq" role="img" aria-label={tr("امتیاز هر روز هفته", "Score for each day of the week")}>
      {cells.map((v, i) => {
        const isBest = best === names[i];
        const isWorst = worst === names[i];
        return (
          <div key={i} className={`wld-eq-col${v !== null && v >= 60 ? " is-good" : ""}${isBest ? " is-best" : ""}${isWorst ? " is-worst" : ""}`}>
            <span className="wld-eq-slot">
              {v !== null && (
                <motion.i
                  initial={{ scaleY: lite ? 1 : 0 }}
                  animate={{ scaleY: on ? 1 : 0 }}
                  transition={{ duration: lite ? 0.2 : 0.7, ease: WL_EASE as never, delay: lite ? 0 : i * 0.05 }}
                  style={{ height: `${Math.max(6, Math.min(100, v))}%` }}
                />
              )}
            </span>
            <span className="wld-eq-lbl">{letters[i]}</span>
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
          <WeeklyRadar axes={axes} size={320} on={inView || lite} activeKey={active} ariaLabel={`${tr("امتیاز بخش‌ها", "Area scores")}: ${axes.map((a) => `${a.label} ${Math.round(a.value as number)}`).join(tr("، ", ", "))}`} />
          <span className="wl-dov-key" aria-hidden="true">
            <i className="is-now" />{tr("این هفته", "This week")}
            {hasPrev && (<><i className="is-prev" />{tr("هفته‌ی قبل", "Last week")}</>)}
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
    <Reveal id={`wl-dom-${d.domain}`} className={`wl-card wld${has ? "" : " is-empty"}`} delay={(i % 3) * 0.07} style={{ "--wl-k": scoreIntensity(d.score) } as React.CSSProperties}>
      <div className="wld-head">
        <span className="wld-ico"><Icon size={18} /></span>
        <h3 className="wld-name">{label}</h3>
        {has && delta !== null && delta !== 0 && (
          <span className={`wld-delta ${delta > 0 ? "is-good" : "is-bad"}`} dir="ltr">
            {delta > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {delta > 0 ? "+" : "−"}{Math.abs(Math.round(delta))}
          </span>
        )}
      </div>

      {has ? (
        <>
          <div className="wld-score" dir="ltr"><b>{Math.round(d.score as number)}</b><small>/100</small></div>
          <MicroBars daily={d.daily} best={d.bestDay} worst={d.worstDay} />
          {(d.bestDay || d.worstDay) && (
            <div className="wld-days">
              {d.bestDay && <span className="wl-mark is-good"><TrendingUp size={12} />{tr("اوج:", "Peak:")} {d.bestDay}</span>}
              {d.worstDay && d.worstDay !== d.bestDay && <span className="wl-mark is-bad"><TrendingDown size={12} />{tr("افت:", "Dip:")} {d.worstDay}</span>}
            </div>
          )}
          {d.note && <p className="wld-note">{d.note}</p>}
          {d.stats.length > 0 && (
            <dl className="wld-stats">
              {d.stats.map((s, k) => (
                <div key={k} className="wld-stat">
                  <dt>{s.label}</dt>
                  <dd className={`is-${s.tone ?? "neutral"}`}>{s.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </>
      ) : (
        <p className="wld-note">{tr(`این هفته در ${label} چیزی ثبت نشد.`, `Nothing was logged in ${label} this week.`)}</p>
      )}

      <Link href={DOMAIN_HREFS[d.domain]} className="wl-link">
        {has ? tr(`برو به ${label}`, `Go to ${label}`) : tr(`شروع ثبت ${label}`, `Start logging ${label}`)}
        <ArrowLeft size={14} className="dir-flip" />
      </Link>
    </Reveal>
  );
}

export function WeeklyLetterDomains({ domains }: { domains: LetterDomain[] }) {
  return (
    <>
      <DomainsOverview domains={domains} />
      <div className="wld-grid">
        {domains.map((d, i) => <DomainCard key={d.domain} d={d} i={i} />)}
      </div>
    </>
  );
}
