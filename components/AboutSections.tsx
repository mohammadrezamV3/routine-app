"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import {
  Apple, ArrowLeft, Bot, CalendarCheck, CandlestickChart, Check, Dumbbell, FileSpreadsheet, Flame, GraduationCap,
  Headset, Heart, KeyRound, Languages, Layers, Lock, Mail, Moon, ShieldCheck, Smartphone, Sparkles, Target, UserRound,
  UtensilsCrossed, CalendarDays,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SOCIAL, SUPPORT_EMAIL, BRAND_FA } from "@/lib/brand";
import { TelegramIcon, InstagramIcon } from "@/components/SocialIcons";
import { EnamadBadge } from "@/components/EnamadBadge";
import { LandingStats } from "@/components/LandingSections";
import { AboutBrandLogo } from "@/components/AboutHero";
import {
  AboutMockCalorie, AboutMockMentor, AboutMockNumo, AboutMockRoutine, AboutMockSleep, AboutMockStreak, AboutMockTrade,
  AboutMockWorkout,
} from "@/components/AboutMockups";

// ─── بخش‌های صفحه‌ی «درباره» ──────────────────────────────────────────────
// هر ادعای متن این‌جا با کاری که اپ امروز واقعا انجام می‌دهد یکی است (همان
// اصل نسخه‌ی قبلی صفحه): بدون آمار ساختگی، جایزه یا نقل‌قول کاربر. عددها
// فقط از LandingStats (واقعی + پایه‌ی lib/publicStatsBase.ts) می‌آیند.

const EASE = [0.22, 1, 0.36, 1] as const;

function Reveal({ children, delay = 0, className, y = 26 }: { children: React.ReactNode; delay?: number; className?: string; y?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function Head({ kicker, title, accent, lead, center }: { kicker: string; title: string; accent?: string; lead?: string; center?: boolean }) {
  return (
    <Reveal className={`ab-head${center ? " ab-head-center" : ""}`}>
      <span className="ab-kicker">{kicker}</span>
      <h2 className="ab-title">{title}{accent && <> <em>{accent}</em></>}</h2>
      {lead && <p className="ab-lead">{lead}</p>}
    </Reveal>
  );
}

/* ─────────────────── آمار ─────────────────── */
export function AboutStats() {
  return (
    <section className="ab-stats" aria-label={`${BRAND_FA} تا امروز`}>
      <LandingStats />
    </section>
  );
}

/* ─────────────────── داستان ─────────────────── */
const TOOLS: { label: string; icon: LucideIcon; color: string; x: number; y: number; r: number }[] = [
  { label: "اپ برنامه‌ریزی", icon: CalendarDays, color: "#3E7BFA", x: -120, y: -118, r: -9 },
  { label: "اپ تمرین", icon: Dumbbell, color: "#8A5CFF", x: 116, y: -84, r: 8 },
  { label: "اپ کالری", icon: UtensilsCrossed, color: "#EE920C", x: -112, y: 104, r: 7 },
  { label: "اکسل معاملات", icon: FileSpreadsheet, color: "#16A34A", x: 118, y: 124, r: -6 },
];

function ToolChip({ t, p }: { t: (typeof TOOLS)[number]; p: MotionValue<number> }) {
  const x = useTransform(p, [0, 0.55, 0.85], [t.x, t.x * 0.35, 0]);
  const y = useTransform(p, [0, 0.55, 0.85], [t.y, t.y * 0.35, 0]);
  const rotate = useTransform(p, [0, 0.85], [t.r, 0]);
  const scale = useTransform(p, [0.5, 0.88], [1, 0.6]);
  const opacity = useTransform(p, [0.62, 0.86], [1, 0]);
  const Ic = t.icon;
  return (
    <motion.div className="ab-pin" style={{ x, y, rotate, scale, opacity }}>
      <div className="ab-tool">
        <span className="ab-tool-ic" style={{ background: t.color }}><Ic size={15} /></span>
        {t.label}
      </div>
    </motion.div>
  );
}

const UNIFIED: { label: string; icon: LucideIcon }[] = [
  { label: "روتین", icon: CalendarCheck }, { label: "خواب", icon: Moon }, { label: "تمرین", icon: Dumbbell },
  { label: "کالری", icon: Apple }, { label: "ترید", icon: CandlestickChart }, { label: "مربی", icon: GraduationCap },
];

function Converge() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.95", "center 0.45"] });
  const uScale = useTransform(scrollYProgress, [0.68, 1], [0.82, 1]);
  const uOpacity = useTransform(scrollYProgress, [0.68, 0.95], [0, 1]);
  return (
    <div ref={ref} className="ab-converge" aria-hidden="true">
      <div className="ab-converge-grid" />
      {!reduce && TOOLS.map((t) => <ToolChip key={t.label} t={t} p={scrollYProgress} />)}
      <motion.div className="ab-pin" style={reduce ? undefined : { scale: uScale, opacity: uOpacity }}>
        <div className="ab-unified">
          <div className="ab-unified-top"><AboutBrandLogo /> {BRAND_FA}</div>
          <div className="ab-unified-mods">
            {UNIFIED.map((u) => { const Ic = u.icon; return <span key={u.label}><Ic size={15} />{u.label}</span>; })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

const CHAPTERS: { step: string; title: string; body: string }[] = [
  {
    step: "مشکل",
    title: "ابزار کم نبود؛ پخش‌بودن ابزارها بود.",
    body: "وقتی برنامه‌ی هفتگی‌ات در یک اپ است، تمرین‌هایت در اپ دیگر و معاملاتت در یک فایل اکسل، هیچ‌وقت تصویر کاملی از اینکه هفته‌ات چطور گذشته نداری.",
  },
  {
    step: "اصطکاک",
    title: "اپ‌هایی که برای ما ساخته نشده بودند.",
    body: "بیشتر اپ‌های این حوزه انگلیسی‌اند و با تقویم میلادی کار می‌کنند؛ برای کاربر فارسی‌زبان یعنی هر روز یک اصطکاک کوچک.",
  },
  {
    step: "ایده",
    title: "یک‌جا ثبت کن، یک‌جا ببین.",
    body: `${BRAND_FA} برای همین ساخته شد: به‌جای اینکه برای هر بخش از زندگی‌ات یک اپ جدا نصب کنی، همه کنار هم زیر یک حساب کاربری‌اند.`,
  },
  {
    step: "امروز",
    title: "فارسی، شمسی، روی هر دستگاه.",
    body: "روتین روزانه و هفتگی، خواب، برنامه‌ی بدنسازی، کالری‌شماری، ژورنال ترید و مربی‌ها؛ با تقویم شمسی و روی موبایل و کامپیوتر یکسان.",
  },
];

export function AboutStory() {
  const listRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: listRef, offset: ["start 0.75", "end 0.55"] });
  return (
    <section className="ab-sec" aria-labelledby="ab-story-h">
      <div className="ab-story">
        <div>
          <Reveal className="ab-head">
            <span className="ab-kicker">چرا ساخته شد</span>
            <h2 id="ab-story-h" className="ab-title">{`چرا ${BRAND_FA}`} <em>ساخته شد؟</em></h2>
          </Reveal>
          <Converge />
        </div>
        <div ref={listRef} className="ab-chapters">
          <div className="ab-chapters-rail" aria-hidden="true">
            <motion.div className="ab-chapters-fill" style={reduce ? undefined : { scaleY: scrollYProgress }} />
          </div>
          {CHAPTERS.map((c, i) => (
            <Reveal key={c.step} className="ab-chapter" delay={i * 0.05}>
              <span className="ab-chapter-dot" aria-hidden="true" />
              <span className="ab-chapter-step">{`0${i + 1} · ${c.step}`}</span>
              <h3 className="ab-chapter-title">{c.title}</h3>
              <p>{c.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────── ارزش‌ها ─────────────────── */
const VALUES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Languages, title: "فارسی از پایه", body: "راست‌به‌چپ و با تقویم شمسی ساخته شده، نه ترجمه‌ی یک اپ خارجی." },
  { icon: Target, title: "ساخته‌شده برای اجرا", body: "فقط برای برنامه‌ریزی نیست؛ اجرای روزانه و پیشرفتت را هم دنبال می‌کند." },
  { icon: Layers, title: "همه‌چیز کنار هم", body: "به‌جای پراکندگی بین چند ابزار، برنامه‌هایت را در یک سیستم مدیریت کن." },
  { icon: ShieldCheck, title: "حریم خصوصی پیش‌فرض", body: "اطلاعاتت فروخته نمی‌شود و چت‌ها سرتاسر رمزنگاری‌شده‌اند." },
  { icon: Heart, title: "بی‌ادعای اضافه", body: "هرچه در این صفحه می‌خوانی همان کاری است که اپ امروز انجام می‌دهد." },
  { icon: Headset, title: "پشتیبانی واقعی", body: `پیامت را خود تیم ${BRAND_FA} پاسخ می‌دهد.` },
];

function ValueCard({ v, i }: { v: (typeof VALUES)[number]; i: number }) {
  const Ic = v.icon;
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <Reveal delay={(i % 3) * 0.07}>
      <div className="ab-value" onPointerMove={onMove}>
        <span className="ab-value-num ab-mono">{`0${i + 1}`}</span>
        <span className="ab-value-ic"><Ic size={21} /></span>
        <h3 className="ab-value-title">{v.title}</h3>
        <p>{v.body}</p>
      </div>
    </Reveal>
  );
}

export function AboutValues() {
  return (
    <section className="ab-sec" aria-labelledby="ab-values-h">
      <Reveal className="ab-head">
        <span className="ab-kicker">ارزش‌ها</span>
        <h2 id="ab-values-h" className="ab-title">چیزهایی که برایمان <em>مهم است</em></h2>
      </Reveal>
      <div className="ab-values">
        {VALUES.map((v, i) => <ValueCard key={v.title} v={v} i={i} />)}
      </div>
    </section>
  );
}

/* ─────────────────── داخل آریون ─────────────────── */
type Tile = { icon: LucideIcon; title: string; body: string; href?: string; wide?: boolean; vis: React.ComponentType };

const TILES: Tile[] = [
  { icon: CalendarCheck, title: "روتین روزانه و هفتگی", body: "روتینت را برای روز و هفته بچین، کارها را همان لحظه تیک بزن و روند پایبندی‌ات را ببین.", href: "/routine", wide: true, vis: AboutMockRoutine },
  { icon: Flame, title: "استریک و ثبات", body: "زنجیره‌ی روزهای کامل پشت‌سرهم؛ 8 سطح، از 1 تا 365 روز.", href: "/habit-tracker", vis: AboutMockStreak },
  { icon: Moon, title: "پیگیری خواب", body: "ساعت خواب و بیداری هر شب را ثبت کن و الگوی خوابت را ببین.", vis: AboutMockSleep },
  { icon: Dumbbell, title: "برنامه‌ی بدنسازی با AI", body: "برنامه‌ی تمرینی را با هوش مصنوعی یا دستی بساز و هر ست را تیک بزن.", href: "/bodybuilding-program", vis: AboutMockWorkout },
  { icon: Apple, title: "کالری‌شمار", body: "کالری و ماکروها را با پایگاه خوراکی‌های ایرانی ثبت کن و نیاز روزانه‌ات را بدان.", href: "/calorie-counter", vis: AboutMockCalorie },
  { icon: CandlestickChart, title: "ژورنال ترید", body: "معاملات هر حساب با آمار، چک‌لیست پیش از ورود، تقویم اقتصادی و همگام‌سازی MT4 و MT5؛ بدون رمز حساب معاملاتی.", href: "/trading-journal", wide: true, vis: AboutMockTrade },
  { icon: GraduationCap, title: "مربی‌ها", body: "مربی احراز هویت‌شده، دریافت برنامه و چت‌های سرتاسر رمزنگاری‌شده.", href: "/mentors", wide: true, vis: AboutMockMentor },
  { icon: Bot, title: "«نومو»، مدیر برنامه هوشمند", body: "به فارسی بنویس چه می‌خواهی تا برنامه‌های روتینت را بسازد یا جابه‌جا کند.", href: "/ai-planner", wide: true, vis: AboutMockNumo },
];

export function AboutInside() {
  return (
    <section id="inside" className="ab-sec" aria-labelledby="ab-inside-h">
      <Reveal className="ab-head">
        <span className="ab-kicker">داخل آریون</span>
        <h2 id="ab-inside-h" className="ab-title">{`داخل ${BRAND_FA}`} <em>چه چیزهایی هست؟</em></h2>
        <p className="ab-lead">هر بخش یک ابزار کامل است، ولی همه از یک حساب و یک تقویم می‌خوانند؛ پس تصویر روزت یک‌جا کنار هم می‌ماند.</p>
      </Reveal>
      <div className="ab-bento">
        {TILES.map((t, i) => {
          const Ic = t.icon;
          const Vis = t.vis;
          return (
            <Reveal key={t.title} className={t.wide ? "ab-tile-wide" : undefined} delay={(i % 4) * 0.06}>
              <article className="ab-tile" style={{ height: "100%" }}>
                <div className="ab-tile-head">
                  <span className="ab-tile-ic"><Ic size={18} /></span>
                  <h3 className="ab-tile-title">{t.title}</h3>
                </div>
                <p className="ab-tile-body">{t.body}</p>
                <div className="ab-tile-vis"><Vis /></div>
                {t.href && (
                  <Link href={t.href} className="ab-tile-link">
                    بیشتر بخوان <ArrowLeft size={14} />
                  </Link>
                )}
              </article>
            </Reveal>
          );
        })}
      </div>
      <Reveal>
        <p className="ab-soon">و در راه: <b>رودمپ یادگیری با کمک هوش مصنوعی</b>، که به‌زودی برای عموم کاربران باز می‌شود.</p>
      </Reveal>
    </section>
  );
}

/* ─────────────────── حریم خصوصی ─────────────────── */
const PLAIN = "برنامه‌ی این هفته‌ت رو فرستادم.";
const CIPHER = "x9Qe7fA2Lr0pZt4We8Vn3Hs1kM6cY5uB";
const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz0123456789";

/** متن رمز که هر چند لحظه دوباره «هم زده» می‌شود — قطعی (بدون Math.random) */
function useScramble(active: boolean) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((t) => t + 1), 90);
    return () => clearInterval(id);
  }, [active]);
  if (!active) return CIPHER;
  const phase = tick % 40; // ۰..۱۵ هم‌زدن، بعد ثابت
  if (phase > 15) return CIPHER;
  return CIPHER.split("").map((c, i) => (i <= phase * 2 ? c : GLYPHS[(i * 7 + tick * 13) % GLYPHS.length])).join("");
}

function CipherPipe() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-40px" });
  const reduce = useReducedMotion();
  const cipher = useScramble(inView && !reduce);
  return (
    <div ref={ref} className={`ab-pipe${inView ? "" : " is-paused"}`} aria-hidden="true">
      <div className="ab-node">
        <div className="ab-node-head"><span><UserRound size={15} /> دستگاه مربی</span><span className="ab-node-tag">رمزگذاری روی دستگاه</span></div>
        <div className="ab-plain">{PLAIN}</div>
      </div>
      <div className="ab-link"><span className="ab-packet" /></div>
      <div className="ab-node ab-node-server">
        <div className="ab-node-head"><span><Lock size={15} /> سرور {BRAND_FA}</span><span className="ab-node-tag">فقط متن رمزشده</span></div>
        <div className="ab-cipher ab-mono">{cipher}</div>
      </div>
      <div className="ab-link ab-link-2"><span className="ab-packet" /></div>
      <div className="ab-node">
        <div className="ab-node-head"><span><UserRound size={15} /> دستگاه تو</span><span className="ab-node-tag">بازگشایی روی دستگاه</span></div>
        <div className="ab-plain">{PLAIN}</div>
      </div>
    </div>
  );
}

const FACTS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Lock, title: "گفت‌وگو با مربی سرتاسر رمزنگاری‌شده است.", body: "چت، پیام گروهی و یادداشت خصوصی مربی روی دستگاه رمز می‌شوند؛ سرور و هیچ ادمینی متنشان را نمی‌بیند." },
  { icon: KeyRound, title: "رمز عبور با bcrypt هش می‌شود.", body: "نشست ورود با توکن امضاشده مدیریت می‌شود و ارتباط با سایت روی HTTPS رمزنگاری‌شده است." },
  { icon: CandlestickChart, title: "رمز حساب معاملاتی هرگز خواسته نمی‌شود.", body: "اتصال متاتریدر فقط با کد اتصال و اکسپرت انجام می‌شود و رمز حساب ذخیره نمی‌شود." },
  { icon: ShieldCheck, title: "اطلاعاتت فروخته نمی‌شود.", body: "داده‌ای که ثبت می‌کنی برای کار خود اپ است، نه برای تبلیغ‌دهنده." },
];

export function AboutPrivacy() {
  return (
    <section className="ab-sec" aria-labelledby="ab-privacy-h">
      <Reveal>
        <div className="ab-privacy">
          <span className="ab-privacy-glow" aria-hidden="true" />
          <div className="ab-privacy-grid">
            <div>
              <span className="ab-kicker">داده‌ها و حریم خصوصی</span>
              <h2 id="ab-privacy-h" className="ab-title">حریم خصوصی، <em>از ابتدا</em></h2>
              <ul className="ab-facts">
                {FACTS.map((f) => {
                  const Ic = f.icon;
                  return (
                    <li key={f.title} className="ab-fact">
                      <span className="ab-fact-ic"><Ic size={14} /></span>
                      <span><b>{f.title}</b> {f.body}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="ab-privacy-more">
                جزئیات بیشتر در <Link href="/terms">قوانین و مقررات</Link> آمده است.
              </p>
            </div>
            <CipherPipe />
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ─────────────────── تماس و لینک‌ها ─────────────────── */
// لینک داخلی به صفحه‌های عمومی دیگر — هم برای کاربر، هم برای کراولر (این
// سایت بک‌لینک بیرونی ندارد، پس لینک‌دهی داخلی مسیر کشف صفحه‌هاست).
const MORE_LINKS = [
  { href: "/faq", label: "سوالات متداول" },
  { href: "/routine", label: "روتین روزانه" },
  { href: "/habit-tracker", label: "پیگیری عادت‌ها" },
  { href: "/daily-planner", label: "برنامه‌ریزی روزانه" },
  { href: "/bodybuilding-program", label: "برنامه‌ی بدنسازی هوشمند" },
  { href: "/calorie-counter", label: "کالری‌شمار" },
  { href: "/trading-journal", label: "ژورنال معاملاتی" },
  { href: "/economic-calendar", label: "تقویم اقتصادی" },
  { href: "/forex-sessions", label: "ساعت بازار فارکس" },
  { href: "/blog", label: "مقاله‌ها" },
  { href: "/terms", label: "قوانین و مقررات" },
];

export function AboutContact() {
  const cards: { label: string; value: string; href?: string; icon: React.ReactNode }[] = [
    { label: "سازنده", value: BRAND_FA, icon: <Sparkles size={18} /> },
    { label: "ایمیل", value: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}`, icon: <Mail size={18} /> },
    { label: "تلگرام", value: SOCIAL.telegram.handle, href: SOCIAL.telegram.url, icon: <TelegramIcon size={18} /> },
    { label: "اینستاگرام", value: SOCIAL.instagram.handle, href: SOCIAL.instagram.url, icon: <InstagramIcon size={18} /> },
  ];
  return (
    <section className="ab-sec" aria-labelledby="ab-contact-h">
      <Reveal className="ab-head">
        <span className="ab-kicker">در تماس باشیم</span>
        <h2 id="ab-contact-h" className="ab-title">راه‌های <em>تماس</em></h2>
      </Reveal>
      <div className="ab-contact">
        {cards.map((c, i) => {
          const inner = (
            <>
              <span className="ab-contact-ic">{c.icon}</span>
              <span className="ab-contact-label">{c.label}</span>
              <span className="ab-contact-value ab-mono" dir={c.href ? "ltr" : undefined} style={c.href ? { textAlign: "right" } : undefined}>{c.value}</span>
            </>
          );
          return (
            <Reveal key={c.label} delay={i * 0.06}>
              {c.href ? (
                <a
                  href={c.href}
                  className="ab-contact-card"
                  {...(c.href.startsWith("http") ? { target: "_blank", rel: "me noopener noreferrer" } : {})}
                >
                  {inner}
                </a>
              ) : (
                <div className="ab-contact-card">{inner}</div>
              )}
            </Reveal>
          );
        })}
      </div>
      <Reveal className="ab-more">
        <div className="ab-more-title">بیشتر بخوان</div>
        <nav className="ab-more-links" aria-label="صفحه‌های بیشتر">
          {MORE_LINKS.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}
        </nav>
        <div className="ab-enamad"><EnamadBadge /></div>
      </Reveal>
    </section>
  );
}

/* ─────────────────── CTA پایانی ─────────────────── */
export function AboutFinalCTA() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  return (
    <section className="ab-sec ab-final" aria-labelledby="ab-final-h">
      <Reveal>
        <div ref={ref} className={`ab-final-box${inView ? "" : " is-paused"}`}>
          <span className="ab-final-ring" aria-hidden="true" />
          <div className="ab-final-mark-wrap" aria-hidden="true"><AboutBrandLogo className="ab-final-mark" /></div>
          <h2 id="ab-final-h" className="ab-final-title">از امروز، <em>یک‌جا.</em></h2>
          <p className="ab-final-sub">«روتین من» برای هر حساب تازه 14 روز رایگان است؛ روتینت را بچین و از همین امروز اجرا کن.</p>
          <div className="ab-ctas">
            <Link href="/auth/signup" className="ls-btn ls-btn-primary">
              ساخت حساب <ArrowLeft size={16} />
            </Link>
            <Link href="/auth/login" className="ls-btn ls-btn-ghost">ورود</Link>
          </div>
          <div><span className="ab-final-note"><Check size={13} /> ثبت‌نام در کمتر از یک دقیقه</span></div>
          <div className="ab-final-note" style={{ marginTop: 6 }}><Smartphone size={13} /> روی گوشی هم مثل یک اپ نصب می‌شود</div>
        </div>
      </Reveal>
    </section>
  );
}
