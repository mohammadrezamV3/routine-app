"use client";

// «امروز» — برنامه‌های روتینِ امروز به‌صورتِ خطِ زمانی، با خطِ «الان» بینِ
// گذشته و پیشِ‌رو. تیک همون setDaily ِ lib/storage.ts ـه، پس همون لحظه در
// /weekly و هدر و استریک هم دیده می‌شه. فقط امروز قابلِ تیکه (هم‌قانونِ /weekly).

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { faNum } from "@/lib/jalali";
import { splitTimeRange } from "@/lib/schedule";
import type { TodayTask } from "@/lib/useDashboardRoutine";
import type { HeatCell } from "@/lib/dashboardCompute";
import { BentoCard, CardHead, D_EASE, EmptyState, Skel } from "./DashboardKit";
import { DashIcon } from "./DashboardIcons";

const MAX_ROWS = 7;
const IMPORTANCE_COLOR: Record<string, string> = { veryHigh: "var(--pnl-loss)", high: "#E0A452" };

const WEEK_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

export function DashboardToday({ ready, tasks, stats, week, onToggle }: { ready: boolean; tasks: TodayTask[]; stats: { completed: number; total: number; pct: number }; week: HeatCell[] | null; onToggle: (id: string) => void }) {
  const [nowMin, setNowMin] = useState<number | null>(null);
  useEffect(() => {
    const f = () => { const d = new Date(); setNowMin(d.getHours() * 60 + d.getMinutes()); };
    f();
    const t = setInterval(f, 30_000);
    return () => clearInterval(t);
  }, []);

  // اول برنامه‌های انجام‌نشده‌ی نزدیک، ولی ترتیبِ زمانی حفظ می‌شه؛ اگه بیشتر
  // از MAX_ROWS بود، پنجره‌ای حولِ «الان» نشون داده می‌شه نه فقط صبحِ زود.
  const visible = useMemo(() => {
    if (tasks.length <= MAX_ROWS || nowMin === null) return tasks;
    const firstUpcoming = tasks.findIndex((t) => (t.startMin ?? 0) >= nowMin);
    const anchor = firstUpcoming === -1 ? tasks.length - MAX_ROWS : Math.max(0, firstUpcoming - 2);
    return tasks.slice(Math.min(anchor, tasks.length - MAX_ROWS), Math.min(anchor, tasks.length - MAX_ROWS) + MAX_ROWS);
  }, [tasks, nowMin]);
  const nowIndex = nowMin === null ? -1 : visible.findIndex((t) => (t.startMin ?? -1) > nowMin);
  const allDone = stats.total > 0 && stats.completed === stats.total;

  return (
    <BentoCard area="today" className="db-today" label="برنامه‌های امروز">
      <CardHead
        icon="routine"
        title="برنامه‌های امروز"
        href="/weekly"
        hrefLabel="روتین"
        extra={ready && stats.total > 0 ? <span className="db-pill">{faNum(stats.completed)} از {faNum(stats.total)}</span> : null}
      />

      <AnimatePresence>
        {allDone && (
          <motion.div
            className="db-today-win"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: D_EASE }}
          >
            <span className="db-today-win-icon"><DashIcon name="trophy" className="dbi-live" /></span>
            <span>روزِ کامل! همه‌ی برنامه‌های امروز انجام شد.</span>
            <span className="db-burst" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <i key={i} style={{ ["--i" as any]: i }} />)}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {!ready ? (
        <div className="db-today-list">{Array.from({ length: 4 }, (_, i) => <div key={i} className="db-today-row"><Skel w={22} h={22} r={8} /><Skel w="55%" h={12} /></div>)}</div>
      ) : tasks.length === 0 ? (
        <EmptyState icon="routine" text="امروز برنامه‌ای نداری. یه برنامه اضافه کن تا روزت شکل بگیره." href="/weekly?add=1" cta="افزودن برنامه" />
      ) : (
        <ol className="db-today-list">
          {visible.map((t, i) => {
            const { start } = splitTimeRange(t.time);
            const past = nowMin !== null && t.startMin !== null && t.startMin <= nowMin;
            return (
              <li key={t.id} className="db-today-li">
                {i === nowIndex && <NowLine />}
                <div className={`db-today-row${t.done ? " is-done" : ""}${past && !t.done ? " is-due" : ""}`}>
                  <motion.button
                    type="button"
                    className={`db-check${t.done ? " is-on" : ""}`}
                    onClick={() => onToggle(t.id)}
                    whileTap={{ scale: 0.82 }}
                    aria-pressed={t.done}
                    aria-label={`${t.done ? "برداشتنِ تیکِ" : "تیک‌زدنِ"} ${t.name}`}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <motion.path
                        d="m6.5 12.5 3.6 3.5 7.4-8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.6}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={false}
                        animate={{ pathLength: t.done ? 1 : 0 }}
                        transition={{ duration: 0.32, ease: D_EASE }}
                      />
                    </svg>
                  </motion.button>
                  <span className="db-today-time" dir="ltr">{start ?? t.time}</span>
                  {t.href ? (
                    <Link href={t.href} prefetch className="db-today-name">{t.name}</Link>
                  ) : (
                    <span className="db-today-name">{t.name}</span>
                  )}
                  {t.importance && IMPORTANCE_COLOR[t.importance] && <span className="db-imp" style={{ background: IMPORTANCE_COLOR[t.importance] }} title="اهمیتِ بالا" />}
                  {t.tag && <span className="db-tag">{t.tag}</span>}
                </div>
              </li>
            );
          })}
          {nowIndex === -1 && nowMin !== null && visible.length > 0 && <li className="db-today-li"><NowLine /></li>}
        </ol>
      )}
      {ready && tasks.length > visible.length && (
        <Link href="/weekly" prefetch className="db-today-more">+{faNum(tasks.length - visible.length)} برنامه‌ی دیگه</Link>
      )}
      {ready && week && week.length === 7 && <WeekBars week={week} />}
    </BentoCard>
  );
}

/** «این هفته» — درصدِ انجامِ هر روزِ هفته‌ی جاری (شنبه..جمعه)، پایینِ کارت */
function WeekBars({ week }: { week: HeatCell[] }) {
  const past = week.filter((c) => !c.future && c.pct !== null);
  const avg = past.length ? Math.round(past.reduce((a, c) => a + (c.pct ?? 0), 0) / past.length) : null;
  return (
    <div className="db-weekbars">
      <span className="db-sub-head">این هفته{avg !== null && <span className="db-pill">میانگین {faNum(avg)}٪</span>}</span>
      <div className="db-weekbars-row">
        {week.map((c, i) => (
          <span key={c.iso} className={`db-wbar${c.today ? " is-today" : ""}${c.future ? " is-future" : ""}`} title={c.pct === null ? "بدونِ برنامه" : `${faNum(c.pct)}٪`}>
            <span className="db-wbar-track">
              <motion.i
                className={c.pct === 100 ? "is-full" : ""}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: c.pct ? Math.max(0.04, c.pct / 100) : 0 }}
                transition={{ duration: 0.8, ease: D_EASE, delay: 0.3 + i * 0.05 }}
              />
            </span>
            <em>{WEEK_SHORT[i]}</em>
          </span>
        ))}
      </div>
    </div>
  );
}

function NowLine() {
  return (
    <div className="db-now" aria-label="الان">
      <span className="db-now-dot" />
      <span className="db-now-label">الان</span>
    </div>
  );
}
