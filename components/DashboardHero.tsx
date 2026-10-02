"use client";

// هیروی داشبورد: سلام زمان‌محور، تاریخ شمسی، یک جمله‌ی خلاصه‌ی «امروزت
// کجاست»، سه حلقه‌ی هم‌مرکز روز (روتین/تمرین/کالری) و «نوار روز» — مسیر
// بیداری تا خواب خود کاربر که خورشید روی ساعت فعلی می‌شینه و برنامه‌های
// امروز به‌شکل نقطه روش هستن (پر = انجام‌شده).

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FA_WEEKDAY, J_MONTHS, faNum, toJalali } from "@/lib/jalali";
import { awakeProgress, dayPhase, PHASE_GREETING, type DayPhase } from "@/lib/dashboardCompute";
import { getStreakTier } from "@/lib/streakTier";
import type { DashboardData } from "@/lib/dashboardTypes";
import type { TodayTask } from "@/lib/useDashboardRoutine";
import { DashIcon, type DashIconName } from "./DashboardIcons";
import { GoldenName } from "./GoldenName";
import { Spinner } from "./Spinner";
import { ROUTINE_PLAN_KEY } from "@/lib/trial";
import { CountUp, D_EASE, GradientArc, Skel } from "./DashboardKit";

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
    <span className="db-ribbon-clock" dir="ltr" role="timer" aria-label="ساعت فعلی">
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
  onOpenCommand,
  onShare,
  routineLocked = false,
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
  onOpenCommand: () => void;
  /** «اشتراک موفقیت» — پاپ‌آپ DashboardShare */
  onShare?: () => void;
  routineLocked?: boolean;
}) {
  const now = useNow();
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
    return `${FA_WEEKDAY[now.getDay()]} ${faNum(jd)} ${J_MONTHS[jm - 1]} ${faNum(jy)}`;
  }, [now]);

  // ── سه حلقه ──
  const shownRings = heroRings(data, routine.stats, routineLocked).filter((r) => r.show);
  const ex = data?.exercise;
  const cal = data?.calorie;

  // ── جمله‌ی خلاصه ──
  const insight = useMemo(() => {
    const parts: string[] = [];
    const { completed, total } = routine.stats;
    if (!routine.ready) return null;
    if (total === 0) parts.push("امروز برنامه‌ای در روتینت نیست");
    else if (completed === total) parts.push("همه‌ی برنامه‌های امروز انجام شده");
    else parts.push(`${faNum(total - completed)} برنامه‌ی دیگه تا کامل‌شدن امروز`);
    if (ex?.hasPlan && ex.today.isGymDay && !ex.today.done) parts.push(ex.today.focus ? `تمرین امروز: ${ex.today.focus}` : "امروز روز تمرینه");
    if (cal?.target) {
      const left = Math.round(cal.target.kcal - cal.today.kcal);
      parts.push(left >= 0 ? `${faNum(left)} کالری تا هدف` : `${faNum(-left)} کالری بیشتر از هدف`);
    }
    return parts.join(" · ");
  }, [routine.ready, routine.stats, ex, cal]);


  return (
    <motion.section ref={heroRef as any} className="db-hero" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: D_EASE }}>
      {onShare && (
        // اشتراک موفقیت — فقط آیکون، گوشه‌ی بالا-چپ هیرو. تا روتین امروز خونده
        // نشده کارت عدد درستی نداره: غیرفعال با دایره‌ی لودینگ به‌جای آیکون.
        <button
          type="button"
          className="db-hero-share"
          onClick={onShare}
          disabled={!routine.ready}
          aria-haspopup="dialog"
          aria-busy={!routine.ready || undefined}
          aria-label="اشتراک موفقیت امروز با دوستات"
          title="اشتراک موفقیت"
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
              {PHASE_GREETING[phase]}
              {firstName ? <>، <GoldenName golden={data?.user.golden} staff={data?.user.staff}><span className="db-hero-name">{firstName}</span></GoldenName></> : null}
            </h1>
            <p className="db-hero-date">
              {dateLine || <Skel w={140} h={12} />}
            </p>
          </div>
        </div>

        <p className="db-hero-insight" aria-live="polite">{insight ?? <Skel w="70%" h={13} />}</p>

        <div className="db-hero-chips">
          {data?.routineTrial && (
            <Link href={`/subscription/checkout?plan=${ROUTINE_PLAN_KEY}&duration=1`} prefetch={false} className={`db-chip db-chip-trial${data.routineTrial.daysLeft <= 3 ? " is-urgent" : ""}`}>
              <DashIcon name="routine" />
              روتین من: <b>{faNum(data.routineTrial.daysLeft)}</b> روز رایگان مونده
            </Link>
          )}
          {routineLocked && (
            <Link href={`/subscription/checkout?plan=${ROUTINE_PLAN_KEY}&duration=1`} prefetch={false} className="db-chip db-chip-trial is-urgent">
              <DashIcon name="lock" />
              خرید «روتین من»
            </Link>
          )}
          {data?.plan && (
            <Link href="/account/subscription" prefetch className="db-chip">
              <DashIcon name="card" />
              {data.plan.status === "TRIAL" ? "دوره‌ی آزمایشی" : data.plan.name}
              <span className="db-chip-sub">تا {daysLeft(data.plan.endsAt)} روز دیگه</span>
            </Link>
          )}
        </div>

        <button type="button" className="db-cmd-trigger" onClick={onOpenCommand} aria-label="جست‌وجو و دسترسی سریع">
          <DashIcon name="command" />
          <span>کجا بریم؟ جست‌وجو در همه‌ی بخش‌ها…</span>
          <span className="db-cmd-trigger-keys" aria-hidden="true"><kbd className="db-kbd">Ctrl</kbd><kbd className="db-kbd">K</kbd></span>
        </button>
      </div>

      <div className="db-hero-orbit" aria-label="پیشرفت امروز">
        <OrbitRings rings={shownRings} ready={routine.ready} streak={routine.streak} />
        <ul className="db-orbit-legend">
          {shownRings.map((r, i) => (
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

      <DayRibbon now={now} tasks={routine.tasks} wake={routine.wakeSleep.wake} sleep={routine.wakeSleep.sleep} configured={routine.hasWakeSleep} />
    </motion.section>
  );
}

export type HeroRing = { key: "routine" | "exercise" | "calorie"; label: string; value: number; display: string; grad: [string, string]; show: boolean; href: string };

/** سه حلقه‌ی روز (روتین/تمرین/کالری) — مشترک هیرو و کارت اشتراکی (DashboardShare) */
export function heroRings(data: DashboardData | null, stats: { completed: number; total: number }, routineLocked = false): HeroRing[] {
  const ex = data?.exercise;
  const cal = data?.calorie;
  // روزی که تمرین نداره (استراحت) حلقه کامله — هم‌قاعده‌ی تیک خودکار روز استراحت
  // (lib/exerciseStats.ts)؛ قبلا پیشرفت هفته رو نشون می‌داد و نصفه می‌موند.
  const exVal = ex?.today.isGymDay ? (ex.today.done ? 1 : ex.today.itemCount ? ex.today.doneItems / ex.today.itemCount : 0) : 1;
  const calVal = cal?.target?.kcal ? cal.today.kcal / cal.target.kcal : 0;
  return [
    { key: "routine", label: "روتین", value: stats.total ? stats.completed / stats.total : 0, display: stats.total ? `${faNum(stats.completed)}/${faNum(stats.total)}` : "—", grad: ["var(--ring-1a)", "var(--ring-1b)"], show: !routineLocked, href: "/weekly" },
    { key: "exercise", label: "تمرین امروز", value: exVal, display: ex ? (ex.today.isGymDay ? `${faNum(ex.today.doneItems)}/${faNum(ex.today.itemCount)}` : "استراحت") : "—", grad: ["var(--ring-2a)", "var(--ring-2b)"], show: !!ex?.hasPlan, href: "/exercise?tab=exercise" },
    { key: "calorie", label: "کالری", value: Math.min(calVal, 1), display: cal?.target ? `${faNum(Math.round(cal.today.kcal))}` : "—", grad: calVal > 1 ? ["var(--ring-3b)", "var(--ring-over)"] : ["var(--ring-3a)", "var(--ring-3b)"], show: !!cal?.target, href: "/exercise?tab=calorie" },
  ];
}

function daysLeft(iso: string) {
  return faNum(Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)));
}

// ── حلقه‌های هم‌مرکز ────────────────────────────────────────
// هر حلقه گرادیان دورانی خودش رو داره (GradientArc) + سر درخشان؛ رنگ‌ها از
// توکن‌های --ring-* در dashboard.css (دو پالت جدا برای شب و روز).
function OrbitRings({ rings, ready, streak }: { rings: { key: string; value: number; grad: [string, string] }[]; ready: boolean; streak: number | null }) {
  const size = 176, stroke = 13, gap = 5;
  const main = rings[0];
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
        {/* وسط حلقه‌ها استریک، نه درصد (درصد هر حلقه کنارش در لیجند هست) */}
        {main && ready && streak !== null ? (
          <>
            <span className={`db-orbit-flame tier-${getStreakTier(streak).tier}`}><DashIcon name="flame" className="dbi-live" /></span>
            <CountUp value={streak} className="db-orbit-pct" />
            <span className="db-orbit-cap">{rings.length >= 3 ? "روز" : "روز استریک"}</span>
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

export function DayRibbon({ now, tasks, wake, sleep, configured }: { now: Date | null; tasks: TodayTask[]; wake: string; sleep: string; configured: boolean }) {
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
    <div className="db-ribbon" aria-label="نوار روز">
      <div className="db-ribbon-head">
        <span className="db-ribbon-end"><DashIcon name="sunrise" /> <span dir="ltr">{wake}</span></span>
        <span className="db-ribbon-left">
          <LiveClock />
          {!configured && <Link href="/weekly" prefetch className="db-ribbon-set">تنظیم ساعت خواب</Link>}
        </span>
        <span className="db-ribbon-end"><span dir="ltr">{sleep}</span> <DashIcon name="bed" /></span>
      </div>
      <div className="db-ribbon-track">
        <motion.span
          className="db-ribbon-fill"
          initial={{ clipPath: "inset(0 0 0 100%)" }}
          animate={{ clipPath: `inset(0 0 0 ${(1 - (p ?? 0)) * 100}%)` }}
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
