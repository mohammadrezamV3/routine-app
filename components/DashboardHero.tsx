"use client";

// هیروی داشبورد: سلامِ زمان‌محور، تاریخِ شمسی، یک جمله‌ی خلاصه‌ی «امروزت
// کجاست»، سه حلقه‌ی هم‌مرکزِ روز (روتین/تمرین/کالری) و «نوارِ روز» — مسیرِ
// بیداری تا خوابِ خودِ کاربر که خورشید روی ساعتِ فعلی می‌شینه و برنامه‌های
// امروز به‌شکلِ نقطه روش هستن (پر = انجام‌شده).

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FA_WEEKDAY, J_MONTHS, faNum, toJalali } from "@/lib/jalali";
import { awakeProgress, dayPhase, minutesUntilSleep, PHASE_GREETING, type DayPhase } from "@/lib/dashboardCompute";
import { getStreakTier } from "@/lib/streakTier";
import type { DashboardData } from "@/lib/dashboardTypes";
import type { TodayTask } from "@/lib/useDashboardRoutine";
import { DashIcon, type DashIconName } from "./DashboardIcons";
import { CountUp, D_EASE, GradientArc, Skel } from "./DashboardKit";

const PHASE_ICON: Record<DayPhase, DashIconName> = { dawn: "sunrise", day: "sun", dusk: "sunset", night: "moon" };

function useNow(stepMs = 30_000) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), stepMs);
    return () => clearInterval(t);
  }, [stepMs]);
  return now;
}

function hhmm(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function DashboardHero({
  data,
  routine,
  onOpenCommand,
  onShare,
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
  /** «اشتراکِ موفقیت» — پاپ‌آپِ DashboardShare */
  onShare?: () => void;
}) {
  const now = useNow();
  const phase = now ? dayPhase(now) : "day";
  const firstName = data?.user.name.split(" ")[0] ?? "";

  const dateLine = useMemo(() => {
    if (!now) return "";
    const [, jm, jd] = toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const jy = toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate())[0];
    return `${FA_WEEKDAY[now.getDay()]} ${faNum(jd)} ${J_MONTHS[jm - 1]} ${faNum(jy)}`;
  }, [now]);

  // ── سه حلقه ──
  const shownRings = heroRings(data, routine.stats).filter((r) => r.show);
  const ex = data?.exercise;
  const cal = data?.calorie;

  // ── جمله‌ی خلاصه ──
  const insight = useMemo(() => {
    const parts: string[] = [];
    const { completed, total } = routine.stats;
    if (!routine.ready) return null;
    if (total === 0) parts.push("امروز برنامه‌ای در روتینت نیست");
    else if (completed === total) parts.push("همه‌ی برنامه‌های امروز انجام شده");
    else parts.push(`${faNum(total - completed)} برنامه‌ی دیگه تا کامل‌شدنِ امروز`);
    if (ex?.hasPlan && ex.today.isGymDay && !ex.today.done) parts.push(ex.today.focus ? `تمرینِ امروز: ${ex.today.focus}` : "امروز روزِ تمرینه");
    if (cal?.target) {
      const left = Math.round(cal.target.kcal - cal.today.kcal);
      parts.push(left >= 0 ? `${faNum(left)} کالری تا هدف` : `${faNum(-left)} کالری بیشتر از هدف`);
    }
    return parts.join(" · ");
  }, [routine.ready, routine.stats, ex, cal]);

  const tier = getStreakTier(routine.streak);

  return (
    <motion.section className="db-hero" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: D_EASE }}>
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
              {firstName ? <>، <span className="db-hero-name">{firstName}</span></> : null}
            </h1>
            <p className="db-hero-date">
              {dateLine || <Skel w={140} h={12} />}
              {now && <span className="db-hero-clock" dir="ltr">{hhmm(now)}</span>}
            </p>
          </div>
        </div>

        <p className="db-hero-insight" aria-live="polite">{insight ?? <Skel w="70%" h={13} />}</p>

        <div className="db-hero-chips">
          <Link href="/weekly" prefetch className={`db-chip db-chip-streak tier-${tier.tier}`} title={tier.name}>
            <DashIcon name="flame" className="dbi-live" />
            {routine.streak === null ? <Skel w={24} h={10} /> : <><b>{faNum(routine.streak)}</b> روز پشتِ‌سرهم</>}
          </Link>
          {onShare && (
            <button type="button" className="db-chip db-chip-share" onClick={onShare} disabled={!routine.ready}>
              <DashIcon name="share" />
              اشتراکِ موفقیت
            </button>
          )}
          {data?.plan && (
            <Link href="/account/subscription" prefetch className="db-chip">
              <DashIcon name="card" />
              {data.plan.status === "TRIAL" ? "دوره‌ی آزمایشی" : data.plan.name}
              <span className="db-chip-sub">تا {daysLeft(data.plan.endsAt)} روزِ دیگه</span>
            </Link>
          )}
          {data && data.notifications.unread > 0 && (
            <span className="db-chip db-chip-bell">
              <DashIcon name="bell" className="dbi-live" />
              <b>{faNum(data.notifications.unread)}</b> اعلانِ تازه
            </span>
          )}
        </div>

        <button type="button" className="db-cmd-trigger" onClick={onOpenCommand} aria-label="جست‌وجو و دسترسیِ سریع">
          <DashIcon name="command" />
          <span>کجا بریم؟ جست‌وجو در همه‌ی بخش‌ها…</span>
          <span className="db-cmd-trigger-keys" aria-hidden="true"><kbd className="db-kbd">Ctrl</kbd><kbd className="db-kbd">K</kbd></span>
        </button>
      </div>

      <div className="db-hero-orbit" aria-label="پیشرفتِ امروز">
        <OrbitRings rings={shownRings} ready={routine.ready} />
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

/** سه حلقه‌ی روز (روتین/تمرین/کالری) — مشترکِ هیرو و کارتِ اشتراکی (DashboardShare) */
export function heroRings(data: DashboardData | null, stats: { completed: number; total: number }): HeroRing[] {
  const ex = data?.exercise;
  const cal = data?.calorie;
  const exVal = ex?.today.isGymDay ? (ex.today.done ? 1 : ex.today.itemCount ? ex.today.doneItems / ex.today.itemCount : 0) : ex?.week.target ? ex.week.done / ex.week.target : 0;
  const calVal = cal?.target?.kcal ? cal.today.kcal / cal.target.kcal : 0;
  return [
    { key: "routine", label: "روتین", value: stats.total ? stats.completed / stats.total : 0, display: stats.total ? `${faNum(stats.completed)}/${faNum(stats.total)}` : "—", grad: ["var(--ring-1a)", "var(--ring-1b)"], show: true, href: "/weekly" },
    { key: "exercise", label: ex?.today.isGymDay ? "تمرینِ امروز" : "تمرینِ هفته", value: exVal, display: ex ? (ex.today.isGymDay ? (ex.today.done ? "تمام" : `${faNum(ex.today.doneItems)}/${faNum(ex.today.itemCount)}`) : `${faNum(ex.week.done)}/${faNum(ex.week.target)}`) : "—", grad: ["var(--ring-2a)", "var(--ring-2b)"], show: !!ex?.hasPlan, href: "/exercise?tab=exercise" },
    { key: "calorie", label: "کالری", value: Math.min(calVal, 1), display: cal?.target ? `${faNum(Math.round(cal.today.kcal))}` : "—", grad: calVal > 1 ? ["var(--ring-3b)", "var(--ring-over)"] : ["var(--ring-3a)", "var(--ring-3b)"], show: !!cal?.target, href: "/exercise?tab=calorie" },
  ];
}

function daysLeft(iso: string) {
  return faNum(Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)));
}

// ── حلقه‌های هم‌مرکز ────────────────────────────────────────
// هر حلقه گرادیانِ دورانیِ خودش رو داره (GradientArc) + سرِ درخشان؛ رنگ‌ها از
// توکن‌های --ring-* در dashboard.css (دو پالتِ جدا برای شب و روز).
function OrbitRings({ rings, ready }: { rings: { key: string; value: number; grad: [string, string] }[]; ready: boolean }) {
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
      <div className="db-orbit-center">
        {main && ready ? (
          <>
            <CountUp value={Math.round(Math.min(1, main.value) * 100)} suffix="٪" className="db-orbit-pct" />
            <span className="db-orbit-cap">امروز</span>
          </>
        ) : (
          <Skel w={46} h={20} />
        )}
      </div>
    </div>
  );
}

// ── نوارِ روز ────────────────────────────────────────────────
function toMin(v: string) {
  const [h, m] = v.split(":").map(Number);
  return h * 60 + m;
}

function DayRibbon({ now, tasks, wake, sleep, configured }: { now: Date | null; tasks: TodayTask[]; wake: string; sleep: string; configured: boolean }) {
  const p = now ? awakeProgress(now, wake, sleep) : null;
  const left = now ? minutesUntilSleep(now, wake, sleep) : null;
  const w = toMin(wake);
  const span = ((toMin(sleep) <= w ? toMin(sleep) + 1440 : toMin(sleep)) - w) || 1440;
  const pos = (min: number) => {
    let m = min;
    if (m < w) m += 1440;
    return Math.max(0, Math.min(1, (m - w) / span));
  };
  const dots = tasks.filter((t) => t.startMin !== null);
  const leftLabel = left === null ? "" : left === 0 ? "وقتِ استراحته" : left < 60 ? `${faNum(left)} دقیقه تا پایانِ روزت` : `${faNum(Math.floor(left / 60))} ساعت${left % 60 ? ` و ${faNum(left % 60)} دقیقه` : ""} تا پایانِ روزت`;

  return (
    <div className="db-ribbon" aria-label="نوارِ روز">
      <div className="db-ribbon-head">
        <span className="db-ribbon-end"><DashIcon name="sunrise" /> <span dir="ltr">{wake}</span></span>
        <span className="db-ribbon-left">
          {leftLabel}
          {!configured && <Link href="/weekly" prefetch className="db-ribbon-set">تنظیمِ ساعتِ خواب</Link>}
        </span>
        <span className="db-ribbon-end"><span dir="ltr">{sleep}</span> <DashIcon name="bed" /></span>
      </div>
      <div className="db-ribbon-track">
        <motion.span
          className="db-ribbon-fill"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: p ?? 0 }}
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
