"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Bell, BadgeCheck, CalendarClock, CalendarDays, Camera, Check, Clock, Crown, Dumbbell,
  Flame, GraduationCap, Lock, Pill, Route, Sparkles, TrendingUp, Trophy, Users, BarChart3,
  SkipForward, Send,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { useThemeTokens } from "@/components/PlanShowcase";
import { faNum } from "@/components/LandingHero";
import "./landing-hero.css";

// ─── ویترینِ تعاملیِ قابلیت‌ها (جایگزینِ کاروسلِ قبلی) ─────────────────────
// انتخابِ ماژول با همون SegmentedTabs ـِ سایت (قانونِ «انتخابِ تکی فقط با
// SegmentedTabs»)، داخلِ یک اسکرولرِ افقی برای موبایل. پخشِ خودکار با یک نوارِ
// پیشرفتِ CSS انجام می‌شه: پایانِ انیمیشنش (animationend) تبِ بعدی رو باز
// می‌کنه، پس «مکث» یعنی فقط animation-play-state: paused — بدون تایمرِ JS.
// روی هاور/فوکوس مکث، بعد از انتخابِ دستی کلاً متوقف، بیرونِ دید متوقف، و با
// prefers-reduced-motion اصلاً پخشِ خودکار نداره.

type ModKey = "routine" | "analysis" | "numo" | "fitness" | "trade" | "roadmap" | "mentor" | "friends";

type Mod = {
  key: ModKey;
  tab: string;
  icon: LucideIcon;
  title: string;
  hook: string;
  bullets: [string, string, string];
  cta: string;
};

const MODS: Mod[] = [
  {
    key: "routine", tab: "روتین", icon: CalendarDays,
    title: "روتین روزانه و هفتگی",
    hook: "هر روز رو تیک بزن، استریکت رو بساز",
    bullets: [
      "استریک با سطح‌های ۱ تا ۳۶۵ روز — هر سطح شعله‌ی خودش رو داره",
      "یادآوری کارها و یادآوری دارو با نوتیفیکیشن، سرِ وقت",
      "برنامه‌ی هفتگی و امروز همیشه با هم هم‌گام‌اند",
    ],
    cta: "روتینم رو بسازم",
  },
  {
    key: "analysis", tab: "آنالیز هفتگی", icon: BarChart3,
    title: "آنالیز هفتگی هوشمند",
    hook: "بفهم هفته‌ت واقعاً چطور گذشت",
    bullets: [
      "گزارش خودکار از روتین، خواب و تمرینِ هفته",
      "الگوهایی که خودت نمی‌بینی رو پیدا می‌کنه",
      "پیشنهادِ عملی و کوچیک برای هفته‌ی بعد",
    ],
    cta: "آنالیزم رو ببینم",
  },
  {
    key: "numo", tab: "نومو", icon: Sparkles,
    title: "دستیار هوش مصنوعی «نومو»",
    hook: "برنامه‌ریزی با زبونِ خودت",
    bullets: [
      "همون‌طور که حرف می‌زنی بنویس — فارسیِ محاوره هم می‌فهمه",
      "روتین، یادآوری و کارِ جدید رو خودش برات می‌سازه",
      "ساعت و تکرار رو خودش درمیاره، تو فقط تأیید کن",
    ],
    cta: "با نومو شروع کنم",
  },
  {
    key: "fitness", tab: "بدنسازی و کالری", icon: Dumbbell,
    title: "بدنسازی + کالری",
    hook: "برنامه‌ای که برای بدنِ خودت ساخته شده",
    bullets: [
      "برنامه‌ی تمرینی شخصی با هوش مصنوعی، بر اساس هدفت",
      "روزِ جامونده؟ «رد شدن» یا «ماندن» — انتخاب با خودته",
      "شمارش کالری و ماکرو، با اسکن غذا از روی عکس",
    ],
    cta: "برنامه‌م رو بگیرم",
  },
  {
    key: "trade", tab: "ژورنال ترید", icon: TrendingUp,
    title: "ژورنال ترید حساب‌محور",
    hook: "بنویس، آنالیز کن، بهتر شو",
    bullets: [
      "همگام‌سازی خودکار معاملات با متاتریدر ۴ و ۵ — بدون رمزِ حساب",
      "تقویم اقتصادی و ساعت فارکس با سشن‌های واقعی",
      "چک‌لیستِ ورود که لحظه‌ی ثبتِ هر معامله ذخیره می‌شه",
    ],
    cta: "ژورنالم رو بسازم",
  },
  {
    key: "roadmap", tab: "رودمپ", icon: Route,
    title: "رودمپ یادگیری با AI",
    hook: "از صفر تا مسلط، قدم‌به‌قدم",
    bullets: [
      "هر مهارتی — از گیتار تا اسپانیایی تا برنامه‌نویسی",
      "مسیرِ مرحله‌به‌مرحله، متناسب با وقتِ آزادت",
      "هر قدم رو تیک بزن و پیشرفتت رو ببین",
    ],
    cta: "مسیرم رو بچینم",
  },
  {
    key: "mentor", tab: "مربی‌ها", icon: GraduationCap,
    title: "مربی‌ها",
    hook: "یه همراهِ واقعی کنارِ مسیرت",
    bullets: [
      "مربیِ احرازِ هویت‌شده پیدا کن — رتبه‌بندی بر اساس شایستگی",
      "چتِ رمزگذاری‌شده‌ی سرتاسری؛ حتی ما هم متنش رو نمی‌بینیم",
      "پیشرفتت خودکار از تیک‌های روتینت به مربی می‌رسه",
    ],
    cta: "مربیم رو پیدا کنم",
  },
  {
    key: "friends", tab: "دوستان", icon: Users,
    title: "دوستان و رقابت",
    hook: "با هم، انگیزه دوبرابره",
    bullets: [
      "دوستات رو اضافه کن و استریکِ هم رو ببینید",
      "رقابتِ هفتگی روی تیک‌ها و روزهای کامل",
      "یه هل کوچیک از طرفِ رفیقت، وقتی کم آوردی",
    ],
    cta: "رقابت رو شروع کنم",
  },
];

const AUTOPLAY_MS = 7000;

// ─── پیش‌نمایش‌ها ──────────────────────────────────────────────────────────
// هر بچه‌ی مستقیم با --i به‌ترتیب وارد می‌شه (فقط opacity/transform).

function st(i: number) {
  return { "--i": i } as React.CSSProperties;
}

function PreviewRoutine() {
  const levels = [
    { n: 7, label: "هفته" }, { n: 30, label: "ماه" }, { n: 100, label: "صدتایی" }, { n: 365, label: "افسانه" },
  ];
  return (
    <div className="lsc-pv lsc-pv-routine">
      <div className="lsc-pv-card lsc-streak" style={st(0)}>
        <Flame size={30} className="lsc-streak-flame" />
        <div>
          <div className="lsc-big">{faNum(42)} روز</div>
          <div className="lsc-small">استریکِ فعلی · سطح بعدی: {faNum(100)}</div>
        </div>
      </div>
      <div className="lsc-levels" style={st(1)}>
        {levels.map((l, i) => (
          <span key={l.n} className={`lsc-level${i < 2 ? " on" : ""}${i === 2 ? " next" : ""}`}>
            <Flame size={14} />
            <b>{faNum(l.n)}</b>
            <small>{l.label}</small>
          </span>
        ))}
      </div>
      <div className="lsc-toast" style={st(2)}>
        <span className="lsc-toast-ic"><Pill size={14} /></span>
        <div className="min-w-0">
          <b>یادآوری دارو</b>
          <small>امگا ۳ · بعد از شام</small>
        </div>
        <span className="lsc-toast-time">۲۱:۰۰</span>
      </div>
      <div className="lsc-toast lsc-toast-2" style={st(3)}>
        <span className="lsc-toast-ic"><Bell size={14} /></span>
        <div className="min-w-0">
          <b>پیاده‌روی عصر</b>
          <small>۱۵ دقیقه‌ی دیگه</small>
        </div>
        <span className="lsc-toast-time">۱۸:۰۰</span>
      </div>
    </div>
  );
}

function PreviewAnalysis() {
  const bars = [0.5, 0.72, 0.64, 0.95, 0.58, 0.8, 0.36];
  const days = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
  return (
    <div className="lsc-pv">
      <div className="lsc-pv-card" style={st(0)}>
        <div className="lsc-row-between">
          <b className="lsc-mid">امتیاز هفته</b>
          <span className="lsc-chip-up"><TrendingUp size={12} /> {faNum(12)}٪</span>
        </div>
        <div className="lsc-chart">
          {bars.map((h, i) => (
            <span key={i} className={`lsc-chart-col${i === 3 ? " on" : ""}`}>
              <i style={{ "--h": h, "--i": i } as React.CSSProperties} />
              <small>{days[i]}</small>
            </span>
          ))}
        </div>
      </div>
      <div className="lsc-insight" style={st(1)}>
        <Sparkles size={15} />
        <p>بهترین روزت <b>سه‌شنبه</b> بود؛ شب‌هایی که قبل از ۱۲ خوابیدی، فرداش <b>{faNum(30)}٪</b> تیکِ بیشتری زدی.</p>
      </div>
    </div>
  );
}

function PreviewNumo() {
  return (
    <div className="lsc-pv lsc-pv-chat">
      <div className="lsc-bubble lsc-bubble-me" style={st(0)}>
        هر روز ساعت ۶ صبح پیاده‌روی، به‌جز جمعه‌ها. شب‌ها هم یادم بنداز قرصم رو بخورم
      </div>
      <div className="lsc-bot" style={st(1)}>
        <span className="lsc-bot-av"><Sparkles size={13} /></span>
        <div className="lsc-bubble lsc-bubble-bot">
          <b>نومو</b>
          دوتا مورد برات ساختم:
          <div className="lsc-made">
            <span><Check size={11} /> پیاده‌روی ساعت ۶ صبح، ۶ روز در هفته</span>
            <span><Pill size={11} /> یادآوری دارو، هر شب ساعت ۲۲</span>
          </div>
        </div>
      </div>
      <div className="lsc-compose" style={st(2)}>
        <span className="lsc-typing"><i /><i /><i /></span>
        <span className="lsc-compose-txt">هرچی تو ذهنته بنویس…</span>
        <span className="lsc-send"><Send size={13} /></span>
      </div>
    </div>
  );
}

function PreviewFitness() {
  const moves = [
    { n: "پرس سینه", s: "۴ × ۱۰", done: true },
    { n: "قفسه دمبل", s: "۳ × ۱۲", done: true },
    { n: "پشت‌بازو سیم‌کش", s: "۳ × ۱۲", done: false },
  ];
  return (
    <div className="lsc-pv lsc-pv-fit">
      <div className="lsc-pv-card" style={st(0)}>
        <div className="lsc-row-between">
          <b className="lsc-mid"><Dumbbell size={14} /> روز ۳ · سینه و پشت‌بازو</b>
          <span className="lsc-small">حجم</span>
        </div>
        <ul className="lsc-moves">
          {moves.map((m) => (
            <li key={m.n} className={m.done ? "done" : ""}>
              <span className="lsc-mv-check"><Check size={10} strokeWidth={3} /></span>
              <span className="lsc-mv-name">{m.n}</span>
              <span className="lsc-small">{m.s}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="lsc-missed" style={st(1)}>
        <span className="lsc-small">دیروز جا موند:</span>
        <span className="lsc-pill-opt on"><SkipForward size={11} /> رد شدن</span>
        <span className="lsc-pill-opt">ماندن</span>
      </div>
      <div className="lsc-pv-card lsc-cal" style={st(2)}>
        <svg viewBox="0 0 48 48" className="lsc-cal-ring">
          <circle cx="24" cy="24" r="19" className="lsc-ring-bg" />
          <circle cx="24" cy="24" r="19" className="lsc-ring-fg" pathLength={100} strokeDasharray="64 100" />
        </svg>
        <div className="min-w-0 flex-1">
          <b className="lsc-mid">۱٬۳۴۰ / ۲٬۱۰۰ کالری</b>
          <div className="lsc-macros">
            <span>پروتئین <b>۹۸g</b></span><span>کربو <b>۱۴۰g</b></span><span>چربی <b>۴۲g</b></span>
          </div>
        </div>
        <span className="lsc-scan"><Camera size={15} /><small>اسکن</small></span>
      </div>
    </div>
  );
}

function PreviewTrade() {
  return (
    <div className="lsc-pv">
      <div className="lsc-pv-card" style={st(0)}>
        <div className="lsc-row-between">
          <b className="lsc-mid">حساب پراپ · ۱۰K</b>
          <span className="lsc-sync"><span className="lsc-live" /> MT5 همگام</span>
        </div>
        <svg viewBox="0 0 300 70" className="lsc-equity" preserveAspectRatio="none">
          <defs>
            <linearGradient id="lscEq" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity=".28" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path className="lsc-eq-fill" d="M0 58 L30 52 L60 55 L90 40 L120 44 L150 30 L180 34 L210 22 L240 26 L270 12 L300 8 L300 70 L0 70 Z" />
          <path className="lsc-eq-line" d="M0 58 L30 52 L60 55 L90 40 L120 44 L150 30 L180 34 L210 22 L240 26 L270 12 L300 8" pathLength={1} />
        </svg>
        <div className="lsc-stats">
          <span><small>سود/زیان</small><b className="lsc-win">+۸۴۲$</b></span>
          <span><small>نرخ برد</small><b>{faNum(62)}٪</b></span>
          <span><small>R میانگین</small><b>۱٫۸</b></span>
        </div>
      </div>
      <div className="lsc-trade-row" style={st(1)}>
        <div className="lsc-mini">
          <CalendarClock size={14} />
          <div className="min-w-0"><b>CPI آمریکا</b><small>۱۶:۰۰ · تأثیر بالا</small></div>
          <span className="lsc-impact" />
        </div>
        <div className="lsc-mini">
          <Clock size={14} />
          <div className="min-w-0"><b>سشن لندن</b><small>باز · ۳ ساعت مانده</small></div>
        </div>
      </div>
    </div>
  );
}

function PreviewRoadmap() {
  const steps = [
    { n: "آکوردهای پایه", s: "done" },
    { n: "ریتم و استروک", s: "done" },
    { n: "اولین آهنگ کامل", s: "now" },
    { n: "بداهه‌نوازی", s: "" },
  ];
  return (
    <div className="lsc-pv">
      <div className="lsc-pv-card" style={st(0)}>
        <div className="lsc-row-between">
          <b className="lsc-mid"><Route size={14} /> گیتار از صفر · ۸ هفته</b>
          <span className="lsc-small">{faNum(50)}٪</span>
        </div>
        <ol className="lsc-steps">
          {steps.map((s, i) => (
            <li key={s.n} className={s.s} style={st(i + 1)}>
              <span className="lsc-step-dot">{s.s === "done" ? <Check size={11} strokeWidth={3} /> : faNum(i + 1)}</span>
              <span>{s.n}</span>
              {s.s === "now" ? <em>الان</em> : null}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function PreviewMentor() {
  return (
    <div className="lsc-pv">
      <div className="lsc-pv-card lsc-mentor" style={st(0)}>
        <span className="lsc-mentor-av">س</span>
        <div className="min-w-0 flex-1">
          <b className="lsc-mid">سارا · مربی تغذیه <BadgeCheck size={13} className="lsc-accent" /></b>
          <div className="lsc-small">احرازِ هویت‌شده · پاسخ‌گو</div>
        </div>
      </div>
      <div className="lsc-pv-card" style={st(1)}>
        <div className="lsc-e2e"><Lock size={11} /> رمزگذاری سرتاسری</div>
        <div className="lsc-bubble lsc-bubble-bot lsc-bubble-sm">این هفته روزهای کاملت بیشتر شده، عالیه! کربوی شام رو کمی کمتر کنیم؟</div>
      </div>
      <div className="lsc-pv-card" style={st(2)}>
        <div className="lsc-row-between">
          <span className="lsc-small">پیشرفت از روی روتینت</span>
          <b className="lsc-mid">{faNum(86)}٪</b>
        </div>
        <div className="lsc-progress-track"><i /></div>
      </div>
    </div>
  );
}

function PreviewFriends() {
  const rows = [
    { n: "نیما", s: 38, w: "۶/۷" },
    { n: "تو", s: 21, w: "۵/۷", me: true },
    { n: "مریم", s: 17, w: "۴/۷" },
  ];
  return (
    <div className="lsc-pv">
      <div className="lsc-pv-card" style={st(0)}>
        <div className="lsc-row-between">
          <b className="lsc-mid"><Trophy size={14} /> رقابت این هفته</b>
          <span className="lsc-small">۲ روز مانده</span>
        </div>
        <ul className="lsc-board">
          {rows.map((r, i) => (
            <li key={r.n} className={r.me ? "me" : ""} style={st(i + 1)}>
              <span className="lsc-rank">{i === 0 ? <Crown size={13} /> : faNum(i + 1)}</span>
              <span className="lsc-board-av">{r.n.slice(0, 1)}</span>
              <span className="lsc-board-name">{r.n}</span>
              <span className="lsc-board-streak"><Flame size={12} /> {faNum(r.s)}</span>
              <b>{r.w}</b>
            </li>
          ))}
        </ul>
      </div>
      <div className="lsc-toast" style={st(4)}>
        <span className="lsc-toast-ic"><Users size={14} /></span>
        <div className="min-w-0">
          <b>نیما بهت یه هل داد</b>
          <small>«امروز رو از دست نده!»</small>
        </div>
      </div>
    </div>
  );
}

const PREVIEWS: Record<ModKey, () => JSX.Element> = {
  routine: PreviewRoutine,
  analysis: PreviewAnalysis,
  numo: PreviewNumo,
  fitness: PreviewFitness,
  trade: PreviewTrade,
  roadmap: PreviewRoadmap,
  mentor: PreviewMentor,
  friends: PreviewFriends,
};

export function LandingShowcase() {
  const t = useThemeTokens();
  const [active, setActive] = useState<ModKey>("routine");
  const [hover, setHover] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [inView, setInView] = useState(false);
  const [autoplayOk, setAutoplayOk] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setAutoplayOk(!reduce);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // تبِ فعال رو داخلِ اسکرولرِ افقی (فقط خودِ اسکرولر، نه کلِ صفحه) به دید بیار
  useEffect(() => {
    const sc = scrollerRef.current;
    if (!sc) return;
    const btn = sc.querySelectorAll<HTMLElement>(".auth-tab")[MODS.findIndex((m) => m.key === active)];
    if (!btn) return;
    if (sc.scrollWidth <= sc.clientWidth + 1) return;
    const target = btn.offsetLeft - (sc.clientWidth - btn.offsetWidth) / 2;
    sc.scrollTo({ left: target, behavior: autoplayOk ? "smooth" : "auto" });
  }, [active, autoplayOk]);

  const next = useCallback(() => {
    setActive((k) => MODS[(MODS.findIndex((m) => m.key === k) + 1) % MODS.length].key);
  }, []);

  const playing = autoplayOk && !stopped;
  const paused = hover || !inView;
  const idx = MODS.findIndex((m) => m.key === active);
  const mod = MODS[idx];
  const Preview = PREVIEWS[active];
  const Icon = mod.icon;

  return (
    <section
      id="sec-landing-features"
      ref={rootRef}
      className={`lsc${inView ? "" : " is-paused"}`}
      aria-labelledby="lsc-title"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocusCapture={() => setHover(true)}
      onBlurCapture={() => setHover(false)}
    >
      <div className="lsc-head">
        <span className="lh-eyebrow"><span className="lh-eyebrow-dot" aria-hidden="true" /> {faNum(MODS.length)} ابزار، یک اپ</span>
        <h2 id="lsc-title" className={`lsc-title ${t.heading}`}>
          هرچی برای رشد لازم داری، <span className="lh-brand">همین‌جاست</span>
        </h2>
      </div>

      <div className="lsc-tabs-scroll no-scrollbar" ref={scrollerRef}>
        <SegmentedTabs
          options={MODS.map((m) => {
            const I = m.icon;
            return { value: m.key, label: <span className="lsc-tab-label"><I size={14} />{m.tab}</span> };
          })}
          active={active}
          onChange={(v) => { setStopped(true); setActive(v); }}
        />
      </div>

      <div className={`lsc-card border ${t.cardBorder} ${t.cardBg} ${t.shadow}`}>
        {playing ? (
          <div className="lsc-progress" aria-hidden="true">
            <span
              key={active}
              className="lsc-progress-fill"
              style={{ animationDuration: `${AUTOPLAY_MS}ms`, animationPlayState: paused ? "paused" : "running" }}
              onAnimationEnd={next}
            />
          </div>
        ) : null}

        <div className="lsc-body">
          <div className="lsc-stage" aria-hidden="true">
            <div className="lsc-stage-glow" />
            <div key={active} className="lsc-stage-in">
              <Preview />
            </div>
          </div>

          <div key={`t-${active}`} className="lsc-text" aria-live={playing ? "off" : "polite"}>
            <div className="lsc-text-top">
              <span className="lsc-icon"><Icon size={20} /></span>
              <span className={`lsc-count ${t.muted}`}>{faNum(String(idx + 1).padStart(2, "0"))} / {faNum(String(MODS.length).padStart(2, "0"))}</span>
            </div>
            <h3 className={`lsc-mod-title ${t.heading}`}>{mod.title}</h3>
            <p className="lsc-hook">{mod.hook}</p>
            <ul className="lsc-bullets">
              {mod.bullets.map((b) => (
                <li key={b} className={t.heading}>
                  <span className="lsc-bullet-ic"><Check size={12} strokeWidth={3} /></span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/auth/signup"
              className={`lsc-cta inline-flex items-center gap-1.5 self-start rounded-[18px] px-5 py-3 text-[14px] font-bold text-white transition hover:brightness-105 active:scale-[0.97] ${t.accentBg} ${t.accentShadow}`}
            >
              {mod.cta} <ArrowLeft size={16} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
