"use client";

// هیروی داشبورد: سلام زمان‌محور، تاریخ شمسی، یک جمله‌ی خلاصه‌ی «امروزت
// کجاست»، سه حلقه‌ی هم‌مرکز روز (روتین/تمرین/کالری) و «نوار روز» — مسیر
// بیداری تا خواب خود کاربر که خورشید روی ساعت فعلی می‌شینه و برنامه‌های
// امروز به‌شکل نقطه روش هستن (پر = انجام‌شده).

import { SmartLink as Link } from "@/components/SmartLink";
import { useEffect, useMemo, useRef, useState } from "react";
import { m as motion } from "framer-motion";
import { weekdayName, jMonthName, faNum, toJalali } from "@/lib/jalali";
import { awakeProgress, dayPhase, PHASE_GREETING, type DayPhase } from "@/lib/dashboardCompute";
import { getStreakTier } from "@/lib/streakTier";
import type { DashboardData } from "@/lib/dashboardTypes";
import type { SectionKey } from "@/lib/sections";
import type { TodayTask } from "@/lib/useDashboardRoutine";
import { DashIcon, type DashIconName } from "./DashboardIcons";
import { GoldenName } from "./GoldenName";
import { Spinner } from "./Spinner";
import { TradeShareButton } from "./TradeShareButton";
import { useLogTrade } from "./TradeHubLog";
import { liveSessionPill } from "@/lib/tradeHubCompute";
import { ROUTINE_PLAN_KEY } from "@/lib/trial";
import { CountUp, D_EASE, GradientArc, Skel } from "./DashboardKit";
import { money, tone } from "./DashboardTrade";
import { tr, isEn, pick, iso } from "@/lib/i18n";
import { focusDisplay } from "@/lib/exerciseI18n";

const PHASE_ICON: Record<DayPhase, DashIconName> = { dawn: "sunrise", day: "sun", dusk: "sunset", night: "moon" };

export function useNow(stepMs = 30_000) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), stepMs);
    return () => clearInterval(t);
  }, [stepMs]);
  return now;
}

const two = (n: number) => String(n).padStart(2, "0");

// ساعت زنده — interval  یک‌ثانیه‌ای فقط داخل همین کامپوننته تا کل هیرو هر ثانیه رندر نشه
function LiveClock() {
  const [t, setT] = useState<Date | null>(null);
  useEffect(() => {
    setT(new Date());
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!t) return <span className="db-ribbon-clock" dir="ltr" aria-hidden="true">--:--<span className="s">:--</span></span>;
  return (
    <span className="db-ribbon-clock" dir="ltr" role="timer" aria-label={tr("ساعت فعلی", "Current time")}>
      {two(t.getHours())}<i>:</i>{two(t.getMinutes())}<i className="s">:</i><span className="s">{two(t.getSeconds())}</span>
    </span>
  );
}

// رنگ خورشید/ماه از زرد (صبح) تا بنفش (شب) بر اساس پیشرفت
const SUN_STOPS: [number, [number, number, number]][] = [
  // شب = مهتابی آبی روشن روی سرمه‌ای، نه بنفش (نشانگر باید روی نوار تیره دیده بشه)
  [0, [255, 211, 90]], [0.3, [255, 159, 67]], [0.52, [240, 112, 90]], [0.76, [120, 160, 230]], [1, [205, 222, 255]],
];
function sunColor(p: number) {
  const x = Math.max(0, Math.min(1, p));
  for (let i = 1; i < SUN_STOPS.length; i++) {
    const [b, cb] = SUN_STOPS[i];
    if (x <= b) {
      const [a, ca] = SUN_STOPS[i - 1];
      const k = (x - a) / (b - a || 1);
      return `rgb(${ca.map((v, j) => Math.round(v + (cb[j] - v) * k)).join(",")})`;
    }
  }
  return "rgb(205,222,255)";
}

export function DashboardHero({
  data,
  routine,
  onShare,
  routineLocked = false,
  routineOff = false,
  streakOn = true,
  section = null,
  tradeCta = false,
  sessionPill = false,
  onTradeSaved,
}: {
  data: DashboardData | null;
  routine: {
    ready: boolean;
    tasks: TodayTask[];
    stats: { completed: number; total: number; pct: number };
    streak: number | null;
    wakeSleep: { wake: string; sleep: string };
    hasWakeSleep: boolean;
  };
  /** «اشتراک موفقیت» — پاپ‌آپ DashboardShare */
  onShare?: () => void;
  routineLocked?: boolean;
  /** روتین از پنل ادمین خاموشه (فلگ routine) — حلقه‌ی روتین نیست، چیپ خرید هم نه */
  routineOff?: boolean;
  /** فلگ streak — چیپ استریک فقط وقتی /streak باز باشه لینک می‌شه */
  streakOn?: boolean;
  /** زیردامنه‌ی بخش؛ null = دامنه‌ی اصلی (هیرو دقیقا مثل قبل) */
  section?: SectionKey | null;
  /** بخش ترید: دکمه‌ی اصلی «ثبت معامله» (ماژول ترید + فلگ tradeJournal) */
  tradeCta?: boolean;
  /** بخش ترید: برچسب زنده‌ی جلسه‌ی فارکس (فلگ forexClock) */
  sessionPill?: boolean;
  /** بعد از ذخیره‌ی معامله از هیرو، داده‌ی داشبورد تازه بشه */
  onTradeSaved?: () => void;
}) {
  const now = useNow();
  const isTradeHero = section === "trade";
  const log = useLogTrade(isTradeHero && tradeCta, () => onTradeSaved?.());
  const pill = isTradeHero && sessionPill && now ? liveSessionPill(now) : null;
  const heroRef = useRef<HTMLElement>(null);
  // همان نور دنبال‌کننده‌ی موس BentoCard
  useEffect(() => {
    const el = heroRef.current;
    if (!el || typeof window === "undefined") return;
    if (!window.matchMedia("(hover:hover) and (pointer:fine)").matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    };
    el.addEventListener("pointermove", onMove, { passive: true });
    return () => { el.removeEventListener("pointermove", onMove); if (raf) cancelAnimationFrame(raf); };
  }, []);
  const phase = now ? dayPhase(now) : "day";
  const firstName = data?.user.name.split(" ")[0] ?? "";

  const dateLine = useMemo(() => {
    if (!now) return "";
    const [, jm, jd] = toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const jy = toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate())[0];
    return `${weekdayName(now.getDay())} ${faNum(jd)} ${jMonthName(jm - 1)} ${faNum(jy)}`;
  }, [now]);

  // ── حلقه‌ها ──
  // بخش روتین فقط حلقه‌ی روتین، بخش ورزش فقط تمرین و کالری (heroRings با section فیلتر می‌کنه)؛
  // بخش ترید حلقه‌ی روز نداره و خلاصه‌ی ترید از همین داده‌ی داشبورد ساخته می‌شه.
  const isTrade = section === "trade";
  const isWorkout = section === "workout";
  const shownRings = heroRings(data, routine.stats, routineLocked || routineOff, section).filter((r) => r.show);
  const ex = data?.exercise;
  const cal = data?.calorie;
  const tradeData = data?.trade ?? null;
  const tradeRings = useMemo(() => (isTrade ? tradeHeroRings(tradeData) : []), [isTrade, tradeData]);
  const legend: LegendItem[] = isTrade ? tradeLegend(tradeData) : shownRings;
  // وسط حلقه‌ها: استریک روتین؛ در بخش ورزش استریک جلسه‌های تمرین
  const centerStreak = isWorkout ? (data ? (ex?.streak ?? 0) : null) : routine.streak;
  // دسکتاپ بخش ترید/ورزش: آمار لیجند به‌جای ردیف ریز زیر حلقه، ناحیه‌ی KPI درشت وسط هیرو می‌شه
  const hasKpi = (isTrade || isWorkout) && legend.length >= 2;
  const orbitReady = isTrade ? !!data : isWorkout ? !!data && routine.ready : routine.ready;

  // ── جمله‌ی خلاصه ──
  const insight = useMemo(() => {
    const parts: string[] = [];
    if (isTrade) {
      if (!data) return null;
      const t = data.trade;
      if (!t) return tr("ژورنال و بازار امروز، یک‌جا", "Your journal and today's market, in one place");
      if (t.accountCount === 0) return tr("اولین حساب معاملاتیت رو بساز تا آمار این‌جا زنده بشه", "Create your first trading account to bring your stats to life here");
      parts.push(t.today.count > 0 ? tr(`امروز ${faNum(t.today.count)} معامله · ${money(t.today.pnl, t.sumCurrency)}`, `Today ${t.today.count} ${t.today.count === 1 ? "trade" : "trades"} · ${money(t.today.pnl, t.sumCurrency)}`) : tr("امروز هنوز معامله‌ای نبوده", "No trades yet today"));
      if (t.openTrades) parts.push(tr(`${faNum(t.openTrades)} معامله‌ی باز`, `${t.openTrades} open ${t.openTrades === 1 ? "trade" : "trades"}`));
      const next = data.calendar?.events.find((e) => e.impact === "HIGH" && Date.parse(e.occursAt) > Date.now() - 30 * 60_000);
      if (next) parts.push(tr(`خبر مهم بعدی: ${next.title}`, `Next major news: ${iso(next.title)}`));
      return parts.join(" · ");
    }
    if (isWorkout) {
      if (!data) return null;
      if (!ex?.hasPlan) parts.push(tr("هنوز برنامه‌ی تمرینی نداری", "You do not have a workout plan yet"));
      else if (!ex.today.isGymDay) parts.push(tr("امروز روز استراحته", "Today is a rest day"));
      else if (ex.today.done) parts.push(tr("تمرین امروز انجام شد", "Today's workout is done"));
      else parts.push(ex.today.focus ? tr(`تمرین امروز: ${ex.today.focus}`, `Today's workout: ${iso(ex.today.focus)}`) : tr("امروز روز تمرینه", "Today is a workout day"));
      if (cal?.target) {
        const left = Math.round(cal.target.kcal - cal.today.kcal);
        parts.push(left >= 0 ? tr(`${faNum(left)} کالری تا هدف`, `${left} kcal to goal`) : tr(`${faNum(-left)} کالری بیشتر از هدف`, `${-left} kcal over goal`));
      }
      return parts.join(" · ");
    }
    const { completed, total } = routine.stats;
    if (!routine.ready) return null;
    if (total === 0) parts.push(tr("امروز برنامه‌ای در روتینت نیست", "No programs in your routine today"));
    else if (completed === total) parts.push(tr("همه‌ی برنامه‌های امروز انجام شده", "All of today's programs are done"));
    else parts.push(tr(`${faNum(total - completed)} برنامه‌ی دیگه تا کامل‌شدن امروز`, `${total - completed} more ${total - completed === 1 ? "program" : "programs"} to complete today`));
    // بخش روتین فقط از روتین حرف می‌زنه؛ تمرین و کالری مال بخش ورزشن
    if (section !== "routine") {
      if (ex?.hasPlan && ex.today.isGymDay && !ex.today.done) parts.push(ex.today.focus ? tr(`تمرین امروز: ${ex.today.focus}`, `Today's workout: ${iso(focusDisplay(ex.today.focus))}`) : tr("امروز روز تمرینه", "Today is a workout day"));
      if (cal?.target) {
        const left = Math.round(cal.target.kcal - cal.today.kcal);
        parts.push(left >= 0 ? tr(`${faNum(left)} کالری تا هدف`, `${left} kcal to goal`) : tr(`${faNum(-left)} کالری بیشتر از هدف`, `${-left} kcal over goal`));
      }
    }
    return parts.join(" · ");
  }, [isTrade, isWorkout, section, data, routine.ready, routine.stats, ex, cal]);


  // ورود هیرو با CSS (m-rise)، نه framer: هیرو عنصر LCP داشبورده؛ با initial:{opacity:0} فریمر تا رسیدن
  // chunk انیمیشن نامرئی می‌موند و LCP عقب می‌افتاد. CSS از همون اولین پینت کار می‌کنه.
  return (
    <section ref={heroRef as any} className={`db-hero m-rise${isTrade ? " is-noribbon" : ""}${hasKpi ? " has-kpi" : ""}`}>
      {/* اشتراک کارنامه‌ی ترید — خود دکمه گیت ماژول و فلگ tradeShare رو داره؛ ?share=1 پنجره رو باز می‌کنه */}
      {isTrade && <TradeShareButton deepLink className="db-hero-share" size={20} />}
      {!isTrade && onShare && (
        // اشتراک موفقیت — فقط آیکون، گوشه‌ی بالا-چپ هیرو. تا روتین امروز خونده
        // نشده کارت عدد درستی نداره: غیرفعال با دایره‌ی لودینگ به‌جای آیکون.
        <button
          type="button"
          className="db-hero-share"
          onClick={onShare}
          disabled={!routine.ready}
          aria-haspopup="dialog"
          aria-busy={!routine.ready || undefined}
          aria-label={tr("اشتراک موفقیت امروز با دوستات", "Share today's progress with friends")}
          title={tr("اشتراک موفقیت", "Share progress")}
        >
          {routine.ready ? <DashIcon name="share" /> : <Spinner size={16} />}
        </button>
      )}
      <div className="db-hero-main">
        <div className="db-hero-greet">
          <motion.span
            key={phase}
            className={`db-hero-phase is-${phase}`}
            initial={{ rotate: -40, scale: 0.6, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 16, delay: 0.1 }}
          >
            <DashIcon name={PHASE_ICON[phase]} className="dbi-live" />
          </motion.span>
          <div className="db-hero-titles">
            <h1 className="db-hero-title">
              {pick(PHASE_GREETING[phase])}
              {firstName ? <>{tr("،", ",")} <GoldenName golden={data?.user.golden} staff={data?.user.staff}><span className="db-hero-name">{firstName}</span></GoldenName></> : null}
            </h1>
            <p className="db-hero-date">
              {dateLine || <Skel w={140} h={12} />}
            </p>
          </div>
        </div>

        <p className="db-hero-insight" aria-live="polite">{insight ?? <Skel w="70%" h={13} />}</p>

        <div className="db-hero-chips">
          {pill && (
            <span className={`db-live-pill is-${pill.tone}`} role="status">
              <span className="db-live-pill-dot" aria-hidden="true" />
              {pill.text}
            </span>
          )}
          {isTrade && tradeCta && (
            <button type="button" className="trade-primary-btn db-hero-cta" onClick={log.open} disabled={log.busy} aria-busy={log.busy || undefined}>
              {log.busy ? <Spinner size={16} label={null} /> : <DashIcon name="plus" />}
              {tr("ثبت معامله", "Log trade")}
            </button>
          )}
          {data?.routineTrial && !routineOff && (!section || section === "routine") && (
            <Link href={`/subscription/checkout?plan=${ROUTINE_PLAN_KEY}&duration=1`} prefetch={false} className={`db-chip db-chip-trial${data.routineTrial.daysLeft <= 3 ? " is-urgent" : ""}`}>
              <DashIcon name="routine" />
              {isEn() ? <>My Routine: <b>{data.routineTrial.daysLeft}</b> free {data.routineTrial.daysLeft === 1 ? "day" : "days"} left</> : <>روتین من: <b>{faNum(data.routineTrial.daysLeft)}</b> روز رایگان مونده</>}
            </Link>
          )}
          {routineLocked && !routineOff && (!section || section === "routine") && (
            <Link href={`/subscription/checkout?plan=${ROUTINE_PLAN_KEY}&duration=1`} prefetch={false} className="db-chip db-chip-trial is-urgent">
              <DashIcon name="lock" />
              {tr("خرید «روتین من»", "Get My Routine")}
            </Link>
          )}
          {data?.plan && (
            <Link href="/account/subscription" prefetch className="db-chip">
              <DashIcon name="card" />
              {data.plan.status === "TRIAL" ? tr("دوره‌ی آزمایشی", "Trial") : data.plan.name}
              <span className="db-chip-sub">{tr(`تا ${daysLeft(data.plan.endsAt)} روز دیگه`, `${daysLeft(data.plan.endsAt)} ${daysLeft(data.plan.endsAt) === "1" ? "day" : "days"} left`)}</span>
            </Link>
          )}
        </div>
      </div>

      {hasKpi && (
        <ul className="db-hero-kpis" aria-label={tr("آمار کلیدی", "Key stats")}>
          {legend.map((r) => (
            <li key={r.key}>
              <Link href={r.href} prefetch className="db-kpi">
                <span className="db-kpi-label">
                  <span className="db-orbit-dot" style={{ background: `linear-gradient(135deg, ${r.grad[0]}, ${r.grad[1]})` }} aria-hidden="true" />
                  {r.label}
                </span>
                <b className="db-kpi-val"><bdi dir="ltr">{r.display}</bdi></b>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="db-hero-orbit" aria-label={tr("پیشرفت امروز", "Today's progress")}>
        {isTrade ? (
          <OrbitRings rings={tradeRings} ready={orbitReady} streak={null} center={tradeCenter(tradeData)} />
        ) : (
          <OrbitRings rings={shownRings} ready={orbitReady} streak={centerStreak} unit={isWorkout ? "sessions" : "days"} />
        )}
        <ul className={`db-orbit-legend${hasKpi ? " is-kpi-dup" : ""}`}>
          {legend.map((r, i) => (
            <li key={r.key}>
              <Link href={r.href} prefetch>
                <span className="db-orbit-dot" style={{ background: `linear-gradient(135deg, ${r.grad[0]}, ${r.grad[1]})`, boxShadow: `0 0 10px color-mix(in srgb, ${r.grad[1]} 55%, transparent)` }} />
                <span className="db-orbit-label">{r.label}</span>
                <motion.b initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.1 }}>{r.display}</motion.b>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {log.modal}
      {!isTrade && <DayRibbon now={now} tasks={routine.tasks} wake={routine.wakeSleep.wake} sleep={routine.wakeSleep.sleep} configured={routine.hasWakeSleep} setHref={section && section !== "routine" ? "/sleep" : "/weekly"} />}
    </section>
  );
}

export type HeroRing = { key: "routine" | "exercise" | "calorie"; label: string; value: number; display: string; grad: [string, string]; show: boolean; href: string };

/**
 * سه حلقه‌ی روز (روتین/تمرین/کالری) — مشترک هیرو و کارت اشتراکی (DashboardShare).
 * `section` فقط فیلتر می‌کنه، فرمول‌ها یکی‌ان: دامنه‌ی اصلی (null) هر سه رو دارد؛ بخش
 * روتین فقط روتین؛ بخش ورزش فقط تمرین و کالری (حتی بدون برنامه/هدف، تا هیرو خالی
 * نمونه)؛ بخش ترید هیچ‌کدوم. کارت اشتراکی هم از همین خروجی می‌سازه، پس همیشه با هیرو یکیه.
 */
export function heroRings(data: DashboardData | null, stats: { completed: number; total: number }, routineLocked = false, section: SectionKey | null = null): HeroRing[] {
  const ex = data?.exercise;
  const cal = data?.calorie;
  // روزی که تمرین نداره (استراحت) حلقه کامله — هم‌قاعده‌ی تیک خودکار روز استراحت
  // (lib/exerciseStats.ts)؛ قبلا پیشرفت هفته رو نشون می‌داد و نصفه می‌موند.
  const exVal = ex?.today.isGymDay ? (ex.today.done ? 1 : ex.today.itemCount ? ex.today.doneItems / ex.today.itemCount : 0) : 1;
  const calVal = cal?.target?.kcal ? cal.today.kcal / cal.target.kcal : 0;
  const workout = section === "workout";
  return [
    { key: "routine", label: tr("روتین", "Routine"), value: stats.total ? stats.completed / stats.total : 0, display: stats.total ? `${faNum(stats.completed)}/${faNum(stats.total)}` : "—", grad: ["var(--ring-1a)", "var(--ring-1b)"], show: !routineLocked && (!section || section === "routine"), href: "/weekly" },
    { key: "exercise", label: tr("تمرین امروز", "Today's workout"), value: ex?.hasPlan ? exVal : 0, display: ex?.hasPlan ? (ex.today.isGymDay ? `${faNum(ex.today.doneItems)}/${faNum(ex.today.itemCount)}` : tr("استراحت", "Rest")) : "—", grad: ["var(--ring-2a)", "var(--ring-2b)"], show: workout || (!section && !!ex?.hasPlan), href: workout ? "/dashboard?tab=exercise" : "/exercise?tab=exercise" },
    { key: "calorie", label: tr("کالری", "Calories"), value: Math.min(calVal, 1), display: cal?.target ? `${faNum(Math.round(cal.today.kcal))}` : "—", grad: calVal > 1 ? ["var(--ring-3b)", "var(--ring-over)"] : ["var(--ring-3a)", "var(--ring-3b)"], show: workout || (!section && !!cal?.target), href: workout ? "/dashboard?tab=calorie" : "/exercise?tab=calorie" },
  ];
}

function daysLeft(iso: string) {
  return faNum(Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)));
}

// ── حلقه‌های هم‌مرکز ────────────────────────────────────────
// هر حلقه گرادیان دورانی خودش رو داره (GradientArc) + سر درخشان؛ رنگ‌ها از
// توکن‌های --ring-* در dashboard.css (دو پالت جدا برای شب و روز).
type LegendItem = { key: string; href: string; label: string; display: string; grad: [string, string] };

// ── خلاصه‌ی ترید (هیرو بخش ترید) ──────────────────────────
// فقط از همون داده‌ی GET /api/dashboard (trade/calendar) ساخته می‌شه؛ هیچ درخواست جدایی نیست.
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** حلقه‌ها: وین‌ریت ۳۰ روز و (اگه حسابی هدف داشته باشه) میانگین پیشرفت هدف حساب‌ها */
function tradeHeroRings(t: DashboardData["trade"]): { key: string; value: number; grad: [string, string] }[] {
  if (!t || t.accountCount === 0) return [{ key: "win", value: 0, grad: ["var(--ring-1a)", "var(--ring-1b)"] }];
  const out: { key: string; value: number; grad: [string, string] }[] = [{ key: "win", value: clamp01((t.month.winRate ?? 0) / 100), grad: ["var(--ring-1a)", "var(--ring-1b)"] }];
  const goals = t.accounts.map((a) => a.goalProgress).filter((g): g is number => g !== null);
  if (goals.length) out.push({ key: "goal", value: clamp01(goals.reduce((x, y) => x + y, 0) / goals.length), grad: ["var(--ring-2a)", "var(--ring-2b)"] });
  return out;
}

function tradeLegend(t: DashboardData["trade"]): LegendItem[] {
  const pct = "%";
  const dash = "—";
  const items: LegendItem[] = [
    { key: "win", href: "/trade/journal", label: tr("وین‌ریت", "Win rate"), display: t?.month.winRate == null ? dash : `${faNum(t.month.winRate)}${pct}`, grad: ["var(--ring-1a)", "var(--ring-1b)"] },
  ];
  const goals = t ? t.accounts.map((a) => a.goalProgress).filter((g): g is number => g !== null) : [];
  if (goals.length) items.push({ key: "goal", href: "/trade/journal", label: tr("هدف", "Goal"), display: `${faNum(Math.round((goals.reduce((x, y) => x + y, 0) / goals.length) * 100))}${pct}`, grad: ["var(--ring-2a)", "var(--ring-2b)"] });
  items.push({ key: "pf", href: "/trade/journal", label: tr("پرافیت فکتور", "Profit factor"), display: t?.month.profitFactor == null ? dash : faNum(t.month.profitFactor.toFixed(2)), grad: ["var(--ring-3a)", "var(--ring-3b)"] });
  items.push({ key: "open", href: "/trade/journal", label: tr("معامله‌ی باز", "Open trades"), display: t ? faNum(t.openTrades) : dash, grad: ["var(--ring-3a)", "var(--ring-3b)"] });
  return items;
}

/** وسط حلقه‌ها: سود/زیان امروز (جمع حساب‌های هم‌ارز) */
function tradeCenter(t: DashboardData["trade"]) {
  if (!t || t.accountCount === 0) return <><span className="db-orbit-pct">—</span><span className="db-orbit-cap">{tr("امروز", "Today")}</span></>;
  return (
    <>
      <span className={`db-orbit-pct db-orbit-money ${tone(t.today.pnl)}`} dir="ltr">{money(t.today.pnl, t.sumCurrency)}</span>
      <span className="db-orbit-cap">{tr("سود/زیان امروز", "Today's P&L")}</span>
    </>
  );
}

// ── حلقه‌های هم‌مرکز ────────────────────────────────────────
// هر حلقه گرادیان دورانی خودش رو داره (GradientArc) + سر درخشان؛ رنگ‌ها از
// توکن‌های --ring-* در dashboard.css (دو پالت جدا برای شب و روز).
// `center` (بخش ترید): محتوای دلخواه وسط به‌جای استریک. `unit`: برچسب زیر عدد استریک.
function OrbitRings({ rings, ready, streak, center, unit = "days" }: { rings: { key: string; value: number; grad: [string, string] }[]; ready: boolean; streak: number | null; center?: React.ReactNode; unit?: "days" | "sessions" }) {
  const size = 176, stroke = 13, gap = 5;
  return (
    <div className="db-orbit" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
        <defs>
          <filter id="db-orbit-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <g className="db-orbit-arcs">
          {rings.map((r, i) => (
            <GradientArc
              key={r.key}
              c={size / 2}
              r={size / 2 - stroke / 2 - i * (stroke + gap)}
              stroke={stroke}
              value={ready ? r.value : 0}
              from={r.grad[0]}
              to={r.grad[1]}
              delay={0.25 + i * 0.14}
            />
          ))}
        </g>
      </svg>
      <div className={`db-orbit-center${rings.length >= 3 ? " is-tight" : ""}`}>
        {center !== undefined ? (
          ready ? center : <Skel w={46} h={20} />
        ) : /* وسط حلقه‌ها استریک، نه درصد (درصد هر حلقه کنارش در لیجند هست) */ ready && streak !== null ? (
          <>
            <span className={`db-orbit-flame tier-${getStreakTier(streak).tier}`}><DashIcon name="flame" className="dbi-live" /></span>
            <CountUp value={streak} className="db-orbit-pct" />
            <span className="db-orbit-cap">{unit === "sessions" ? tr("جلسه", streak === 1 ? "session" : "sessions") : rings.length >= 3 ? tr("روز", "days") : tr("روز استریک", "day streak")}</span>
          </>
        ) : (
          <Skel w={46} h={20} />
        )}
      </div>
    </div>
  );
}

// ── نوار روز ────────────────────────────────────────────────
function toMin(v: string) {
  const [h, m] = v.split(":").map(Number);
  return h * 60 + m;
}

export function DayRibbon({ now, tasks, wake, sleep, configured, setHref = "/weekly" }: { now: Date | null; tasks: TodayTask[]; wake: string; sleep: string; configured: boolean; setHref?: string }) {
  const p = now ? awakeProgress(now, wake, sleep) : null;
  const w = toMin(wake);
  const span = ((toMin(sleep) <= w ? toMin(sleep) + 1440 : toMin(sleep)) - w) || 1440;
  const pos = (min: number) => {
    let m = min;
    if (m < w) m += 1440;
    return Math.max(0, Math.min(1, (m - w) / span));
  };
  const dots = tasks.filter((t) => t.startMin !== null);

  return (
    <div className="db-ribbon" aria-label={tr("نوار روز", "Day bar")}>
      <div className="db-ribbon-head">
        <span className="db-ribbon-end"><DashIcon name="sunrise" /> <span dir="ltr">{wake}</span></span>
        <span className="db-ribbon-left">
          <LiveClock />
          {!configured && <Link href={setHref} prefetch className="db-ribbon-set">{tr("تنظیم ساعت خواب", "Set sleep times")}</Link>}
        </span>
        <span className="db-ribbon-end"><span dir="ltr">{sleep}</span> <DashIcon name="bed" /></span>
      </div>
      <div className="db-ribbon-track">
        <motion.span
          className="db-ribbon-fill"
          initial={{ clipPath: isEn() ? "inset(0 100% 0 0)" : "inset(0 0 0 100%)" }}
          animate={{ clipPath: isEn() ? `inset(0 ${(1 - (p ?? 0)) * 100}% 0 0)` : `inset(0 0 0 ${(1 - (p ?? 0)) * 100}%)` }}
          transition={{ duration: 1.6, ease: D_EASE, delay: 0.3 }}
        />
        {dots.map((t, i) => (
          <motion.span
            key={t.id}
            className={`db-ribbon-dot${t.done ? " is-done" : ""}`}
            style={{ insetInlineStart: `${pos(t.startMin!) * 100}%` }}
            title={`${t.name} — ${t.time}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6 + i * 0.05, type: "spring", stiffness: 420, damping: 20 }}
          />
        ))}
        {p !== null && (
          <motion.span
            className="db-ribbon-sun"
            style={{ ["--sun-c" as any]: sunColor(p) }}
            initial={{ insetInlineStart: "0%", opacity: 0 }}
            animate={{ insetInlineStart: `${p * 100}%`, opacity: 1 }}
            transition={{ duration: 1.6, ease: D_EASE, delay: 0.3 }}
          >
            <span className="db-ribbon-sun-core" />
          </motion.span>
        )}
      </div>
    </div>
  );
}
