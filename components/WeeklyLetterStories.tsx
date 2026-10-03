"use client";

// «داستان هفته»: نمایش تمام‌صفحه‌ی هفته‌نامه به سبک استوری/Wrapped. اسلایدها از
// buildStorySlides می‌آن (اسلاید بی‌داده ساخته نمی‌شه). نوار بالا با انیمیشن CSS
// روی transform پر می‌شه و pause/resume اون رایگانه (animation-play-state).
// جهت راست‌به‌چپ: لمس نیمه‌ی چپ یا سوایپ از چپ به راست = بعدی، نیمه‌ی راست = قبلی.
// حرکت‌های دائمی (نور پس‌زمینه، مدار) روی کاهش حرکت و html[data-perf="low"] خاموشن،
// و با کاهش حرکت پخش خودکار هم نداریم (اسلاید فقط با دست عوض می‌شه).
import "./weekly-letter.css";
import { useCallback, useContext, createContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, animate, motion, useReducedMotion, type Variants } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Compass, Crown, Flame, Gauge, Medal, Pause, Play, RotateCcw, Sparkles, Target, TrendingUp, X, type LucideIcon,
} from "lucide-react";
import { ANALYSIS_DOMAIN_LABELS } from "@/lib/weeklyAnalysis/types";
import type { WeeklyLetterData } from "@/lib/weeklyLetter/types";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { GradientRing } from "./GradientRing";
import { DOMAIN_ICONS, DOM_GRAD, GradeStamp, WL_EASE, domainClass } from "./WeeklyLetterShared";
import { ARCH_ICONS, BrandMark } from "./WeeklyLetterCover";
import type { StorySlide } from "./WeeklyLetterStoriesData";
import { jalaliDayMonth, letterYear, parseCountable } from "./WeeklyLetterUtils";

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

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** عدد شمارنده: با ورود اسلاید از صفر تا مقدار می‌شمره (کاهش حرکت: مستقیم مقدار نهایی). */
function Num({ value, delay = 0.5, duration = 1.2, className }: { value: string; delay?: number; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  useIsoLayoutEffect(() => {
    const el = ref.current;
    const p = parseCountable(value);
    if (!el || !p || reduce) return;
    el.textContent = `${p.prefix}${(0).toFixed(p.decimals)}${p.suffix}`;
    const ctrl = animate(0, p.num, {
      duration, delay, ease: WL_EASE as never,
      onUpdate: (v) => { el.textContent = `${p.prefix}${v.toFixed(p.decimals)}${p.suffix}`; },
      onComplete: () => { el.textContent = value; },
    });
    return () => { ctrl.stop(); el.textContent = value; };
  }, [value, reduce, delay, duration]);
  return <span ref={ref} className={className} dir="auto">{value}</span>;
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
      <SItem variants={POP} className="wl-st-big wl-st-grad">{letter.issueNo || "—"}</SItem>
      <SItem className="wl-st-weeklabel">
        <small>هفته‌ی</small>
        <b>{letter.weekLabel}</b>
        <span>{letterYear(letter.weekEnd)}</span>
      </SItem>
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
        <GradientRing value={s.score / 100} size={Math.round(236 * U)} stroke={Math.round(17 * U)} grad={DOM_GRAD} delay={0.5}>
          <span className="wl-st-ringc">
            <Num value={String(Math.round(s.score))} className="wl-st-huge wl-st-grad" delay={0.55} duration={1.5} />
            <small>از 100</small>
          </span>
        </GradientRing>
        {s.grade && <GradeStamp grade={s.grade} size={Math.round(84 * U)} delay={1.15} className="wl-st-stamp" />}
      </SItem>
      <SItem className="wl-chips">
        {s.delta !== null && (
          <span className={`wl-chip ${up ? "is-good" : down ? "is-bad" : ""}`}>
            {up ? <TrendingUp size={14} /> : null}
            <b dir="ltr">{up ? "+" : down ? "−" : ""}{Math.abs(Math.round(s.delta))}</b>
            نسبت به هفته‌ی قبل
          </span>
        )}
        {s.rank && s.rank.position === 1 && (
          <span className="wl-chip is-gold"><Crown size={14} />بهترین هفته از {s.rank.of} هفته‌ی اخیر</span>
        )}
      </SItem>
      {headline && <SItem className="wl-st-cap">{headline}</SItem>}
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
      <SItem><h2 className="wl-st-title wl-st-grad">{s.archetype.title}</h2></SItem>
      {s.archetype.description && <SItem className="wl-st-cap is-lg">{s.archetype.description}</SItem>}
    </div>
  );
}

function BestSlide({ s }: { s: Extract<StorySlide, { id: "best" }> }) {
  return (
    <div className="wl-st-body">
      <SItem><Kicker icon={Crown}>بهترین روز هفته</Kicker></SItem>
      <SItem className="wl-st-dayname">
        <b className="wl-st-grad">{s.day.weekday}</b>
        <span>{s.day.date ? jalaliDayMonth(s.day.date) : ""}</span>
      </SItem>
      <SItem variants={POP} className="wl-st-dayscore">
        <Num value={String(Math.round(s.day.score ?? 0))} className="wl-st-huge wl-st-grad" delay={0.5} duration={1.3} />
        <small>امتیاز</small>
      </SItem>
      {s.rows.length > 0 && (
        <SItem className="wl-st-rows">
          {s.rows.map((r) => {
            const Icon = DOMAIN_ICONS[r.domain];
            return (
              <div key={r.domain} className={`wl-st-row ${domainClass(r.domain)}`}>
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
      <SItem className="wl-st-week" decor>
        {s.bars.map((b, i) => (
          <span key={i} className={`wl-st-wbar${b.best ? " is-best" : ""}${b.score === null ? " is-empty" : ""}`} style={{ "--h": b.score === null ? 0.06 : Math.max(0.08, Math.min(1, b.score / 100)), "--i": i } as CSSProperties}>
            <i />
            <em>{b.label}</em>
          </span>
        ))}
      </SItem>
    </div>
  );
}

function DomainsSlide({ s }: { s: Extract<StorySlide, { id: "domains" }> }) {
  const U = useU();
  const Icon = DOMAIN_ICONS[s.top.domain];
  const RIcon = s.riser ? DOMAIN_ICONS[s.riser.domain] : null;
  const same = s.riser?.domain === s.top.domain;
  return (
    <div className="wl-st-body">
      <SItem><Kicker icon={Medal}>قوی‌ترین بخش هفته</Kicker></SItem>
      <SItem variants={POP} className="wl-st-ringwrap">
        <GradientRing value={s.top.score / 100} size={Math.round(188 * U)} stroke={Math.round(15 * U)} grad={DOM_GRAD} delay={0.5}>
          <span className="wl-st-ringc is-icon">
            <Icon size={Math.round(26 * U)} />
            <Num value={String(Math.round(s.top.score))} className="wl-st-mid wl-st-grad" delay={0.55} duration={1.3} />
          </span>
        </GradientRing>
      </SItem>
      <SItem><h2 className="wl-st-title wl-st-grad">{ANALYSIS_DOMAIN_LABELS[s.top.domain]}</h2></SItem>
      {s.top.note && <SItem className="wl-st-cap">{s.top.note}</SItem>}
      {s.riser && RIcon && (
        <SItem className={`wl-st-riser ${domainClass(s.riser.domain)}`}>
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
        {s.items.map((n) => {
          const Icon = n.domain ? DOMAIN_ICONS[n.domain] : Sparkles;
          return (
            <SItem key={n.key} variants={POP} className={`wl-st-tile ${domainClass(n.domain)}`}>
              <span className="wl-st-tile-ico"><Icon size={15} /></span>
              <span className="wl-st-tile-val">
                <Num value={n.value} className="wl-st-stat wl-st-grad" delay={0.6} duration={1.2} />
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

function StreakSlide({ s }: { s: Extract<StorySlide, { id: "streak" }> }) {
  const U = useU();
  return (
    <div className="wl-st-body">
      <SItem><Kicker icon={Flame}>{s.streak ? "استریک و دستاوردها" : "دستاوردهای هفته"}</Kicker></SItem>
      {s.streak ? (
        <>
          <SItem variants={POP} className="wl-st-flame" decor><span className="wl-st-flame-in"><Flame size={Math.round(78 * U)} strokeWidth={1.7} /></span></SItem>
          <SItem className="wl-st-streakrow">
            <Num value={String(s.streak)} className="wl-st-huge wl-st-grad" delay={0.5} duration={1.4} />
            <small>روز پیاپی روتین کامل</small>
          </SItem>
        </>
      ) : (
        <SItem className="wl-st-streakrow">
          <Num value={String(s.achievements.length)} className="wl-st-huge wl-st-grad" delay={0.5} duration={1} />
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

function NextSlide({ letter, offset, onReplay }: { letter: WeeklyLetterData; offset: number; onReplay: () => void }) {
  const U = useU();
  const nw = letter.nextWeek;
  const Icon = nw.focusDomain ? DOMAIN_ICONS[nw.focusDomain] : Compass;
  return (
    <div className="wl-st-body">
      <SItem><Kicker icon={Compass}>هفته‌ی بعد</Kicker></SItem>
      <SItem variants={POP} className="wl-st-nextico"><Icon size={Math.round(34 * U)} strokeWidth={1.7} /></SItem>
      <SItem><h2 className="wl-st-title is-md wl-st-grad">{nw.focusTitle || "هفته‌ی بعد"}</h2></SItem>
      {nw.focusText && <SItem className="wl-st-cap is-clamp">{nw.focusText}</SItem>}
      {nw.suggestedTarget !== null && (
        <SItem className="wl-st-target">
          <Num value={String(Math.round(nw.suggestedTarget))} className="wl-st-stat wl-st-grad" delay={0.5} />
          <small>هدف پیشنهادی</small>
        </SItem>
      )}
      <SItem className="wl-st-cta">
        <Link href="/analysis/weekly#goals" className="trade-primary-btn wl-cta-btn"><Target size={16} />تعیین هدف</Link>
        <Link href={offset === 0 ? "/analysis/weekly" : `/analysis/weekly?offset=${offset}`} className="account-outline-btn wl-cta-btn">آنالیز کامل این هفته</Link>
        <button type="button" className="trade-ghost-btn wl-st-replay" onClick={onReplay}><RotateCcw size={14} />پخش دوباره</button>
      </SItem>
    </div>
  );
}

function SlideView({ slide, letter, offset, onReplay }: { slide: StorySlide; letter: WeeklyLetterData; offset: number; onReplay: () => void }) {
  switch (slide.id) {
    case "intro": return <IntroSlide letter={letter} />;
    case "score": return <ScoreSlide s={slide} headline={letter.headline} />;
    case "archetype": return <ArchetypeSlide s={slide} />;
    case "best": return <BestSlide s={slide} />;
    case "domains": return <DomainsSlide s={slide} />;
    case "numbers": return <NumbersSlide s={slide} />;
    case "streak": return <StreakSlide s={slide} />;
    case "next": return <NextSlide letter={letter} offset={offset} onReplay={onReplay} />;
  }
}

// ---- پوسته ----
export function WeeklyLetterStories({
  open, onClose, letter, slides, offset,
}: { open: boolean; onClose: () => void; letter: WeeklyLetterData; slides: StorySlide[]; offset: number }) {
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
      if (el && el.isConnected) el.focus({ preventScroll: true });
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
                      <b>هفته‌نامه</b>
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
                    className={`wl-st-slide wl-st-${slide.id} ${slide.accent}`}
                  >
                    <SlideView slide={slide} letter={letter} offset={offset} onReplay={replay} />
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
