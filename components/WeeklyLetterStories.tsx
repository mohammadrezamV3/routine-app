"use client";

// «داستان هفته»: نمایش تمام‌صفحه‌ی هفته‌نامه به سبک استوری/Wrapped. اسلایدها از
// buildStorySlides می‌آن (اسلاید بی‌داده ساخته نمی‌شه). نوار بالا با انیمیشن CSS
// روی transform پر می‌شه و pause/resume اون رایگانه (animation-play-state).
// جهت راست‌به‌چپ: لمس نیمه‌ی چپ یا سوایپ از چپ به راست = بعدی، نیمه‌ی راست = قبلی.
// حرکت‌های دائمی (نور پس‌زمینه، مدار) روی کاهش حرکت و html[data-perf="low"] خاموشن،
// و با کاهش حرکت پخش خودکار هم نداریم (اسلاید فقط با دست عوض می‌شه).
import "./weekly-letter.css";
import { useCallback, useContext, createContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import {
  Activity, ChevronLeft, ChevronRight, Compass, Crown, Flame, Gauge, Lightbulb, Medal, Pause, PenLine, Play, Quote, RotateCcw, Sparkles, Target, TrendingDown, TrendingUp, X, Zap, type LucideIcon,
} from "lucide-react";
import { ANALYSIS_DOMAIN_LABELS } from "@/lib/weeklyAnalysis/types";
import type { WeeklyLetterData } from "@/lib/weeklyLetter/types";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { GradientRing, RING_GREEN } from "./GradientRing";
import { DOMAIN_ICONS, GradeStamp, WL_EASE, useLite, useOnAfter } from "./WeeklyLetterShared";
import { MeterColumn } from "./WeeklyMeter";
import WeeklyRadar from "./WeeklyRadar";
import { MaskText, Odo } from "./WeeklyLetterStoryFx";
import { INSIGHT_ICONS, MOODS, MOOD_LABELS } from "./WeeklyLetterStory";
import { ARCH_ICONS, BrandMark } from "./WeeklyLetterCover";
import { goalCtaHref, weekCtaHref, type StorySlide } from "./WeeklyLetterStoriesData";
import { jalaliDayMonth, letterYear, scoreIntensity, smoothPath } from "./WeeklyLetterUtils";

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';
const HOLD_MS = 220;

// ---- مقیاس: همه‌ی اندازه‌ها با --u نسبت به یک گوشی 390×780 تنظیم می‌شن ----
const UCtx = createContext(1);
const useU = () => useContext(UCtx);

function frameSize(): { w: number; h: number } {
  if (typeof window === "undefined") return { w: 390, h: 780 };
  const iw = window.innerWidth;
  const ih = window.innerHeight;
  if (iw >= 560) return { w: Math.min(440, iw), h: Math.min(ih - 40, 820) };
  return { w: iw, h: ih };
}
const unitOf = (w: number, h: number) => Math.max(0.68, Math.min(1.12, Math.min(w / 390, h / 800)));

/**
 * هر اسلاید باید توی ارتفاع واقعی دیده‌شده جا بشه (سافاری آیفون با نوار ابزار،
 * safe-area، گوشی کوتاه). مقیاس پایه (--u) فقط از عرض/ارتفاع قاب میاد، ولی
 * محتوای هر اسلاید یه مقدار ثابت px هم داره؛ پس بعد از چیدمان، ارتفاع طبیعی
 * محتوا رو اندازه می‌گیریم و اگه از جای موجود بلندتر بود، مقیاس رو کم می‌کنیم
 * (چند دور تا جا بشه). همه‌ی بچه‌های بدنه flex-shrink:0ن تا هیچ کارتی روی
 * متن کناریش فشرده/کشیده نشه.
 */
function bodyNeed(body: HTMLElement): number {
  const cs = getComputedStyle(body);
  const gap = parseFloat(cs.rowGap) || 0;
  let sum = 0, cnt = 0;
  for (const el of Array.from(body.children) as HTMLElement[]) {
    const c = getComputedStyle(el);
    if (c.display === "none" || c.position === "absolute") continue;
    sum += el.offsetHeight + (parseFloat(c.marginTop) || 0) + (parseFloat(c.marginBottom) || 0);
    cnt++;
  }
  return sum + gap * Math.max(0, cnt - 1);
}

function FitScale({ u, boxKey, children }: { u: number; boxKey: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);
  const [tick, setTick] = useState(0);
  const pass = useRef(0);
  const lastKey = useRef(boxKey);

  // فونت دیر برسه ارتفاع‌ها عوض می‌شه: از اول اندازه می‌گیریم
  useEffect(() => {
    let live = true;
    try { document.fonts?.ready.then(() => { if (live) { pass.current = 0; setFit(1); setTick((t) => t + 1); } }); } catch { /* */ }
    return () => { live = false; };
  }, []);

  useLayoutEffect(() => {
    if (lastKey.current !== boxKey) {
      lastKey.current = boxKey;
      pass.current = 0;
      if (fit !== 1) { setFit(1); return; }
    }
    const body = ref.current?.firstElementChild as HTMLElement | null;
    if (!body || pass.current >= 6) return;
    const avail = body.clientHeight;
    const need = bodyNeed(body);
    if (avail > 0 && need > avail + 1) {
      pass.current += 1;
      setFit(Math.max(0.45, fit * Math.min(0.97, (avail / need) * 0.985)));
    }
  }, [boxKey, fit, tick]);

  const uu = u * fit;
  return (
    <div ref={ref} className="wl-st-fit" style={{ "--u": uu } as CSSProperties}>
      <UCtx.Provider value={uu}>{children}</UCtx.Provider>
    </div>
  );
}

// ---- ورودی‌های حرکتی ----
const SLIDE: Variants = {
  enter: (d: number) => ({ opacity: 0, x: -d * 44 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.42, ease: WL_EASE as never, staggerChildren: 0.085, delayChildren: 0.1 } },
  exit: (d: number) => ({ opacity: 0, x: d * 44, transition: { duration: 0.26, ease: [0.4, 0, 1, 1] as never } }),
};
const ITEM: Variants = {
  enter: { opacity: 0, y: 26 },
  center: { opacity: 1, y: 0, transition: { duration: 0.6, ease: WL_EASE as never } },
};
const POP: Variants = {
  enter: { opacity: 0, scale: 0.82 },
  center: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 240, damping: 20 } },
};

function SItem({ children, className, variants = ITEM, style, decor }: { children: ReactNode; className?: string; variants?: Variants; style?: CSSProperties; decor?: boolean }) {
  return <motion.div className={className} variants={variants} style={style} aria-hidden={decor || undefined}>{children}</motion.div>;
}

function Kicker({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="wl-st-kicker">
      <span className="wl-st-kicker-ico"><Icon size={15} /></span>
      {children}
    </span>
  );
}

// ---- اسلایدها ----
function IntroSlide({ letter }: { letter: WeeklyLetterData }) {
  return (
    <div className="wl-st-body">
      <SItem className="wl-st-eyebrow">شماره</SItem>
      <SItem variants={POP} className="wl-st-big">
        {letter.issueNo ? <Odo value={String(letter.issueNo)} className="wl-st-sheen" delay={0.45} duration={1.5} /> : "—"}
      </SItem>
      <div className="wl-st-weeklabel">
        <small>هفته‌ی</small>
        <b><MaskText text={letter.weekLabel} className="wl-st-sheen" delay={0.55} /></b>
        <span>{letterYear(letter.weekEnd)}</span>
      </div>
      <SItem className="wl-st-greet">
        <b>{letter.greetingName ? `سلام ${letter.greetingName}` : "سلام"}</b>
        <span>بیا هفته‌ات رو با هم مرور کنیم</span>
      </SItem>
      <SItem className="wl-st-hint"><ChevronLeft size={16} />برای ادامه بزن</SItem>
    </div>
  );
}

function ScoreSlide({ s, headline }: { s: Extract<StorySlide, { id: "score" }>; headline: string }) {
  const U = useU();
  const up = (s.delta ?? 0) > 0;
  const down = (s.delta ?? 0) < 0;
  return (
    <div className="wl-st-body">
      <SItem><Kicker icon={Gauge}>امتیاز این هفته</Kicker></SItem>
      <SItem variants={POP} className="wl-st-ringwrap">
        <GradientRing value={s.score / 100} size={Math.round(236 * U)} stroke={Math.round(17 * U)} grad={RING_GREEN} delay={0.5}>
          <span className="wl-st-ringc">
            <Odo value={String(Math.round(s.score))} className="wl-st-huge wl-st-grad" delay={0.55} duration={1.5} />
            <small>از 100</small>
          </span>
        </GradientRing>
        {s.grade && <GradeStamp grade={s.grade} size={Math.round(84 * U)} delay={1.15} className="wl-st-stamp" />}
      </SItem>
      <SItem className="wl-chips">
        {s.delta !== null && (
          <span className={`wl-chip ${up ? "is-good" : down ? "is-bad" : ""}`}>
            {up ? <TrendingUp size={14} /> : down ? <TrendingDown size={14} /> : null}
            <b dir="ltr">{up ? "+" : down ? "−" : ""}{Math.abs(Math.round(s.delta))}</b>
            نسبت به هفته‌ی قبل
          </span>
        )}
        {s.rank && s.rank.position === 1 && (
          <span className="wl-chip is-gold"><Crown size={14} />بهترین هفته از {s.rank.of} هفته‌ی اخیر</span>
        )}
      </SItem>
      {headline && <p className="wl-st-cap"><MaskText text={headline} delay={1.0} stagger={0.045} /></p>}
    </div>
  );
}

function ArchetypeSlide({ s }: { s: Extract<StorySlide, { id: "archetype" }> }) {
  const U = useU();
  const Icon = ARCH_ICONS[s.archetype.key] ?? Sparkles;
  return (
    <div className="wl-st-body">
      <SItem><Kicker icon={Sparkles}>تیپ هفته‌ی تو</Kicker></SItem>
      <SItem variants={POP} className="wl-st-orbit" style={{ width: Math.round(176 * U), height: Math.round(176 * U) }}>
        <i className="wl-st-orbit-a" />
        <i className="wl-st-orbit-b" />
        <span className="wl-st-orbit-ico"><Icon size={Math.round(58 * U)} strokeWidth={1.6} /></span>
      </SItem>
      <h2 className="wl-st-title"><MaskText text={s.archetype.title} className="wl-st-sheen" delay={0.45} stagger={0.1} /></h2>
      {s.archetype.description && <SItem className="wl-st-cap is-lg">{s.archetype.description}</SItem>}
    </div>
  );
}

function RhythmSlide({ s }: { s: Extract<StorySlide, { id: "rhythm" }> }) {
  const on = useOnAfter(350);
  return (
    <div className="wl-st-body">
      <SItem><Kicker icon={Activity}>ریتم هفته</Kicker></SItem>
      <SItem className="wl-st-range">
        <span>از</span>
        <Odo value={String(s.min)} className="wl-st-mid wl-st-sheen" delay={0.5} duration={1.1} />
        <span>تا</span>
        <Odo value={String(s.max)} className="wl-st-mid wl-st-sheen" delay={0.6} duration={1.3} />
      </SItem>
      <div className="wl-st-rbars" role="img" aria-label={`امتیاز روزهای هفته: ${s.bars.map((b) => `${b.weekday} ${b.score === null ? "بدون امتیاز" : Math.round(b.score)}`).join("، ")}`}>
        {s.bars.map((b, i) => (
          <span
            key={i}
            className={`wl-st-rbar${b.best ? " is-best" : ""}${b.score === null ? " is-empty" : ""}`}
            style={{ "--i": i } as CSSProperties}
          >
            <b>{b.best && <Crown size={16} />}{b.score === null ? "" : Math.round(b.score)}</b>
            <span className="wl-st-rcol"><MeterColumn size="lg" value={b.score} on={on} delay={i * 130} highlight={b.best} /></span>
            <em>{b.label}</em>
          </span>
        ))}
      </div>
      <SItem className="wl-st-cap">
        اوج هفته‌ات <b>{s.bestDay}</b> بود و کمترین امتیاز <b>{s.worstDay}</b>؛ میانگین <b dir="ltr">{s.avg}</b>
      </SItem>
    </div>
  );
}

function BestSlide({ s }: { s: Extract<StorySlide, { id: "best" }> }) {
  return (
    <div className="wl-st-body">
      <SItem><Kicker icon={Crown}>بهترین روز هفته</Kicker></SItem>
      <div className="wl-st-dayname">
        <b><MaskText text={s.day.weekday} className="wl-st-sheen" delay={0.35} stagger={0.1} /></b>
        <span>{s.day.date ? jalaliDayMonth(s.day.date) : ""}</span>
      </div>
      <SItem variants={POP} className="wl-st-dayscore">
        <Odo value={String(Math.round(s.day.score ?? 0))} className="wl-st-huge wl-st-sheen" delay={0.5} duration={1.3} />
        <small>امتیاز</small>
      </SItem>
      <SItem className="wl-st-meter" decor>
        <i style={{ "--r": Math.min(1, Math.max(0.04, (s.day.score ?? 0) / 100)) } as CSSProperties} />
      </SItem>
      {s.rows.length > 0 && (
        <SItem className="wl-st-rows">
          {s.rows.map((r) => {
            const Icon = DOMAIN_ICONS[r.domain];
            return (
              <div key={r.domain} className="wl-st-row">
                <span className="wl-st-row-ico"><Icon size={15} /></span>
                <span className="wl-st-row-txt">
                  <b className={`is-${r.tone ?? "neutral"}`}>{r.text}</b>
                  {r.sub && <small>{r.sub}</small>}
                </span>
              </div>
            );
          })}
        </SItem>
      )}
    </div>
  );
}

function DomainsSlide({ s }: { s: Extract<StorySlide, { id: "domains" }> }) {
  const U = useU();
  const on = useOnAfter(450);
  const Icon = DOMAIN_ICONS[s.top.domain];
  const RIcon = s.riser ? DOMAIN_ICONS[s.riser.domain] : null;
  const same = s.riser?.domain === s.top.domain;
  const radar = s.radar.length >= 3;
  return (
    <div className="wl-st-body">
      <SItem><Kicker icon={Medal}>قوی‌ترین بخش هفته</Kicker></SItem>
      {radar ? (
        <SItem variants={POP} className="wl-st-radar">
          <WeeklyRadar axes={s.radar} size={Math.round(316 * U)} on={on} activeKey={s.top.domain} ariaLabel={`امتیاز بخش‌ها: ${s.radar.map((a) => `${a.label} ${Math.round(a.value as number)}`).join("، ")}`} />
          <span className="wl-st-radar-key" aria-hidden="true"><i className="is-now" />این هفته<i className="is-prev" />هفته‌ی قبل</span>
        </SItem>
      ) : (
        <SItem variants={POP} className="wl-st-ringwrap">
          <GradientRing value={s.top.score / 100} size={Math.round(188 * U)} stroke={Math.round(15 * U)} grad={RING_GREEN} delay={0.5}>
            <span className="wl-st-ringc is-icon">
              <Icon size={Math.round(26 * U)} />
              <Odo value={String(Math.round(s.top.score))} className="wl-st-mid wl-st-sheen" delay={0.55} duration={1.3} />
            </span>
          </GradientRing>
        </SItem>
      )}
      <h2 className="wl-st-title"><MaskText text={ANALYSIS_DOMAIN_LABELS[s.top.domain]} className="wl-st-sheen" delay={0.45} stagger={0.1} /></h2>
      {radar && (
        <SItem className="wl-st-topscore">
          <Icon size={Math.round(22 * U)} />
          <Odo value={String(Math.round(s.top.score))} className="wl-st-mid wl-st-sheen" delay={0.6} duration={1.2} />
          <small>از 100</small>
        </SItem>
      )}
      {s.top.note && <SItem className="wl-st-cap">{s.top.note}</SItem>}
      {s.riser && RIcon && (
        <SItem className="wl-st-riser">
          <span className="wl-st-riser-ico"><RIcon size={17} /></span>
          <span className="wl-st-riser-txt">
            <small>{same ? "و بیشترین پیشرفت هم همینه" : "بیشترین پیشرفت"}</small>
            {!same && <b>{ANALYSIS_DOMAIN_LABELS[s.riser.domain]}</b>}
          </span>
          <span className="wl-st-riser-d" dir="ltr"><TrendingUp size={14} />+{s.riser.delta}</span>
        </SItem>
      )}
    </div>
  );
}

function NumbersSlide({ s }: { s: Extract<StorySlide, { id: "numbers" }> }) {
  return (
    <div className="wl-st-body">
      <SItem><Kicker icon={Gauge}>هفته در اعداد</Kicker></SItem>
      <div className={`wl-st-grid${s.items.length % 2 ? " is-odd" : ""}`}>
        {s.items.map((n, i) => {
          const Icon = n.domain ? DOMAIN_ICONS[n.domain] : Sparkles;
          return (
            <SItem key={n.key} variants={POP} className="wl-st-tile">
              <span className="wl-st-tile-ico"><Icon size={15} /></span>
              <span className="wl-st-tile-val">
                <Odo value={n.value} className="wl-st-stat wl-st-sheen" delay={0.6 + i * 0.1} duration={1.2} />
                {n.unit && <small>{n.unit}</small>}
              </span>
              <span className="wl-st-tile-lbl">{n.label}</span>
              {n.hint && <span className={`wl-st-tile-hint is-${n.tone ?? "neutral"}`}>{n.hint}</span>}
            </SItem>
          );
        })}
      </div>
    </div>
  );
}

// ---- مسیر هفته‌ها: خط از قدیمی‌ترین (راست) تا همین هفته (چپ) کشیده می‌شه ----
const TW = 340, TH = 190, TPX = 16, TPT = 30, TPB = 14;
function TrendSlide({ s }: { s: Extract<StorySlide, { id: "trend" }> }) {
  const lite = useLite();
  const uid = useId().replace(/:/g, "");
  const n = s.points.length;
  const model = useMemo(() => {
    const vals = s.points.filter((v): v is number => v !== null);
    let lo = Math.max(0, Math.min(...vals) - 8);
    let hi = Math.min(100, Math.max(...vals) + 8);
    if (hi - lo < 28) { lo = Math.max(0, lo - (28 - (hi - lo)) / 2); hi = Math.min(100, lo + 28); }
    const xAt = (i: number) => TW - TPX - (i * (TW - 2 * TPX)) / (n - 1);
    const yAt = (v: number) => TPT + (1 - (v - lo) / (hi - lo)) * (TH - TPT - TPB);
    const pts = s.points.map((v, i) => ({ x: xAt(i), y: v === null ? null : yAt(v), v }));
    const segs: { x: number; y: number }[][] = [];
    let cur: { x: number; y: number }[] = [];
    for (const p of pts) {
      if (p.y === null) { if (cur.length) segs.push(cur); cur = []; } else cur.push({ x: p.x, y: p.y });
    }
    if (cur.length) segs.push(cur);
    return { pts, segs };
  }, [s.points, n]);
  const last = model.pts[n - 1];
  const bottom = TH - TPB;
  const drawDur = lite ? 0.01 : 1.8;
  const t0 = 0.6;
  return (
    <div className="wl-st-body">
      <SItem><Kicker icon={Activity}>{`مسیر ${n} هفته`}</Kicker></SItem>
      <SItem className="wl-st-trend" decor>
        <svg viewBox={`0 0 ${TW} ${TH}`} className="wl-st-trend-svg" role="img" aria-label="نمودار امتیاز هفته‌ها" style={{ direction: "ltr" }}>
          <defs>
            <linearGradient id={`tg${uid}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--ring-1a)" stopOpacity=".34" />
              <stop offset="100%" stopColor="var(--ring-1a)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`tl${uid}`} x1="1" x2="0" y1="0" y2="0">
              <stop offset="0%" stopColor="var(--ring-1a)" stopOpacity=".55" />
              <stop offset="100%" stopColor="var(--ring-1b)" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((g) => {
            const y = TPT + g * (TH - TPT - TPB);
            return <line key={g} x1={TPX} x2={TW - TPX} y1={y} y2={y} className="wl-st-trend-grid" />;
          })}
          {model.segs.map((seg, i) => {
            if (seg.length < 2) return null;
            const line = smoothPath(seg);
            const area = `${line} L${seg[seg.length - 1].x} ${bottom} L${seg[0].x} ${bottom} Z`;
            return (
              <g key={i}>
                <motion.path d={area} fill={`url(#tg${uid})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: lite ? 0.2 : 1.2, delay: lite ? 0 : t0 + 0.9 }} />
                <motion.path
                  d={line} fill="none" stroke={`url(#tl${uid})`} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round"
                  initial={{ pathLength: lite ? 1 : 0 }} animate={{ pathLength: 1 }}
                  transition={{ duration: drawDur, delay: lite ? 0 : t0, ease: [0.45, 0, 0.2, 1] }}
                />
              </g>
            );
          })}
          {model.pts.map((p, i) => p.y === null || i === n - 1 ? null : (
            <motion.circle
              key={i} cx={p.x} cy={p.y} r={3.4} className="wl-st-trend-dot"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: lite ? 0 : t0 + (i / (n - 1)) * drawDur, duration: 0.25 }}
            />
          ))}
          {last.y !== null && (
            <g>
              <circle cx={last.x} cy={last.y} r={7} className="wl-st-pulse" />
              <motion.circle
                cx={last.x} cy={last.y} r={7.5} className="wl-st-trend-last"
                style={{ transformBox: "fill-box", transformOrigin: "center" }}
                initial={{ scale: lite ? 1 : 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: lite ? 0 : t0 + drawDur - 0.1, type: "spring", stiffness: 300, damping: 14 }}
              />
              <motion.text
                x={Math.max(20, last.x)} y={last.y - 16} textAnchor="middle" className="wl-st-trend-val"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: lite ? 0 : t0 + drawDur, duration: 0.4 }}
              >{Math.round(s.last)}</motion.text>
            </g>
          )}
        </svg>
        <span className="wl-st-trend-dates" aria-hidden="true">
          <span>{jalaliDayMonth(s.weekStarts[0])}</span>
          <span>{jalaliDayMonth(s.weekStarts[n - 1])}</span>
        </span>
      </SItem>
      <h2 className="wl-st-title is-md"><MaskText text={s.caption} className="wl-st-sheen" delay={t0 + 0.9} stagger={0.08} /></h2>
      <SItem className="wl-st-sub">{s.mode === "best" ? "بالاتر از همه‌ی هفته‌های قبل" : "نسبت به هفته‌های قبل"}</SItem>
    </div>
  );
}

function InsightSlide({ s }: { s: Extract<StorySlide, { id: "insight" }> }) {
  const U = useU();
  const Icon = INSIGHT_ICONS[s.insight.icon] ?? Zap;
  return (
    <div className="wl-st-body">
      <SItem><Kicker icon={Lightbulb}>یک بینش</Kicker></SItem>
      <SItem variants={POP} className={`wl-st-qmark is-${s.insight.tone}`} decor><Quote size={Math.round(46 * U)} strokeWidth={1.5} /></SItem>
      <p className="wl-st-quote"><MaskText text={s.insight.body} delay={0.4} stagger={0.05} /></p>
      <SItem className={`wl-st-attr is-${s.insight.tone}`}>
        <span className="wl-st-attr-ico"><Icon size={15} /></span>
        <b>{s.insight.title}</b>
      </SItem>
    </div>
  );
}

function StreakSlide({ s }: { s: Extract<StorySlide, { id: "streak" }> }) {
  const U = useU();
  return (
    <div className="wl-st-body">
      <SItem><Kicker icon={Flame}>{s.streak ? "استریک و دستاوردها" : "دستاوردهای هفته"}</Kicker></SItem>
      {s.streak ? (
        <>
          <SItem variants={POP} className="wl-st-flame" decor><span className="wl-st-flame-in"><Flame size={Math.round(78 * U)} strokeWidth={1.7} /></span></SItem>
          <SItem className="wl-st-streakrow">
            <Odo value={String(s.streak)} className="wl-st-huge wl-st-sheen" delay={0.5} duration={1.4} />
            <small>روز پیاپی روتین کامل</small>
          </SItem>
        </>
      ) : (
        <SItem className="wl-st-streakrow">
          <Odo value={String(s.achievements.length)} className="wl-st-huge wl-st-sheen" delay={0.5} duration={1} />
          <small>دستاورد تازه این هفته</small>
        </SItem>
      )}
      {s.achievements.length > 0 && (
        <div className="wl-st-achs">
          {s.achievements.map((a) => (
            <SItem key={a.key} variants={POP} className="wl-st-ach">
              <span className="wl-st-ach-e" aria-hidden="true">{a.emoji}</span>
              <b>{a.title}</b>
            </SItem>
          ))}
        </div>
      )}
    </div>
  );
}

function ReflectionSlide({ s }: { s: Extract<StorySlide, { id: "reflection" }> }) {
  const U = useU();
  return (
    <div className="wl-st-body">
      <SItem><Kicker icon={PenLine}>حرف خودت</Kicker></SItem>
      {s.mood && (
        <SItem variants={POP} className="wl-st-mood">
          <span className="wl-st-mood-e" aria-hidden="true" style={{ fontSize: Math.round(54 * U) }}>{MOODS[s.mood - 1]}</span>
          <small>{MOOD_LABELS[s.mood - 1]}</small>
        </SItem>
      )}
      <SItem className="wl-st-qlabel">{s.primary.label}</SItem>
      <p className="wl-st-quote is-user"><MaskText text={s.primary.text} delay={0.5} stagger={0.06} /></p>
      {s.secondary && (
        <SItem className="wl-st-second">
          <small>{s.secondary.label}</small>
          <span>{s.secondary.text}</span>
        </SItem>
      )}
    </div>
  );
}

function SummarySlide({ s, weekStart, onReplay }: { s: Extract<StorySlide, { id: "summary" }>; weekStart: string; onReplay: () => void }) {
  const U = useU();
  const Arch = s.archetype ? ARCH_ICONS[s.archetype.key] ?? Sparkles : null;
  const FIcon = s.focus.domain ? DOMAIN_ICONS[s.focus.domain] : Compass;
  return (
    <div className="wl-st-body">
      <SItem><Kicker icon={Sparkles}>خلاصه در یک نگاه</Kicker></SItem>
      <SItem variants={POP} className="wl-st-sum">
        <div className="wl-st-sum-top">
          {s.score !== null && (
            <GradientRing value={s.score / 100} size={Math.round(86 * U)} stroke={Math.round(9 * U)} grad={RING_GREEN} delay={0.6}>
              <span className="wl-st-sum-score">{Math.round(s.score)}</span>
            </GradientRing>
          )}
          <div className="wl-st-sum-id">
            {Arch && s.archetype && <span className="wl-st-sum-arch"><Arch size={16} />{s.archetype.title}</span>}
            {s.grade && <span className="wl-st-sum-grade">درجه <b>{s.grade}</b></span>}
          </div>
        </div>
        {s.bestDay && (
          <div className="wl-st-sum-best">
            <Crown size={15} />
            <span>بهترین روز</span>
            <b>{s.bestDay.weekday}</b>
            <em dir="ltr">{s.bestDay.score}</em>
          </div>
        )}
        {s.numbers.length > 0 && (
          <div className="wl-st-sum-nums" style={{ gridTemplateColumns: `repeat(${s.numbers.length}, minmax(0, 1fr))` }}>
            {s.numbers.map((n) => (
              <span key={n.key} className="wl-st-sum-num">
                <b dir="ltr">{n.value}</b>
                <small>{n.label}</small>
              </span>
            ))}
          </div>
        )}
      </SItem>
      <SItem className="wl-st-next">
        <span className="wl-st-next-ico"><FIcon size={17} /></span>
        <b>{s.focus.title}</b>
        {s.focus.target !== null && <span className="wl-st-next-t" dir="ltr">{Math.round(s.focus.target)}</span>}
      </SItem>
      <SItem className="wl-st-cta">
        <Link href={goalCtaHref(s.focus)} className="trade-primary-btn wl-cta-btn"><Target size={16} />تعیین هدف</Link>
        <Link href={weekCtaHref(weekStart)} className="account-outline-btn wl-cta-btn">آنالیز کامل این هفته</Link>
        <button type="button" className="trade-ghost-btn wl-st-replay" onClick={onReplay}><RotateCcw size={14} />پخش دوباره</button>
      </SItem>
    </div>
  );
}

function SlideView({ slide, letter, onReplay }: { slide: StorySlide; letter: WeeklyLetterData; onReplay: () => void }) {
  switch (slide.id) {
    case "intro": return <IntroSlide letter={letter} />;
    case "score": return <ScoreSlide s={slide} headline={letter.headline} />;
    case "archetype": return <ArchetypeSlide s={slide} />;
    case "rhythm": return <RhythmSlide s={slide} />;
    case "best": return <BestSlide s={slide} />;
    case "domains": return <DomainsSlide s={slide} />;
    case "numbers": return <NumbersSlide s={slide} />;
    case "trend": return <TrendSlide s={slide} />;
    case "insight": return <InsightSlide s={slide} />;
    case "streak": return <StreakSlide s={slide} />;
    case "reflection": return <ReflectionSlide s={slide} />;
    case "summary": return <SummarySlide s={slide} weekStart={letter.weekStart} onReplay={onReplay} />;
  }
}

/** شدت نور پس‌زمینه‌ی هر اسلاید (0.4 تا 1): اسلایدهای امتیازدار از روی خود امتیاز، بقیه ثابت */
function slideK(slide: StorySlide): number {
  if (slide.id === "score") return scoreIntensity(slide.score);
  if (slide.id === "rhythm") return scoreIntensity(slide.avg);
  if (slide.id === "domains") return scoreIntensity(slide.top.score);
  if (slide.id === "trend") return scoreIntensity(slide.last);
  return 0.8;
}

// ---- پوسته ----
export function WeeklyLetterStories({
  open, onClose, letter, slides,
}: { open: boolean; onClose: () => void; letter: WeeklyLetterData; slides: StorySlide[] }) {
  useLockBodyScroll(open);
  const reduce = !!useReducedMotion();
  const autoplay = !reduce;
  const n = slides.length;

  const [[index, dir], setPage] = useState<[number, number]>([0, 1]);
  const pageRef = useRef(0);
  const [tick, setTick] = useState(0); // با هر عدد تازه، پر شدن نوار از اول شروع می‌شه
  const [hold, setHold] = useState(false);
  const [userPause, setUserPause] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [box, setBox] = useState(frameSize);
  const stageRef = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  const paused = hold || userPause || hidden;
  const u = unitOf(box.w, box.h);

  // هر بار باز شد از اولین اسلاید
  useEffect(() => {
    if (!open) return;
    pageRef.current = 0;
    setPage([0, 1]);
    setTick(0);
    setHold(false);
    setUserPause(false);
    setBox(frameSize());
  }, [open]);

  // اندازه‌ی واقعی قاب (چرخش گوشی، تغییر پنجره)
  useEffect(() => {
    if (!open) return;
    const onResize = () => setBox(frameSize());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open]);

  // تب پنهان = توقف
  useEffect(() => {
    if (!open) return;
    const on = () => setHidden(document.hidden);
    on();
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, [open]);

  const go = useCallback((d: 1 | -1) => {
    const next = pageRef.current + d;
    if (next >= n) return;
    if (next < 0) { setTick((t) => t + 1); return; }
    pageRef.current = next;
    setPage([next, d]);
    setTick((t) => t + 1);
  }, [n]);
  const goRef = useRef(go);
  goRef.current = go;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const replay = useCallback(() => {
    pageRef.current = 0;
    setPage([0, -1]);
    setTick((t) => t + 1);
  }, []);

  // «جلو» در راست‌به‌چپ سمت چپه
  const isRtl = () => (stageRef.current ? getComputedStyle(stageRef.current).direction === "rtl" : true);

  // ---- لمس / ماوس: ضربه‌ی نیمه‌ها، نگه‌داشتن = توقف، سوایپ ----
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if ((e.target as HTMLElement).closest("a,button")) return;
    const start = { x: e.clientX, y: e.clientY, held: false };
    const timer = window.setTimeout(() => { start.held = true; setHold(true); }, HOLD_MS);
    const finish = (ev: PointerEvent, cancelled: boolean) => {
      window.clearTimeout(timer);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      setHold(false);
      if (cancelled || start.held) return;
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      const rtl = isRtl();
      if (Math.abs(dx) > 46 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        // بعدی: در RTL انگشت از چپ به راست
        goRef.current((dx > 0) === rtl ? 1 : -1);
      } else if (dy > 90 && dy > Math.abs(dx) * 1.4) {
        closeRef.current();
      } else if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
        const rect = stageRef.current?.getBoundingClientRect();
        if (!rect) return;
        const leftHalf = ev.clientX - rect.left < rect.width / 2;
        goRef.current(leftHalf === rtl ? 1 : -1);
      }
    };
    // حرکت زودهنگام یعنی سوایپ نه نگه‌داشتن: تایمر توقف لغو می‌شه
    const onMove = (ev: PointerEvent) => {
      if (!start.held && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 10) window.clearTimeout(timer);
    };
    const onUp = (ev: PointerEvent) => finish(ev, false);
    const onCancel = (ev: PointerEvent) => finish(ev, true);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
  };

  // ---- فوکوس: داخل پنجره، و بعد از بستن برگشت به دکمه‌ی بازکننده ----
  useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const raf = requestAnimationFrame(() => stageRef.current?.focus({ preventScroll: true }));
    return () => {
      cancelAnimationFrame(raf);
      const el = returnTo.current;
      returnTo.current = null;
      // بازشدن خودکار (?story=1) بازکننده‌ای نداره: فوکوس برمی‌گرده به دکمه‌ی «پخش داستان»
      const target = el && el.isConnected && el !== document.body ? el : document.querySelector<HTMLElement>(".wl-story-play");
      if (target) target.focus({ preventScroll: true });
    };
  }, [open]);

  // ---- کیبورد ----
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const stage = stageRef.current;
      if (e.key === "Escape") { e.preventDefault(); closeRef.current(); return; }
      if (e.key === "Tab" && stage) {
        const els = Array.from(stage.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
        if (!els.length) { e.preventDefault(); stage.focus(); return; }
        const first = els[0], last = els[els.length - 1];
        const cur = document.activeElement;
        if (e.shiftKey && (cur === first || cur === stage)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus(); }
        return;
      }
      const rtl = isRtl();
      if (e.key === "ArrowLeft") { e.preventDefault(); goRef.current(rtl ? 1 : -1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); goRef.current(rtl ? -1 : 1); }
      else if (e.key === "Home") { e.preventDefault(); replay(); }
      else if (e.key === "End") { e.preventDefault(); while (pageRef.current < n - 1) goRef.current(1); }
      else if (e.key === " " && autoplay && !(e.target as HTMLElement).closest("a,button")) { e.preventDefault(); setUserPause((p) => !p); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, n, autoplay, replay]);

  if (typeof document === "undefined") return null;
  const slide = slides[Math.min(index, n - 1)];
  if (!slide) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="wl-story"
          className="wl-root wl-st-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <div className="wl-st-frame" style={{ "--u": u } as CSSProperties}>
            <UCtx.Provider value={u}>
              <motion.div
                ref={stageRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-roledescription="داستان"
                aria-label="داستان هفته"
                className={`wl-st${hold ? " is-held" : ""}`}
                initial={{ opacity: 0, scale: 0.96, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 8 }}
                transition={{ duration: 0.3, ease: WL_EASE as never }}
                onPointerDown={onPointerDown}
              >
                <p className="wl-sr" aria-live="polite">{`اسلاید ${index + 1} از ${n}: ${slide.label}`}</p>

                <div className="wl-st-chrome">
                  <ol className="wl-st-bars" aria-hidden="true">
                    {slides.map((sl, i) => (
                      <li key={sl.id} className={`wl-st-bar${i < index ? " is-done" : ""}${i === index ? " is-cur" : ""}`}>
                        {i === index && autoplay ? (
                          <i
                            key={tick}
                            className="wl-st-fill"
                            style={{ animationDuration: `${sl.dur}ms`, animationPlayState: paused ? "paused" : "running" }}
                            onAnimationEnd={(e) => { if (e.target === e.currentTarget && pageRef.current < n - 1) goRef.current(1); }}
                          />
                        ) : <i />}
                      </li>
                    ))}
                  </ol>
                  <div className="wl-st-top">
                    <span className="wl-st-id">
                      <BrandMark />
                      <b>آنالیز هفتگی</b>
                      {letter.issueNo > 0 && <small>شماره {letter.issueNo}</small>}
                    </span>
                    <span className="wl-st-ctl">
                      {autoplay && (
                        <button type="button" className="trade-icon-btn wl-st-btn" aria-label={userPause ? "ادامه‌ی پخش" : "توقف پخش"} onClick={() => setUserPause((p) => !p)}>
                          {userPause ? <Play size={18} /> : <Pause size={18} />}
                        </button>
                      )}
                      <button type="button" className="trade-icon-btn wl-st-btn" aria-label="بستن" onClick={onClose}><X size={20} /></button>
                    </span>
                  </div>
                </div>

                <AnimatePresence custom={dir} mode="sync">
                  <motion.div
                    key={index}
                    custom={dir}
                    variants={SLIDE}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className={`wl-st-slide wl-st-${slide.id}`}
                    style={{ "--wl-k": slideK(slide) } as CSSProperties}
                  >
                    <FitScale u={u} boxKey={`${box.w}x${box.h}`}>
                      <SlideView slide={slide} letter={letter} onReplay={replay} />
                    </FitScale>
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            </UCtx.Provider>

            <button type="button" className="trade-icon-btn wl-st-arrow is-fwd" aria-label="اسلاید بعدی" onClick={() => go(1)} disabled={index >= n - 1}><ChevronLeft size={26} /></button>
            <button type="button" className="trade-icon-btn wl-st-arrow is-back" aria-label="اسلاید قبلی" onClick={() => go(-1)} disabled={index <= 0}><ChevronRight size={26} /></button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
