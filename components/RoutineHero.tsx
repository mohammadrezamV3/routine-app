"use client";

// هیروی «روتین من» (/weekly) — هم‌خانواده‌ی هیروی داشبورد: بوردرِ نورانیِ چرخان
// و هاله‌ی دنبال‌کننده‌ی موس، حلقه‌ی پیشرفتِ امروز (همون GradientRing ِ کلِ اپ)،
// چیپِ استریک (→ /streak) و «نوارِ روز» با ساعتِ زنده و نورِ زردِ صبح تا بنفشِ شب.
// داده از useDashboardRoutine (همون lib/storage و همون تعریفِ استریکِ هدر/داشبورد).

import "@/app/dashboard/dashboard.css";
import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { FA_WEEKDAY, J_MONTHS, toJalali } from "@/lib/jalali";
import { dayPhase, type DayPhase } from "@/lib/dashboardCompute";
import { getStreakTier } from "@/lib/streakTier";
import { useDashboardRoutine } from "@/lib/useDashboardRoutine";
import { DashIcon, type DashIconName } from "./DashboardIcons";
import { CountUp, D_EASE, Skel } from "./DashboardKit";
import { DayRibbon, useNow } from "./DashboardHero";
import { GradientRing, RING_GREEN } from "./GradientRing";

const PHASE_ICON: Record<DayPhase, DashIconName> = { dawn: "sunrise", day: "sun", dusk: "sunset", night: "moon" };

export function RoutineHero() {
  const routine = useDashboardRoutine();
  const now = useNow();
  const phase = now ? dayPhase(now) : "day";
  const ref = useRef<HTMLElement>(null);

  // همون نورِ دنبال‌کننده‌ی موسِ کارت‌های داشبورد
  useEffect(() => {
    const el = ref.current;
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

  const dateLine = useMemo(() => {
    if (!now) return "";
    const [jy, jm, jd] = toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    return `${FA_WEEKDAY[now.getDay()]} ${jd} ${J_MONTHS[jm - 1]} ${jy}`;
  }, [now]);

  const { completed, total } = routine.stats;
  const frac = total ? completed / total : 0;
  const tier = getStreakTier(routine.streak);
  const insight = !routine.ready
    ? null
    : total === 0
      ? "امروز برنامه‌ای نداری — از پایین یکی اضافه کن"
      : completed === total
        ? "همه‌ی برنامه‌های امروز انجام شد — استریک همین الان حساب شد"
        : `${total - completed} برنامه‌ی دیگه تا کامل‌شدنِ امروز`;

  return (
    <div className="db-hero-scope">
      <motion.section ref={ref as never} className="db-hero rt-hero" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: D_EASE }}>
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
              <h1 className="db-hero-title">روتین من</h1>
              <p className="db-hero-date">{dateLine || <Skel w={140} h={12} />}</p>
            </div>
          </div>
          <p className="db-hero-insight" aria-live="polite">{insight ?? <Skel w="70%" h={13} />}</p>
          <div className="db-hero-chips">
            <Link href="/streak" prefetch className={`db-chip db-chip-streak tier-${tier.tier}`} title={tier.name}>
              <DashIcon name="flame" className="dbi-live" />
              {routine.streak === null ? <Skel w={24} h={10} /> : <><b>{routine.streak}</b> روز پشتِ‌سرهم</>}
            </Link>
            <Link href="/streak" prefetch className="db-chip">
              <DashIcon name="trophy" /> اچیومنت‌ها
            </Link>
            <Link href="/sleep" prefetch className="db-chip">
              <DashIcon name="moon" /> خواب
            </Link>
          </div>
        </div>

        <div className="db-hero-orbit rt-hero-orbit" aria-label="پیشرفتِ امروز">
          <GradientRing value={routine.ready ? frac : 0} size={150} stroke={13} grad={RING_GREEN} delay={0.25}>
            {routine.ready ? (
              <span className="rt-hero-center">
                <CountUp value={Math.round(frac * 100)} suffix="٪" className="db-orbit-pct" />
                <span className="db-orbit-cap">{total ? `${completed}/${total}` : "امروز"}</span>
              </span>
            ) : <Skel w={46} h={20} />}
          </GradientRing>
        </div>

        <DayRibbon now={now} tasks={routine.tasks} wake={routine.wakeSleep.wake} sleep={routine.wakeSleep.sleep} configured={routine.hasWakeSleep} />
      </motion.section>
    </div>
  );
}
