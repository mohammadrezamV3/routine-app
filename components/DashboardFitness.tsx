"use client";

// کارت‌های «تمرین» و «کالری» داشبورد. داده از /api/dashboard؛ هر نوشتنی
// (شروع تمرین، ثبت غذا) در صفحه‌ی خود همون بخش انجام می‌شه و رویداد زنده
// (exercise/calorie) این کارت‌ها رو خودکار تازه می‌کنه.

import Link from "next/link";
import { motion } from "framer-motion";
import { FA_WEEKDAY_SHORT, faNum } from "@/lib/jalali";
import type { DashCalorie, DashExercise } from "@/lib/dashboardTypes";
import { BentoCard, CardHead, CountUp, D_EASE, EmptyState, Meter, Ring, Skel } from "./DashboardKit";
import { DashIcon } from "./DashboardIcons";
import { useDashAction } from "./DashboardActions";
import { TickButton } from "./TickButton";

// ── تمرین ───────────────────────────────────────────────────
export function DashboardExercise({ ex, loading }: { ex: DashExercise | null; loading: boolean }) {
  return (
    <BentoCard area="ex" className="db-ex" label="تمرین">
      <CardHead icon="dumbbell" title="تمرین" href="/exercise?tab=exercise" hrefLabel="برنامه" />
      {loading ? (
        <FitSkel />
      ) : !ex?.hasPlan ? (
        <EmptyState icon="dumbbell" text="هنوز برنامه‌ی تمرینی نداری — با هوش مصنوعی در یک دقیقه بساز." href="/exercise?tab=exercise" cta="ساخت برنامه" />
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
  const cta = { rest: "مشاهده‌ی برنامه", done: "مرور تمرین", going: "ادامه‌ی تمرین", todo: "شروع تمرین" }[state];
  return (
    <div className="db-fit">
      <div className="db-fit-top">
        <Ring value={t.isGymDay ? frac : ex.week.target ? ex.week.done / ex.week.target : 0} size={74} stroke={7} grad={["var(--ring-2a)", "var(--ring-2b)"]}>
          {state === "done" ? <DashIcon name="trophy" className="dbi-live db-fit-trophy" /> : t.isGymDay ? <b className="db-fit-ring-num">{faNum(t.doneItems)}<small>/{faNum(t.itemCount)}</small></b> : <DashIcon name="bed" className="dbi-live db-fit-rest" />}
        </Ring>
        <div className="db-fit-info">
          <span className="db-fit-kicker">{t.isGymDay ? `امروز، ${t.dayName}` : "امروز روز استراحته"}</span>
          <strong className="db-fit-title">{t.isGymDay ? (t.focus ?? "تمرین امروز") : "ریکاوری و خواب کافی"}</strong>
          <span className="db-fit-sub">
            <DashIcon name="flame" className="db-fit-flame" /> {faNum(ex.streak)} جلسه‌ی پشت‌سرهم · {faNum(ex.week.done)}/{faNum(ex.week.target)} این هفته
          </span>
        </div>
      </div>

      <div className="db-week-dots" aria-label="14 روز اخیر">
        {ex.last14.map((d, i) => {
          const [y, m, dd] = d.iso.split("-").map(Number);
          const wd = FA_WEEKDAY_SHORT[new Date(y, m - 1, dd).getDay()];
          const isToday = i === ex.last14.length - 1;
          return (
            <span key={d.iso} className={`db-wdot${d.done ? " is-done" : d.planned ? " is-planned" : ""}${d.rest ? " is-rest" : ""}${isToday ? " is-today" : ""}`} title={d.rest ? `${d.iso} · استراحت` : d.iso}>
              <motion.i initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 + i * 0.03, type: "spring", stiffness: 500, damping: 22 }} />
              {i >= 7 && <em>{wd}</em>}
            </span>
          );
        })}
      </div>

      {t.isGymDay && (t.items ?? []).length > 0 && (
        <ul className="db-ex-items" aria-label="حرکت‌های امروز">
          {t.items.map((it, i) => (
            <motion.li key={it.name + i} className={it.done ? "is-done" : t.done ? "is-missed" : ""} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 + i * 0.04 }}>
              <TickButton as="span" size={18} checked={!!it.done} state={!it.done && t.done ? "missed" : "idle"} />
              <span className="db-ex-name">{it.name}</span>
            </motion.li>
          ))}
          {t.itemCount > t.items.length && <li className="db-ex-more">+{faNum(t.itemCount - t.items.length)} حرکت دیگه</li>}
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
    <BentoCard area="cal" className="db-cal" label="کالری">
      <CardHead icon="apple" title="کالری" href="/exercise?tab=calorie" hrefLabel="کالری‌شمار" />
      {loading ? (
        <FitSkel />
      ) : !cal ? null : !cal.target ? (
        <EmptyState icon="target" text="هدف کالریت رو تعیین کن تا پیشرفت روزانه‌ت این‌جا بیاد." href="/exercise?tab=calorie" cta="تعیین هدف" />
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
  const macros = [
    { key: "p", label: "پروتئین", val: cal.today.protein, target: target.protein, color: "linear-gradient(270deg, var(--ring-2a), var(--ring-2b))" },
    { key: "c", label: "کربو", val: cal.today.carbs, target: target.carbs, color: "linear-gradient(270deg, var(--ring-3a), var(--ring-3b))" },
    { key: "f", label: "چربی", val: cal.today.fat, target: target.fat, color: "linear-gradient(270deg, var(--ring-1a), var(--ring-1b))" },
  ];
  return (
    <div className="db-fit">
      <div className="db-gauge-wrap">
        <Gauge value={Math.min(frac, 1)} over={over} />
        <div className="db-gauge-center">
          <CountUp value={cal.today.kcal} className="db-gauge-num" />
          <span className="db-gauge-cap">از {faNum(target.kcal)} کالری</span>
          <span className={`db-gauge-left${over ? " is-over" : ""}`}>{left >= 0 ? `${faNum(left)} مونده` : `${faNum(-left)} بیشتر`}</span>
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

      <div className="db-kbars" aria-label="7 روز اخیر">
        {cal.week.map((w, i) => {
          const [y, m, d] = w.iso.split("-").map(Number);
          const wd = FA_WEEKDAY_SHORT[new Date(y, m - 1, d).getDay()];
          const h = w.kcal / maxWeek;
          const ok = w.kcal > 0 && w.kcal <= target.kcal;
          return (
            <span key={w.iso} className={`db-kbar${i === cal.week.length - 1 ? " is-today" : ""}`} title={`${faNum(w.kcal)} کالری`}>
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
          <DashIcon name="plus" className="dbi-live" /> ثبت غذا
        </button>
      ) : (
        <Link href="/exercise?tab=calorie" prefetch className="account-outline-btn mentor-btn db-fit-cta">
          <DashIcon name="plus" className="dbi-live" /> ثبت غذا
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
