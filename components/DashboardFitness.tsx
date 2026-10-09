"use client";

// کارت‌های «تمرین» و «کالری» داشبورد. داده از /api/dashboard؛ هر نوشتنی
// (شروع تمرین، ثبت غذا) در صفحه‌ی خود همون بخش انجام می‌شه و رویداد زنده
// (exercise/calorie) این کارت‌ها رو خودکار تازه می‌کنه.

import Link from "next/link";
import { motion } from "framer-motion";
import { weekdayShort, weekdayName, faNum } from "@/lib/jalali";
import type { DashCalorie, DashExercise } from "@/lib/dashboardTypes";
import { BentoCard, CardHead, CountUp, D_EASE, EmptyState, Meter, Ring, Skel } from "./DashboardKit";
import { DashIcon } from "./DashboardIcons";
import { useDashAction } from "./DashboardActions";
import { TickButton } from "./TickButton";
import { tr, isEn } from "@/lib/i18n";

// ── تمرین ───────────────────────────────────────────────────
export function DashboardExercise({ ex, loading }: { ex: DashExercise | null; loading: boolean }) {
  return (
    <BentoCard area="ex" className="db-ex" label={tr("تمرین", "Workout")}>
      <CardHead icon="dumbbell" title={tr("تمرین", "Workout")} href="/exercise?tab=exercise" hrefLabel={tr("برنامه", "Plan")} />
      {loading ? (
        <FitSkel />
      ) : !ex?.hasPlan ? (
        <EmptyState icon="dumbbell" text={tr("هنوز برنامه‌ی تمرینی نداری — با هوش مصنوعی در یک دقیقه بساز.", "You do not have a workout plan yet — build one with AI in a minute.")} href="/exercise?tab=exercise" cta={tr("ساخت برنامه", "Build plan")} />
      ) : (
        <ExerciseBody ex={ex} />
      )}
    </BentoCard>
  );
}

function ExerciseBody({ ex }: { ex: DashExercise }) {
  const t = ex.today;
  // حلقه از حرکت‌های واقعا تیک‌خورده ساخته می‌شه، نه از «پایان تمرین»
  const frac = t.itemCount ? t.doneItems / t.itemCount : t.done ? 1 : 0;
  const state = !t.isGymDay ? "rest" : t.done ? "done" : t.started ? "going" : "todo";
  const cta = { rest: tr("مشاهده‌ی برنامه", "View plan"), done: tr("مرور تمرین", "Review workout"), going: tr("ادامه‌ی تمرین", "Continue workout"), todo: tr("شروع تمرین", "Start workout") }[state];
  const lastIso = ex.last14[ex.last14.length - 1]?.iso;
  const todayName = isEn() && lastIso ? (([y, m, d]) => weekdayName(new Date(y, m - 1, d).getDay()))(lastIso.split("-").map(Number)) : t.dayName;
  return (
    <div className="db-fit">
      <div className="db-fit-top">
        <Ring value={t.isGymDay ? frac : ex.week.target ? ex.week.done / ex.week.target : 0} size={74} stroke={7} grad={["var(--ring-2a)", "var(--ring-2b)"]}>
          {state === "done" ? <DashIcon name="trophy" className="dbi-live db-fit-trophy" /> : t.isGymDay ? <b className="db-fit-ring-num">{faNum(t.doneItems)}<small>/{faNum(t.itemCount)}</small></b> : <DashIcon name="bed" className="dbi-live db-fit-rest" />}
        </Ring>
        <div className="db-fit-info">
          <span className="db-fit-kicker">{t.isGymDay ? tr(`امروز، ${t.dayName}`, `Today, ${todayName}`) : tr("امروز روز استراحته", "Today is a rest day")}</span>
          <strong className="db-fit-title">{t.isGymDay ? (t.focus ?? tr("تمرین امروز", "Today's workout")) : tr("ریکاوری و خواب کافی", "Recovery and enough sleep")}</strong>
          <span className="db-fit-sub">
            <DashIcon name="flame" className="db-fit-flame" /> {tr(`${faNum(ex.streak)} جلسه‌ی پشت‌سرهم · ${faNum(ex.week.done)}/${faNum(ex.week.target)} این هفته`, `${ex.streak} ${ex.streak === 1 ? "session" : "sessions"} in a row · ${ex.week.done}/${ex.week.target} this week`)}
          </span>
        </div>
      </div>

      <div className="db-week-dots" aria-label={tr("14 روز اخیر", "Last 14 days")}>
        {ex.last14.map((d, i) => {
          const [y, m, dd] = d.iso.split("-").map(Number);
          const wd = weekdayShort(new Date(y, m - 1, dd).getDay());
          const isToday = i === ex.last14.length - 1;
          return (
            <span key={d.iso} className={`db-wdot${d.done ? " is-done" : d.planned ? " is-planned" : ""}${d.rest ? " is-rest" : ""}${isToday ? " is-today" : ""}`} title={d.rest ? `${d.iso} · ${tr("استراحت", "Rest")}` : d.iso}>
              <motion.i initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 + i * 0.03, type: "spring", stiffness: 500, damping: 22 }} />
              {i >= 7 && <em>{wd}</em>}
            </span>
          );
        })}
      </div>

      {t.isGymDay && (t.items ?? []).length > 0 && (
        <ul className="db-ex-items" aria-label={tr("حرکت‌های امروز", "Today's exercises")}>
          {t.items.map((it, i) => (
            <motion.li key={it.name + i} className={it.done ? "is-done" : t.done ? "is-missed" : ""} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 + i * 0.04 }}>
              <TickButton as="span" tone="exercise" size={18} checked={!!it.done} state={!it.done && t.done ? "missed" : "idle"} />
              <span className="db-ex-name">{it.name}</span>
            </motion.li>
          ))}
          {t.itemCount > t.items.length && <li className="db-ex-more">{tr(`+${faNum(t.itemCount - t.items.length)} حرکت دیگه`, `+${t.itemCount - t.items.length} more`)}</li>}
        </ul>
      )}

      <Link href="/exercise?tab=exercise" prefetch className={state === "todo" || state === "going" ? "trade-primary-btn db-fit-cta" : "account-outline-btn mentor-btn db-fit-cta"}>
        {state === "todo" || state === "going" ? <DashIcon name="dumbbell" className="dbi-live" /> : null}
        {cta}
      </Link>
    </div>
  );
}

// ── کالری ───────────────────────────────────────────────────
export function DashboardCalorie({ cal, loading }: { cal: DashCalorie | null; loading: boolean }) {
  return (
    <BentoCard area="cal" className="db-cal" label={tr("کالری", "Calories")}>
      <CardHead icon="apple" title={tr("کالری", "Calories")} href="/exercise?tab=calorie" hrefLabel={tr("کالری‌شمار", "Calorie tracker")} />
      {loading ? (
        <FitSkel />
      ) : !cal ? null : !cal.target ? (
        <EmptyState icon="target" text={tr("هدف کالریت رو تعیین کن تا پیشرفت روزانه‌ت این‌جا بیاد.", "Set your calorie goal to see your daily progress here.")} href="/exercise?tab=calorie" cta={tr("تعیین هدف", "Set goal")} />
      ) : (
        <CalorieBody cal={cal} />
      )}
    </BentoCard>
  );
}

function CalorieBody({ cal }: { cal: DashCalorie }) {
  const run = useDashAction();
  const target = cal.target!;
  const frac = target.kcal ? cal.today.kcal / target.kcal : 0;
  const over = frac > 1;
  const left = Math.round(target.kcal - cal.today.kcal);
  const maxWeek = Math.max(target.kcal, ...cal.week.map((w) => w.kcal), 1);
  const gdeg = isEn() ? 90 : 270;
  const macros = [
    { key: "p", label: tr("پروتئین", "Protein"), val: cal.today.protein, target: target.protein, color: `linear-gradient(${gdeg}deg, var(--ring-2a), var(--ring-2b))` },
    { key: "c", label: tr("کربو", "Carbs"), val: cal.today.carbs, target: target.carbs, color: `linear-gradient(${gdeg}deg, var(--ring-3a), var(--ring-3b))` },
    { key: "f", label: tr("چربی", "Fat"), val: cal.today.fat, target: target.fat, color: `linear-gradient(${gdeg}deg, var(--ring-1a), var(--ring-1b))` },
  ];
  return (
    <div className="db-fit">
      <div className="db-gauge-wrap">
        <Gauge value={Math.min(frac, 1)} over={over} />
        <div className="db-gauge-center">
          <CountUp value={cal.today.kcal} className="db-gauge-num" />
          <span className="db-gauge-cap">{tr(`از ${faNum(target.kcal)} کالری`, `of ${target.kcal} kcal`)}</span>
          <span className={`db-gauge-left${over ? " is-over" : ""}`}>{left >= 0 ? tr(`${faNum(left)} مونده`, `${left} left`) : tr(`${faNum(-left)} بیشتر`, `${-left} over`)}</span>
        </div>
      </div>

      <div className="db-macros">
        {macros.map((m, i) => (
          <div key={m.key} className="db-macro">
            <span className="db-macro-head"><span>{m.label}</span><b>{faNum(m.val)}{m.target ? <small>/{faNum(m.target)}g</small> : <small>g</small>}</b></span>
            <Meter value={m.target ? m.val / m.target : 0} color={m.color} delay={0.4 + i * 0.08} />
          </div>
        ))}
      </div>

      <div className="db-kbars" aria-label={tr("7 روز اخیر", "Last 7 days")}>
        {cal.week.map((w, i) => {
          const [y, m, d] = w.iso.split("-").map(Number);
          const wd = weekdayShort(new Date(y, m - 1, d).getDay());
          const h = w.kcal / maxWeek;
          const ok = w.kcal > 0 && w.kcal <= target.kcal;
          return (
            <span key={w.iso} className={`db-kbar${i === cal.week.length - 1 ? " is-today" : ""}`} title={tr(`${faNum(w.kcal)} کالری`, `${w.kcal} kcal`)}>
              <span className="db-kbar-track">
                <motion.i className={ok ? "is-ok" : w.kcal > target.kcal ? "is-over" : ""} initial={{ scaleY: 0 }} animate={{ scaleY: Math.max(h, 0.04) }} transition={{ duration: 0.8, ease: D_EASE, delay: 0.3 + i * 0.05 }} />
                <span className="db-kbar-target" style={{ bottom: `${(target.kcal / maxWeek) * 100}%` }} />
              </span>
              <em>{wd}</em>
            </span>
          );
        })}
      </div>

      {run ? (
        <button type="button" onClick={() => run("food")} className="account-outline-btn mentor-btn db-fit-cta">
          <DashIcon name="plus" className="dbi-live" /> {tr("ثبت غذا", "Log food")}
        </button>
      ) : (
        <Link href="/exercise?tab=calorie" prefetch className="account-outline-btn mentor-btn db-fit-cta">
          <DashIcon name="plus" className="dbi-live" /> {tr("ثبت غذا", "Log food")}
        </Link>
      )}
    </div>
  );
}

/** نیم‌دایره‌ی کالری — قوس ۲۴۰ درجه با گرادیان طول‌مسیر */
function Gauge({ value, over }: { value: number; over: boolean }) {
  const size = 150, stroke = 11, r = (size - stroke) / 2, c = size / 2;
  const a0 = (150 * Math.PI) / 180, a1 = (390 * Math.PI) / 180;
  const pt = (a: number) => `${c + r * Math.cos(a)} ${c + r * Math.sin(a)}`;
  const d = `M${pt(a0)} A${r} ${r} 0 1 1 ${pt(a1)}`;
  return (
    <svg className="db-gauge" viewBox={`0 0 ${size} ${size * 0.78}`} width={size} aria-hidden="true">
      <defs>
        <linearGradient id="db-gauge-g" x1="0" x2="1">
          <stop offset="0%" style={{ stopColor: "var(--ring-3a)" }} />
          <stop offset="100%" style={{ stopColor: over ? "var(--ring-over)" : "var(--ring-3b)" }} />
        </linearGradient>
      </defs>
      <path d={d} fill="none" strokeWidth={stroke} strokeLinecap="round" style={{ stroke: "color-mix(in srgb, var(--ring-3a) 16%, transparent)" }} />
      <motion.path d={d} fill="none" stroke="url(#db-gauge-g)" strokeWidth={stroke} strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: Math.max(0.0001, value) }} transition={{ duration: 1.3, ease: D_EASE, delay: 0.2 }} />
    </svg>
  );
}

function FitSkel() {
  return (
    <div className="db-fit">
      <div className="db-fit-top"><Skel w={74} h={74} r={40} /><div style={{ flex: 1, display: "grid", gap: 8 }}><Skel w="40%" h={10} /><Skel w="70%" h={14} /><Skel w="55%" h={10} /></div></div>
      <Skel w="100%" h={36} r={10} />
    </div>
  );
}
