"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import {
  Apple, ArrowLeft, Bot, CalendarCheck, CandlestickChart, Check, Dumbbell, FileSpreadsheet, Flame, GraduationCap,
  Headset, Heart, KeyRound, Languages, Layers, Lock, Mail, Moon, ShieldCheck, Smartphone, Sparkles, Target, UserRound,
  UtensilsCrossed, CalendarDays, ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SOCIAL, SUPPORT_EMAIL, brandName } from "@/lib/brand";
import { TelegramIcon, InstagramIcon } from "@/components/SocialIcons";
import { EnamadBadge } from "@/components/EnamadBadge";
import { LandingStats } from "@/components/LandingSections";
import { AboutBrandLogo } from "@/components/AboutHero";
import { AboutTeamPanel } from "@/components/AboutTeam";
import type { TeamMember } from "@/lib/teamMembers";
import {
  AboutMockCalorie, AboutMockMentor, AboutMockNumo, AboutMockRoutine, AboutMockSleep, AboutMockStreak, AboutMockTrade,
  AboutMockWorkout,
} from "@/components/AboutMockups";
import { isEn, tr, trv } from "@/lib/i18n";

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
    <section className="ab-stats" aria-label={tr(`${brandName()} تا امروز`, `${brandName()} so far`)}>
      <LandingStats />
    </section>
  );
}

/* ─────────────────── داستان ─────────────────── */
type ToolDef = { label: string; icon: LucideIcon; color: string; x: number; y: number; r: number };
const tools = (): ToolDef[] => [
  { label: tr("اپ برنامه‌ریزی", "Planner app"), icon: CalendarDays, color: "#3E7BFA", x: -120, y: -118, r: -9 },
  { label: tr("اپ تمرین", "Workout app"), icon: Dumbbell, color: "#8A5CFF", x: 116, y: -84, r: 8 },
  { label: tr("اپ کالری", "Calorie app"), icon: UtensilsCrossed, color: "#EE920C", x: -112, y: 104, r: 7 },
  { label: tr("اکسل معاملات", "Trades spreadsheet"), icon: FileSpreadsheet, color: "#16A34A", x: 118, y: 124, r: -6 },
];

function ToolChip({ t, p }: { t: ToolDef; p: MotionValue<number> }) {
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

const unified = (): { label: string; icon: LucideIcon }[] => [
  { label: tr("روتین", "Routine"), icon: CalendarCheck }, { label: tr("خواب", "Sleep"), icon: Moon }, { label: tr("تمرین", "Workout"), icon: Dumbbell },
  { label: tr("کالری", "Calories"), icon: Apple }, { label: tr("ترید", "Trading"), icon: CandlestickChart }, { label: tr("مربی", "Mentor"), icon: GraduationCap },
];

function Converge() {
  const TOOLS = tools();
  const UNIFIED = unified();
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
          <div className="ab-unified-top"><AboutBrandLogo /> {brandName()}</div>
          <div className="ab-unified-mods">
            {UNIFIED.map((u) => { const Ic = u.icon; return <span key={u.label}><Ic size={15} />{u.label}</span>; })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

const chapters = (): { step: string; title: string; body: string }[] => [
  {
    step: tr("مشکل", "The problem"),
    title: tr("ابزار کم نبود؛ پخش‌بودن ابزارها بود.", "There was no shortage of tools; they were scattered."),
    body: tr("وقتی برنامه‌ی هفتگی‌ات در یک اپ است، تمرین‌هایت در اپ دیگر و معاملاتت در یک فایل اکسل، هیچ‌وقت تصویر کاملی از اینکه هفته‌ات چطور گذشته نداری.", "When your weekly plan is in one app, your workouts in another and your trades in a spreadsheet, you never get a full picture of how your week went."),
  },
  {
    step: tr("اصطکاک", "The friction"),
    title: tr("اپ‌هایی که برای ما ساخته نشده بودند.", "Apps that were not built for us."),
    body: tr("بیشتر اپ‌های این حوزه انگلیسی‌اند و با تقویم میلادی کار می‌کنند؛ برای کاربر فارسی‌زبان یعنی هر روز یک اصطکاک کوچک.", "Most apps in this space are English-only and use the Gregorian calendar; for a Persian-speaking user that means a small friction every day."),
  },
  {
    step: tr("ایده", "The idea"),
    title: tr("یک‌جا ثبت کن، یک‌جا ببین.", "Log in one place, see in one place."),
    body: tr(`${brandName()} برای همین ساخته شد: به‌جای اینکه برای هر بخش از زندگی‌ات یک اپ جدا نصب کنی، همه کنار هم زیر یک حساب کاربری‌اند.`, `${brandName()} was built for exactly this: instead of installing a separate app for each part of your life, everything sits side by side under one account.`),
  },
  {
    step: tr("امروز", "Today"),
    title: tr("فارسی، شمسی، روی هر دستگاه.", "Persian, Jalali, on every device."),
    body: tr("روتین روزانه و هفتگی، خواب، برنامه‌ی بدنسازی، کالری‌شماری، ژورنال ترید و مربی‌ها؛ با تقویم شمسی و روی موبایل و کامپیوتر یکسان.", "Daily and weekly routine, sleep, workout plan, calorie counting, trading journal and mentors, with the Jalali calendar and the same on phone and desktop."),
  },
];

export function AboutStory() {
  const CHAPTERS = chapters();
  const listRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: listRef, offset: ["start 0.75", "end 0.55"] });
  return (
    <section className="ab-sec" aria-labelledby="ab-story-h">
      <div className="ab-story">
        <div>
          <Reveal className="ab-head">
            <span className="ab-kicker">{tr("چرا ساخته شد", "Why it was built")}</span>
            <h2 id="ab-story-h" className="ab-title">{tr(`چرا ${brandName()}`, `Why was ${brandName()}`)} <em>{tr("ساخته شد؟", "built?")}</em></h2>
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
type ValueDef = { icon: LucideIcon; title: string; body: string };
const values = (): ValueDef[] => [
  { icon: Languages, title: tr("فارسی از پایه", "Persian from the ground up"), body: tr("راست‌به‌چپ و با تقویم شمسی ساخته شده، نه ترجمه‌ی یک اپ خارجی.", "Built right-to-left with the Jalali calendar, not a translation of a foreign app.") },
  { icon: Target, title: tr("ساخته‌شده برای اجرا", "Built for doing"), body: tr("فقط برای برنامه‌ریزی نیست؛ اجرای روزانه و پیشرفتت را هم دنبال می‌کند.", "It is not only for planning; it also follows your daily execution and progress.") },
  { icon: Layers, title: tr("همه‌چیز کنار هم", "Everything together"), body: tr("به‌جای پراکندگی بین چند ابزار، برنامه‌هایت را در یک سیستم مدیریت کن.", "Instead of scattering across several tools, manage your plans in one system.") },
  { icon: ShieldCheck, title: tr("حریم خصوصی پیش‌فرض", "Private by default"), body: tr("اطلاعاتت فروخته نمی‌شود و چت‌ها سرتاسر رمزنگاری‌شده‌اند.", "Your data is never sold and chats are end-to-end encrypted.") },
  { icon: Heart, title: tr("بی‌ادعای اضافه", "No extra claims"), body: tr("هرچه در این صفحه می‌خوانی همان کاری است که اپ امروز انجام می‌دهد.", "Everything you read on this page is what the app does today.") },
  { icon: Headset, title: tr("پشتیبانی واقعی", "Real support"), body: tr(`پیامت را خود تیم ${brandName()} پاسخ می‌دهد.`, `The ${brandName()} team itself answers your message.`) },
];

function ValueCard({ v, i }: { v: ValueDef; i: number }) {
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
  const VALUES = values();
  return (
    <section className="ab-sec" aria-labelledby="ab-values-h">
      <Reveal className="ab-head">
        <span className="ab-kicker">{tr("ارزش‌ها", "Values")}</span>
        <h2 id="ab-values-h" className="ab-title">{tr("چیزهایی که برایمان", "What matters")} <em>{tr("مهم است", "to us")}</em></h2>
      </Reveal>
      <div className="ab-values">
        {VALUES.map((v, i) => <ValueCard key={v.title} v={v} i={i} />)}
      </div>
    </section>
  );
}

/* ─────────────────── داخل آریون ─────────────────── */
type Tile = { icon: LucideIcon; title: string; body: string; href?: string; wide?: boolean; vis: React.ComponentType };

const tiles = (): Tile[] => [
  { icon: CalendarCheck, title: tr("روتین روزانه و هفتگی", "Daily and weekly routine"), body: tr("روتینت را برای روز و هفته بچین، کارها را همان لحظه تیک بزن و روند پایبندی‌ات را ببین.", "Lay out your routine for the day and week, tick tasks off the moment you do them and watch your consistency."), href: "/routine", wide: true, vis: AboutMockRoutine },
  { icon: Flame, title: tr("استریک و ثبات", "Streaks and consistency"), body: tr("زنجیره‌ی روزهای کامل پشت‌سرهم؛ 8 سطح، از 1 تا 365 روز.", "A chain of full days in a row; 8 levels, from 1 to 365 days."), href: "/habit-tracker", vis: AboutMockStreak },
  { icon: Moon, title: tr("پیگیری خواب", "Sleep tracking"), body: tr("ساعت خواب و بیداری هر شب را ثبت کن و الگوی خوابت را ببین.", "Log your bedtime and wake-up time each night and see your sleep pattern."), vis: AboutMockSleep },
  { icon: Dumbbell, title: tr("برنامه‌ی بدنسازی با AI", "AI workout plan"), body: tr("برنامه‌ی تمرینی را با هوش مصنوعی یا دستی بساز و هر ست را تیک بزن.", "Build a training plan with AI or by hand and tick off every set."), href: "/bodybuilding-program", vis: AboutMockWorkout },
  { icon: Apple, title: tr("کالری‌شمار", "Calorie counter"), body: tr("کالری و ماکروها را با پایگاه خوراکی‌های ایرانی ثبت کن و نیاز روزانه‌ات را بدان.", "Log calories and macros with a database of Iranian foods and know your daily need."), href: "/calorie-counter", vis: AboutMockCalorie },
  { icon: CandlestickChart, title: tr("ژورنال ترید", "Trading journal"), body: tr("معاملات هر حساب با آمار، چک‌لیست پیش از ورود، تقویم اقتصادی و همگام‌سازی MT4 و MT5؛ بدون رمز حساب معاملاتی.", "Trades for every account with statistics, a pre-entry checklist, an economic calendar and MT4 and MT5 sync, without your trading account password."), href: "/trading-journal", wide: true, vis: AboutMockTrade },
  { icon: GraduationCap, title: tr("مربی‌ها", "Mentors"), body: tr("مربی احراز هویت‌شده، دریافت برنامه و چت‌های سرتاسر رمزنگاری‌شده.", "Identity-verified mentors, plans delivered to you and end-to-end encrypted chats."), href: "/mentors", wide: true, vis: AboutMockMentor },
  { icon: Bot, title: tr("«نومو»، مدیر برنامه هوشمند", "Nomo, the smart plan manager"), body: tr("به فارسی بنویس چه می‌خواهی تا برنامه‌های روتینت را بسازد یا جابه‌جا کند.", "Write in plain language what you want and it will create or move your routine plans."), href: "/ai-planner", wide: true, vis: AboutMockNumo },
];

export function AboutInside() {
  const TILES = tiles();
  return (
    <section id="inside" className="ab-sec" aria-labelledby="ab-inside-h">
      <Reveal className="ab-head">
        <span className="ab-kicker">{tr("داخل آریون", "Inside Arion")}</span>
        <h2 id="ab-inside-h" className="ab-title">{tr(`داخل ${brandName()}`, `What is inside`)} <em>{tr("چه چیزهایی هست؟", brandName() + "?")}</em></h2>
        <p className="ab-lead">{tr("هر بخش یک ابزار کامل است، ولی همه از یک حساب و یک تقویم می‌خوانند؛ پس تصویر روزت یک‌جا کنار هم می‌ماند.", "Every section is a complete tool, but all of them read from one account and one calendar, so the picture of your day stays together.")}</p>
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
                    {tr("بیشتر بخوان", "Read more")} <ArrowLeft size={14} className="dir-flip" />
                  </Link>
                )}
              </article>
            </Reveal>
          );
        })}
      </div>
      <Reveal>
        <p className="ab-soon">{trv(<>و در راه: <b>رودمپ یادگیری با کمک هوش مصنوعی</b>، که به‌زودی برای عموم کاربران باز می‌شود.</>, <>Coming soon: <b>an AI-assisted learning roadmap</b>, which will open to all users shortly.</>)}</p>
      </Reveal>
    </section>
  );
}

/* ─────────────────── حریم خصوصی ─────────────────── */
const plain = () => tr("برنامه‌ی این هفته‌ت رو فرستادم.", "I sent you this week's plan.");
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
  const PLAIN = plain();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-40px" });
  const reduce = useReducedMotion();
  const cipher = useScramble(inView && !reduce);
  return (
    <div ref={ref} className={`ab-pipe${inView ? "" : " is-paused"}`} aria-hidden="true">
      <div className="ab-node">
        <div className="ab-node-head"><span><UserRound size={15} /> {tr("دستگاه مربی", "Mentor device")}</span><span className="ab-node-tag">{tr("رمزگذاری روی دستگاه", "Encrypted on device")}</span></div>
        <div className="ab-plain">{PLAIN}</div>
      </div>
      <div className="ab-link"><span className="ab-packet" /></div>
      <div className="ab-node ab-node-server">
        <div className="ab-node-head"><span><Lock size={15} /> {tr(`سرور ${brandName()}`, `${brandName()} server`)}</span><span className="ab-node-tag">{tr("فقط متن رمزشده", "Encrypted text only")}</span></div>
        <div className="ab-cipher ab-mono">{cipher}</div>
      </div>
      <div className="ab-link ab-link-2"><span className="ab-packet" /></div>
      <div className="ab-node">
        <div className="ab-node-head"><span><UserRound size={15} /> {tr("دستگاه تو", "Your device")}</span><span className="ab-node-tag">{tr("بازگشایی روی دستگاه", "Decrypted on device")}</span></div>
        <div className="ab-plain">{PLAIN}</div>
      </div>
    </div>
  );
}

const facts = (): { icon: LucideIcon; title: string; body: string }[] => [
  { icon: Lock, title: tr("گفت‌وگو با مربی سرتاسر رمزنگاری‌شده است.", "Your conversation with a mentor is end-to-end encrypted."), body: tr("چت، پیام گروهی و یادداشت خصوصی مربی روی دستگاه رمز می‌شوند؛ سرور و هیچ ادمینی متنشان را نمی‌بیند.", "Chats, group messages and the mentor's private notes are encrypted on the device; neither the server nor any admin can see their text.") },
  { icon: KeyRound, title: tr("رمز عبور با bcrypt هش می‌شود.", "Passwords are hashed with bcrypt."), body: tr("نشست ورود با توکن امضاشده مدیریت می‌شود و ارتباط با سایت روی HTTPS رمزنگاری‌شده است.", "Login sessions are managed with a signed token and the connection to the site is encrypted over HTTPS.") },
  { icon: CandlestickChart, title: tr("رمز حساب معاملاتی هرگز خواسته نمی‌شود.", "Your trading account password is never requested."), body: tr("اتصال متاتریدر فقط با کد اتصال و اکسپرت انجام می‌شود و رمز حساب ذخیره نمی‌شود.", "MetaTrader connects only with a connection code and an Expert Advisor, and no account password is stored.") },
  { icon: ShieldCheck, title: tr("اطلاعاتت فروخته نمی‌شود.", "Your data is never sold."), body: tr("داده‌ای که ثبت می‌کنی برای کار خود اپ است، نه برای تبلیغ‌دهنده.", "The data you log is for the app's own work, not for advertisers.") },
];

export function AboutPrivacy() {
  const FACTS = facts();
  return (
    <section className="ab-sec" aria-labelledby="ab-privacy-h">
      <Reveal>
        <div className="ab-privacy">
          <span className="ab-privacy-glow" aria-hidden="true" />
          <div className="ab-privacy-grid">
            <div>
              <span className="ab-kicker">{tr("داده‌ها و حریم خصوصی", "Data and privacy")}</span>
              <h2 id="ab-privacy-h" className="ab-title">{tr("حریم خصوصی،", "Privacy,")} <em>{tr("از ابتدا", "from the start")}</em></h2>
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
                {trv(<>جزئیات بیشتر در <Link href="/terms">قوانین و مقررات</Link> آمده است.</>, <>More details are in the <Link href="/terms">terms and conditions</Link>.</>)}
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
const moreLinks = () => [
  { href: "/faq", label: tr("سوالات متداول", "FAQ") },
  { href: "/routine", label: tr("روتین روزانه", "Daily routine") },
  { href: "/habit-tracker", label: tr("پیگیری عادت‌ها", "Habit tracking") },
  { href: "/daily-planner", label: tr("برنامه‌ریزی روزانه", "Daily planning") },
  { href: "/bodybuilding-program", label: tr("برنامه‌ی بدنسازی هوشمند", "Smart workout plan") },
  { href: "/calorie-counter", label: tr("کالری‌شمار", "Calorie counter") },
  { href: "/trading-journal", label: tr("ژورنال معاملاتی", "Trading journal") },
  { href: "/economic-calendar", label: tr("تقویم اقتصادی", "Economic calendar") },
  { href: "/forex-sessions", label: tr("ساعت بازار فارکس", "Forex market hours") },
  { href: "/blog", label: tr("مقاله‌ها", "Articles") },
  { href: "/terms", label: tr("قوانین و مقررات", "Terms and conditions") },
];

export function AboutContact({ team = [] }: { team?: TeamMember[] }) {
  const [teamOpen, setTeamOpen] = useState(false);
  const hasTeam = team.length > 0;
  const cards: { key: string; label: string; value: string; href?: string; icon: React.ReactNode }[] = [
    { key: "maker", label: tr("سازنده", "Built by"), value: "Arion Group", icon: <Sparkles size={18} /> },
    { key: "email", label: tr("ایمیل", "Email"), value: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}`, icon: <Mail size={18} /> },
    { key: "telegram", label: tr("تلگرام", "Telegram"), value: SOCIAL.telegram.handle, href: SOCIAL.telegram.url, icon: <TelegramIcon size={18} /> },
    { key: "instagram", label: tr("اینستاگرام", "Instagram"), value: SOCIAL.instagram.handle, href: SOCIAL.instagram.url, icon: <InstagramIcon size={18} /> },
  ];
  const MORE_LINKS = moreLinks();
  return (
    <section className="ab-sec" aria-labelledby="ab-contact-h">
      <Reveal className="ab-head">
        <span className="ab-kicker">{tr("در تماس باشیم", "Get in touch")}</span>
        <h2 id="ab-contact-h" className="ab-title">{tr("راه‌های", "Ways to")} <em>{tr("تماس", "reach us")}</em></h2>
      </Reveal>
      <div className="ab-contact">
        {cards.map((c, i) => {
          const inner = (
            <>
              <span className="ab-contact-ic">{c.icon}</span>
              <span className="ab-contact-label">{c.label}</span>
              <span className="ab-contact-value ab-mono" dir={c.href ? "ltr" : undefined} style={c.href ? { textAlign: isEn() ? "left" : "right" } : undefined}>{c.value}</span>
            </>
          );
          if (c.key === "maker" && hasTeam) {
            return (
              <Reveal key={c.key} delay={i * 0.06}>
                <button
                  type="button"
                  className="ab-contact-card ab-team-toggle"
                  aria-expanded={teamOpen}
                  aria-controls="ab-team-panel"
                  onClick={() => setTeamOpen((v) => !v)}
                >
                  <span className="ab-contact-ic">{c.icon}</span>
                  <span className="ab-contact-label">{c.label}</span>
                  <span className="ab-contact-value ab-mono" dir="ltr">
                    {c.value}
                    <ChevronDown size={15} className="ab-team-chev" aria-hidden="true" />
                  </span>
                </button>
              </Reveal>
            );
          }
          return (
            <Reveal key={c.key} delay={i * 0.06}>
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
      {hasTeam && <AboutTeamPanel id="ab-team-panel" open={teamOpen} members={team} />}
      <Reveal className="ab-more">
        <div className="ab-more-title">{tr("بیشتر بخوان", "Read more")}</div>
        <nav className="ab-more-links" aria-label={tr("صفحه‌های بیشتر", "More pages")}>
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
          <h2 id="ab-final-h" className="ab-final-title">{tr("از امروز،", "From today,")} <em>{tr("یک‌جا.", "in one place.")}</em></h2>
          <p className="ab-final-sub">{tr("«روتین من» برای هر حساب تازه 14 روز رایگان است؛ روتینت را بچین و از همین امروز اجرا کن.", "My Routine is free for 14 days for every new account; lay out your routine and start today.")}</p>
          <div className="ab-ctas">
            <Link href="/auth/signup" className="ls-btn ls-btn-primary">
              {tr("ساخت حساب", "Create account")} <ArrowLeft size={16} className="dir-flip" />
            </Link>
            <Link href="/auth/login" className="ls-btn ls-btn-ghost">{tr("ورود", "Log in")}</Link>
          </div>
          <div><span className="ab-final-note"><Check size={13} /> {tr("ثبت‌نام در کمتر از یک دقیقه", "Sign up in under a minute")}</span></div>
          <div className="ab-final-note" style={{ marginTop: 6 }}><Smartphone size={13} /> {tr("روی گوشی هم مثل یک اپ نصب می‌شود", "Installs on your phone like an app")}</div>
        </div>
      </Reveal>
    </section>
  );
}
