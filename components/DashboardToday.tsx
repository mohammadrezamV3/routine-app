"use client";

// «برنامه‌های امروز» — خطِ زمانیِ زنده. هر برنامه یک گره روی ریلِ عمودیه
// (خودِ گره دکمه‌ی تیکه) و یک کارتِ بوردری کنارش، با وضعیتِ لحظه‌ای:
//   انجام‌شده · در جریان (با نوارِ گذشتِ زمان) · بعدی (با شمارشِ معکوس) ·
//   عقب‌افتاده · پیشِ‌رو · بدونِ ساعت.
// ریل تا «الان» رنگی پر می‌شه و نشانگرِ «الان» بینِ گذشته و آینده می‌شینه.
// تیک همون setDaily ِ lib/storage.ts ـه، پس همون لحظه در /weekly، هدر و استریک
// دیده می‌شه. فقط امروز قابلِ تیکه (هم‌قانونِ /weekly). بک‌گراندِ تازه‌ای اضافه
// نشده: کارت‌ها فقط بوردر دارن و تاکیدِ «بعدی/در جریان» نورِ روی بوردره.

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { faNum } from "@/lib/jalali";
import { timeEndMinutes, toEnDigits } from "@/lib/schedule";
import type { TodayTask } from "@/lib/useDashboardRoutine";
import type { HeatCell } from "@/lib/dashboardCompute";
import { BentoCard, CardHead, CountUp, D_EASE, EmptyState, Skel } from "./DashboardKit";
import { DashIcon } from "./DashboardIcons";

const MAX_ROWS = 7;
const WEEK_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
/** برنامه‌ی بدونِ ساعتِ پایان، تا این مدت بعد از شروع «در جریان» حساب می‌شه */
const DEFAULT_SPAN = 45;

type State = "done" | "active" | "next" | "missed" | "upcoming" | "untimed";

const STATE_LABEL: Record<State, string> = {
  done: "انجام شد",
  active: "در جریان",
  next: "بعدی",
  missed: "عقب افتاده",
  upcoming: "پیشِ‌رو",
  untimed: "بدونِ ساعت",
};

function fmtIn(min: number) {
  if (min < 1) return "همین الان";
  if (min < 60) return `${faNum(min)} دقیقه دیگه`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${faNum(h)} ساعت و ${faNum(m)} دقیقه دیگه` : `${faNum(h)} ساعت دیگه`;
}
function hhmm(min: number) {
  const h = Math.floor(min / 60) % 24, m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function DashboardToday({ ready, tasks, stats, week, onToggle }: { ready: boolean; tasks: TodayTask[]; stats: { completed: number; total: number; pct: number }; week: HeatCell[] | null; onToggle: (id: string) => void }) {
  const [nowMin, setNowMin] = useState<number | null>(null);
  useEffect(() => {
    const f = () => { const d = new Date(); setNowMin(d.getHours() * 60 + d.getMinutes()); };
    f();
    const t = setInterval(f, 20_000);
    return () => clearInterval(t);
  }, []);
  // آخرین تیکی که «انجام» شد — برای انفجارِ ذرات روی همون گره
  const [burst, setBurst] = useState<{ id: string; k: number } | null>(null);

  const rows = useMemo(() => {
    const nm = nowMin ?? -1;
    let nextAssigned = false;
    return tasks.map((t) => {
      const end = t.startMin === null ? null : (timeEndMinutes(t.time) ?? t.startMin + DEFAULT_SPAN);
      let state: State;
      if (t.done) state = "done";
      else if (t.startMin === null) state = "untimed";
      else if (nm >= t.startMin && end !== null && nm < end) state = "active";
      else if (nm >= t.startMin) state = "missed";
      else if (!nextAssigned) { state = "next"; nextAssigned = true; }
      else state = "upcoming";
      const progress = state === "active" && t.startMin !== null && end ? (nm - t.startMin) / Math.max(1, end - t.startMin) : 0;
      // ساعت‌ها با ارقامِ فارسی ذخیره شدن («۰۹:۳۰ – ۱۰:۳۰»)؛ برچسب از خودِ دقیقه‌ها ساخته می‌شه
      return { ...t, end, state, progress, startLabel: t.startMin !== null ? hhmm(t.startMin) : toEnDigits(t.time), endLabel: end !== null && timeEndMinutes(t.time) !== null ? hhmm(end) : null };
    });
  }, [tasks, nowMin]);

  // پنجره‌ای حولِ «الان» وقتی برنامه‌ها زیادن (نه فقط صبحِ زود)
  const visible = useMemo(() => {
    if (rows.length <= MAX_ROWS) return rows;
    const focus = rows.findIndex((r) => r.state === "active" || r.state === "next");
    const anchor = focus === -1 ? rows.length - MAX_ROWS : Math.max(0, Math.min(focus - 2, rows.length - MAX_ROWS));
    return rows.slice(anchor, anchor + MAX_ROWS);
  }, [rows]);

  // «الان» قبل از اولین برنامه‌ای که شروعش نرسیده
  const nowIndex = nowMin === null ? -1 : visible.findIndex((r) => r.startMin !== null && r.startMin > nowMin);
  const next = rows.find((r) => r.state === "next");
  const active = rows.find((r) => r.state === "active");
  const missed = rows.filter((r) => r.state === "missed").length;
  const allDone = stats.total > 0 && stats.completed === stats.total;

  function toggle(id: string, wasDone: boolean) {
    if (!wasDone) setBurst({ id, k: Date.now() });
    onToggle(id);
  }

  return (
    <BentoCard area="today" className="db-today" label="برنامه‌های امروز">
      <CardHead icon="routine" title="برنامه‌های امروز" href="/weekly" hrefLabel="روتین" />

      {ready && stats.total > 0 && (
        <div className="db-tl-summary">
          <div className="db-tl-score">
            <b><CountUp value={stats.completed} duration={0.6} /></b>
            <span>از {faNum(stats.total)}</span>
          </div>
          <div className="db-tl-sum-main">
            <div className="db-tl-segs" style={{ ["--n" as any]: Math.min(stats.total, 12) }} aria-hidden="true">
              {stats.total <= 12 ? (
                Array.from({ length: stats.total }, (_, i) => (
                  <motion.i key={i} className={i < stats.completed ? "is-on" : ""} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.15 + i * 0.05, duration: 0.4, ease: D_EASE }} />
                ))
              ) : (
                <i className="is-track"><motion.b initial={{ scaleX: 0 }} animate={{ scaleX: stats.completed / stats.total }} transition={{ duration: 0.8, ease: D_EASE }} /></i>
              )}
            </div>
            <span className="db-tl-sum-text">
              {allDone ? "روزِ کامل! همه انجام شد" : active ? <>الان: <b>{active.name}</b></> : next && nowMin !== null && next.startMin !== null ? <>بعدی <b>{next.name}</b> · {fmtIn(next.startMin - nowMin)}</> : missed ? `${faNum(missed)} برنامه عقب افتاده` : "برای امروز برنامه‌ی زمان‌داری نمونده"}
            </span>
          </div>
        </div>
      )}

      <AnimatePresence>
        {allDone && (
          <motion.div className="db-today-win" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.4, ease: D_EASE }}>
            <span className="db-today-win-icon"><DashIcon name="trophy" className="dbi-live" /></span>
            <span>روزِ کامل! همه‌ی برنامه‌های امروز انجام شد.</span>
            <span className="db-burst" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <i key={i} style={{ ["--i" as any]: i }} />)}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {!ready ? (
        <div className="db-tl">{Array.from({ length: 4 }, (_, i) => <div key={i} className="db-tl-skel"><Skel w={40} h={12} /><Skel w={26} h={26} r={20} /><Skel w="60%" h={40} r={14} /></div>)}</div>
      ) : tasks.length === 0 ? (
        <EmptyState icon="routine" text="امروز برنامه‌ای نداری. یه برنامه اضافه کن تا روزت شکل بگیره." href="/weekly?add=1" cta="افزودن برنامه" action="program" />
      ) : (
        <ol className="db-tl">
          {visible.map((r, i) => {
            const passed = nowIndex === -1 ? true : i < nowIndex;
            return (
              <Fragment key={r.id}>
              {i === nowIndex && nowMin !== null && <li className="db-tl-item is-now"><NowMarker min={nowMin} /></li>}
              <motion.li
                className={`db-tl-item is-${r.state}${passed ? " is-passed" : ""}${i === visible.length - 1 ? " is-last" : ""}`}
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 + i * 0.05, duration: 0.45, ease: D_EASE }}
              >
                <div className="db-tl-row">
                  <div className="db-tl-time" dir="ltr">
                    <b>{r.startLabel}</b>
                    {r.endLabel && <span>{r.endLabel}</span>}
                  </div>

                  <div className="db-tl-rail">
                    <motion.button
                      type="button"
                      className="db-tl-node"
                      onClick={() => toggle(r.id, r.done)}
                      whileTap={{ scale: 0.8 }}
                      aria-pressed={r.done}
                      aria-label={`${r.done ? "برداشتنِ تیکِ" : "تیک‌زدنِ"} ${r.name}`}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <motion.path d="m7 12.5 3.3 3.2L17 9" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" initial={false} animate={{ pathLength: r.done ? 1 : 0, opacity: r.done ? 1 : 0 }} transition={{ duration: 0.35, ease: D_EASE }} />
                      </svg>
                      <AnimatePresence>
                        {burst?.id === r.id && r.done && (
                          <motion.span key={burst.k} className="db-tl-ripple" initial={{ scale: 0.6, opacity: 0.7 }} animate={{ scale: 2.4, opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.7, ease: "easeOut" }} onAnimationComplete={() => setBurst(null)} />
                        )}
                      </AnimatePresence>
                      {burst?.id === r.id && r.done && (
                        <span className="db-tl-spark" aria-hidden="true">{Array.from({ length: 8 }, (_, k) => <i key={k} style={{ ["--i" as any]: k }} />)}</span>
                      )}
                    </motion.button>
                  </div>

                  <div className="db-tl-card">
                    <div className="db-tl-card-top">
                      {r.href ? <Link href={r.href} prefetch className="db-tl-name">{r.name}</Link> : <span className="db-tl-name">{r.name}</span>}
                      {r.importance === "veryHigh" || r.importance === "high" ? (
                        <span className={`db-tl-flag is-${r.importance}`} title={r.importance === "veryHigh" ? "اهمیتِ خیلی زیاد" : "اهمیتِ زیاد"}>
                          <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 11V1.6M3 2h6l-1.4 2.2L9 6.4H3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </span>
                      ) : null}
                    </div>
                    <div className="db-tl-meta">
                      <span className="db-tl-state"><i />{STATE_LABEL[r.state]}</span>
                      {r.state === "next" && nowMin !== null && r.startMin !== null && <span className="db-tl-in">{fmtIn(r.startMin - nowMin)}</span>}
                      {r.tag && <span className="db-tag">{r.tag}</span>}
                    </div>
                    {r.state === "active" && (
                      <span className="db-tl-prog" aria-label="زمانِ سپری‌شده">
                        <motion.i initial={{ scaleX: 0 }} animate={{ scaleX: Math.min(1, Math.max(0.03, r.progress)) }} transition={{ duration: 0.9, ease: D_EASE }} />
                      </span>
                    )}
                  </div>
                </div>
              </motion.li>
              </Fragment>
            );
          })}
          {nowIndex === -1 && nowMin !== null && visible.length > 0 && (
            <li className="db-tl-item is-tail"><NowMarker min={nowMin} /></li>
          )}
        </ol>
      )}
      {ready && tasks.length > visible.length && (
        <Link href="/weekly" prefetch className="db-today-more">+{faNum(tasks.length - visible.length)} برنامه‌ی دیگه</Link>
      )}
      {ready && week && week.length === 7 && <WeekBars week={week} />}
    </BentoCard>
  );
}

function NowMarker({ min }: { min: number }) {
  return (
    <div className="db-tl-now" aria-label={`الان ${hhmm(min)}`}>
      <span className="db-tl-now-time" dir="ltr">{hhmm(min)}</span>
      <span className="db-tl-now-dot" />
      <span className="db-tl-now-line" />
      <span className="db-tl-now-label">الان</span>
    </div>
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
