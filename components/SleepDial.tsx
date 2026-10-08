"use client";

import "./sleep-dial.css";
import { useEffect, useId, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { faNum } from "@/lib/jalali";
import {
  SCORE_BAND_LABEL, clockOf, durationLabel, goalFromTargets, minuteOfDay, minutesUntil, scoreBand,
  sleepMinutes, sleepPhase, wakeTimesFor, type SleepRecord,
} from "@/lib/sleep";
import { arcPath, fitFontSize, hhmmToMin, minuteToAngle, pointAt } from "@/lib/sleepDial";
import { cycleBoundaries } from "@/lib/sleepCycles";
import { SleepCycleButton } from "./SleepCycleButton";
import { startTracking, stopTracking, type SleepTracking } from "@/lib/sleepTracker";

// هیروی بخش خواب: صفحه‌ی ساعت 24 ساعته (نیمه‌شب بالا). قوس پهن = پنجره‌ی هدف
// خواب (از ساعت خواب تا بیداری)، قوس نازک داخلی = خواب واقعی دیشب به رنگ
// امتیازش، و نقطه‌ی روشن = همین لحظه. وسط صفحه فقط یک چیز، بسته به زمان:
// شمارش معکوس تا خواب، زمان خواب زنده‌ی ردیاب، یا امتیاز دیشب. زیرش دو ساعت
// هدف (زدن = ویرایش هدف) و یک دکمه‌ی اصلی. هیچ آماری این‌جا نیست؛ آمار در
// آنالیز هفتگی‌ه. هندسه‌ی خالص در lib/sleepDial.ts.
// همه‌چیز (قوس‌ها، آیکون‌های ماه/خورشید، متن وسط) داخل یک SVG با یک دستگاه
// مختصاته: لایه‌ی HTML جدا با درصد روی SVG نمی‌شینه چون توی وب‌کیت (آیفون)
// ترکیب aspect-ratio و container-type باکس رو بلندتر از عرضش می‌کرد و آیکون‌ها
// و متن وسط از جاشون سر می‌خوردن.

const S = 300;
const C = S / 2;
const R_GOAL = 124;
const R_LAST = 102;
const PIN = 14;
// حاشیه‌ی خالی دور حلقه (واحد SVG) کم می‌شه تا زیر صفحه‌ی ساعت فضای خالی نمونه؛ هنوز جا برای درخشش قوس و نبض نقطه هست
const VB = 8;
const EASE = [0.22, 1, 0.36, 1] as const;

function hms(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}`;
}

// بیشینه‌ی عرض متن وسط (واحد SVG): فاصله‌ی بین عددهای 06 و 18 منهای حاشیه
const CENTER_W = 124;

export function SleepDial({
  loaded,
  target,
  lastNight,
  lastScore,
  tracking,
  onLog,
  onWakeUp,
  onEditGoal,
  latency = 15,
  onOpenCycles,
  onPreloadCycles,
}: {
  loaded: boolean;
  target: { wake: string; sleep: string };
  lastNight: SleepRecord | null;
  lastScore: number | null;
  tracking: SleepTracking | null;
  onLog: () => void;
  onWakeUp: () => void;
  onEditGoal: () => void;
  /** زمان به خواب رفتن (دقیقه) برای مرز چرخه‌ها */
  latency?: number;
  onOpenCycles?: () => void;
  onPreloadCycles?: () => void;
}) {
  const uid = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const nowMin = now ? now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60 : null;
  const phase = sleepPhase(Math.floor(nowMin ?? 12 * 60), target);
  const bedMin = hhmmToMin(target.sleep) ?? 23 * 60 + 30;
  const wakeMin = hhmmToMin(target.wake) ?? 7 * 60;
  const goalMin = goalFromTargets(target);

  const isMorning = phase === "morning" || phase === "day";
  const showLast = !!lastNight && lastScore !== null && isMorning && !tracking;
  const band = lastScore !== null ? scoreBand(lastScore) : null;

  const lastFrom = lastNight ? minuteOfDay(lastNight.sleptAt) : 0;
  const lastTo = lastNight ? minuteOfDay(lastNight.wokeAt) : 0;
  const trackFrom = tracking ? minuteOfDay(tracking.startedAt) : 0;

  // وسط صفحه
  let kicker = "";
  let big = "";
  let caption = "";
  let bigCls = "";
  if (tracking) {
    kicker = "در حال خواب";
    big = now ? hms((now.getTime() - new Date(tracking.startedAt).getTime()) / 1000) : "00:00:00";
    caption = `از ${clockOf(tracking.startedAt)}`;
    bigCls = "is-clock is-hms";
  } else if (showLast && band) {
    kicker = "امتیاز دیشب";
    big = faNum(lastScore!);
    caption = `${SCORE_BAND_LABEL[band]} · ${durationLabel(sleepMinutes(lastNight!))}`;
    bigCls = `is-score slp-c-${band}`;
  } else if (phase === "bedtime" || phase === "night") {
    kicker = "وقت خوابه";
    big = now ? `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}` : "--:--";
    caption = "الان";
    bigCls = "is-clock";
  } else if (phase === "morning" && !lastNight) {
    kicker = "صبح بخیر";
    big = "دیشب؟";
    caption = "هنوز ثبت نشده";
    bigCls = "is-word";
  } else {
    kicker = "تا وقت خواب";
    const toBed = minutesUntil(Math.floor(nowMin ?? 0), target.sleep) ?? 0;
    big = now ? hms(toBed * 60 - now.getSeconds()) : "--:--:--";
    caption = `ساعت ${target.sleep}`;
    bigCls = "is-clock is-hms";
  }

  // یک خط راهنما فقط شب: بهترین ساعت‌های بیداری اگه همین الان بخوابی
  const wakeHint = !tracking && (phase === "bedtime" || phase === "night" || phase === "winddown") && nowMin !== null
    ? wakeTimesFor(Math.floor(nowMin), latency).slice(0, 2).reverse().map((w) => w.clock)
    : null;

  // اندازه و جای عمودی متن وسط (نسبت به مرکز)؛ امتیاز درشت‌تره و فاصله‌ها بازتر
  const baseBig = bigCls.includes("is-score") ? 56 : bigCls.includes("is-hms") ? 26 : bigCls.includes("is-word") ? 32 : 40;
  const cy = bigCls.includes("is-score") ? { kicker: -40, big: 2, caption: 42 } : { kicker: -30, big: 2, caption: 32 };

  const nowAngle = nowMin !== null ? minuteToAngle(nowMin) : 0;
  const nowPt = pointAt(C, R_GOAL, nowAngle);
  const bedPt = pointAt(C, R_GOAL, minuteToAngle(bedMin));
  const wakePt = pointAt(C, R_GOAL, minuteToAngle(wakeMin));
  const cycleDots = useMemo(() => cycleBoundaries(bedMin, wakeMin, latency).map((m) => pointAt(C, R_GOAL, minuteToAngle(m))), [bedMin, wakeMin, latency]);
  const draw = reduce ? { duration: 0 } : { duration: 1.2, ease: EASE };

  return (
    <section className="sl-card sld" aria-live="polite">
      <div className="sld-dial">
        <svg viewBox={`${VB} ${VB} ${S - 2 * VB} ${S - 2 * VB}`} className="sld-svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${kicker} ${big} ${caption}`}>
          <defs>
            <linearGradient id={`sldg${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" style={{ stopColor: "var(--slp-ink)" }} />
              <stop offset="100%" style={{ stopColor: "var(--slp-ink-2)" }} />
            </linearGradient>
          </defs>

          {/* خط زمان 24 ساعته */}
          <circle cx={C} cy={C} r={R_GOAL} className="sld-track" />
          {Array.from({ length: 24 }, (_, h) => {
            const a = minuteToAngle(h * 60);
            const major = h % 6 === 0;
            const p0 = pointAt(C, R_GOAL - 20, a);
            const p1 = pointAt(C, R_GOAL - (major ? 30 : 25), a);
            return <line key={h} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} className={major ? "sld-tick is-major" : "sld-tick"} />;
          })}
          {[0, 6, 12, 18].map((h) => {
            const p = pointAt(C, R_GOAL - 44, minuteToAngle(h * 60));
            return <text key={h} x={p.x} y={p.y} className="sld-hour" textAnchor="middle" dominantBaseline="central">{String(h).padStart(2, "0")}</text>;
          })}

          {/* پنجره‌ی هدف خواب */}
          <motion.path
            d={arcPath(C, R_GOAL, bedMin, wakeMin)}
            className="sld-goal"
            stroke={`url(#sldg${uid})`}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={draw}
          />

          {/* مرز چرخه‌های 90 دقیقه‌ای روی قوس هدف */}
          <motion.g
            aria-hidden="true"
            initial={{ opacity: reduce ? 1 : 0 }}
            animate={{ opacity: 1 }}
            transition={reduce ? { duration: 0 } : { duration: 0.6, delay: 1 }}
          >
            {cycleDots.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={2.2} className="sld-cyc" />)}
          </motion.g>

          {/* خواب واقعی دیشب یا ردیاب زنده */}
          {loaded && tracking && nowMin !== null && (
            <path d={arcPath(C, R_LAST, trackFrom, nowMin)} className="sld-last is-live" />
          )}
          {loaded && !tracking && lastNight && (
            <motion.path
              d={arcPath(C, R_LAST, lastFrom, lastTo)}
              className={`sld-last${band ? ` slp-c-${band}` : ""}`}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={reduce ? { duration: 0 } : { ...draw, delay: 0.35 }}
            />
          )}

          {/* همین لحظه */}
          {nowMin !== null && (
            <g>
              <circle cx={nowPt.x} cy={nowPt.y} r={11} className="sld-now-halo" />
              <circle cx={nowPt.x} cy={nowPt.y} r={5.5} className="sld-now" />
            </g>
          )}

          {/* ماه و خورشید روی دو سر قوس هدف */}
          <Moon className="sld-pin" x={bedPt.x - PIN / 2} y={bedPt.y - PIN / 2} width={PIN} height={PIN} />
          <Sun className="sld-pin" x={wakePt.x - PIN / 2} y={wakePt.y - PIN / 2} width={PIN} height={PIN} />

          {/* متن وسط: داخل دایره‌ی درونی، شمارش‌های بلند کوچیک می‌شن */}
          <text x={C} y={C + cy.kicker} className="sld-kicker" textAnchor="middle" dominantBaseline="central" style={{ fontSize: fitFontSize(kicker, 12, CENTER_W) }}>{kicker}</text>
          <text x={C} y={C + cy.big} className={`sld-big ${bigCls}`} textAnchor="middle" dominantBaseline="central" style={{ fontSize: fitFontSize(big, baseBig, CENTER_W) }}>{big}</text>
          <text x={C} y={C + cy.caption} className="sld-caption" textAnchor="middle" dominantBaseline="central" style={{ fontSize: fitFontSize(caption, 11.5, CENTER_W) }}>{caption}</text>
        </svg>
      </div>

      <button type="button" className="sld-goal-row" onClick={onEditGoal} aria-label="ویرایش هدف خواب">
        <span className="sld-goal-item">
          <Moon aria-hidden />
          <span><small>خواب</small><b>{target.sleep}</b></span>
        </span>
        <span className="sld-goal-mid">
          <small>هدف</small>
          <b>{durationLabel(goalMin)}</b>
        </span>
        <span className="sld-goal-item">
          <Sun aria-hidden />
          <span><small>بیداری</small><b>{target.wake}</b></span>
        </span>
      </button>

      {wakeHint && (
        <p className="sld-hint">
          اگه الان بخوابی، بهترین ساعت بیداری: <b>{wakeHint[0]}</b> یا <b>{wakeHint[1]}</b>
        </p>
      )}

      {onOpenCycles && <SleepCycleButton onClick={onOpenCycles} onPreload={onPreloadCycles} />}

      <div className="sld-actions">
        {tracking ? (
          <>
            <button type="button" className="trade-primary-btn" onClick={onWakeUp}>بیدار شدم</button>
            <button type="button" className="account-outline-btn muted" onClick={() => stopTracking()}>لغو</button>
          </>
        ) : phase === "winddown" || phase === "bedtime" || phase === "night" ? (
          <>
            <button type="button" className="trade-primary-btn" onClick={() => startTracking()}>دارم می‌خوابم</button>
            <button type="button" className="account-outline-btn" onClick={onLog}>{lastNight ? "ویرایش دیشب" : "ثبت دیشب"}</button>
          </>
        ) : (
          <button type="button" className={lastNight ? "account-outline-btn" : "trade-primary-btn"} onClick={onLog}>
            {lastNight ? "ویرایش خواب دیشب" : "ثبت خواب دیشب"}
          </button>
        )}
      </div>
    </section>
  );
}
