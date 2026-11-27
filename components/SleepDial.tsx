"use client";

import "./sleep-dial.css";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { m as motion, useReducedMotion } from "framer-motion";
import { BarChart3, Check, ChevronLeft, Flame, Moon, MoonStar, Sun, Sunrise, Sunset, Target, TrendingDown, TrendingUp, BatteryLow, PenLine, Clock } from "lucide-react";
import { SmartLink as Link } from "@/components/SmartLink";
import { Spinner } from "./Spinner";
import { faNum, jMonthName, toJalali, weekdayName } from "@/lib/jalali";
import { tr } from "@/lib/i18n";
import {
  scoreBandLabel, clockOf, durationLabel, goalFromTargets, minuteOfDay, minutesUntil, scoreBand,
  sleepMinutes, sleepPhase, type SleepRecord,
} from "@/lib/sleep";
import { arcPath, fitFontSize, greetKey, hhmmToMin, minuteToAngle, pointAt, starField } from "@/lib/sleepDial";
import { cycleBoundaries } from "@/lib/sleepCycles";
import { SleepCycleButton } from "./SleepCycleButton";
import { startTracking, stopTracking, type SleepTracking } from "@/lib/sleepTracker";
import { cycleTileInfo, dialHint, dialHintText, type DialHint } from "@/lib/sleepDialHints";

const HINT_ICON: Record<DialHint["kind"], typeof Moon> = {
  winddown: Moon, pastBedtime: Clock, streak: Flame, under: TrendingDown, over: TrendingUp,
  onGoal: Target, debt: BatteryLow, logPrompt: PenLine, idle: Target,
};

/** عدد امتیاز از 0 به مقدار واقعی می‌شمره (فقط متن عوض می‌شه، نه layout)؛ با حرکت کاهی یکباره */
function useCountUp(value: number | null, off: boolean): number | null {
  const [shown, setShown] = useState<number | null>(value);
  const played = useRef(false);
  useEffect(() => {
    if (value === null) { setShown(null); played.current = false; return; }
    if (off || played.current) { setShown(value); played.current = true; return; }
    played.current = true;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 900);
      setShown(Math.round(value * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    setShown(0);
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, off]);
  return shown;
}

// هیروی بخش خواب: صفحه‌ی ساعت 24 ساعته (نیمه‌شب بالا). قوس پهن = پنجره‌ی هدف
// خواب (از ساعت خواب تا بیداری)، قوس نازک داخلی = خواب واقعی دیشب به رنگ
// امتیازش، و نقطه‌ی روشن = همین لحظه. وسط صفحه فقط یک چیز، بسته به زمان:
// شمارش معکوس تا خواب، زمان خواب زنده‌ی ردیاب، یا امتیاز دیشب. زیرش دو ساعت
// هدف (فقط نمایش)، یک نکته‌ی شخصی تک‌خطی (lib/sleepDialHints.ts)، دو باکس
// هوشمند (چرخه‌های خواب با ساعت بیداری پیشنهادی زنده + هدف خواب با شمارش معکوس
// تا خواب؛ هر دو پنجره‌شون رو باز می‌کنن) و یک دکمه‌ی اصلی. آمار در آنالیز هفتگی‌ه. هندسه‌ی خالص در lib/sleepDial.ts.
// همه‌چیز (قوس‌ها، آیکون‌های ماه/خورشید، متن وسط) داخل یک SVG با یک دستگاه
// مختصاته: لایه‌ی HTML جدا با درصد روی SVG نمی‌شینه چون توی وب‌کیت (آیفون)
// ترکیب aspect-ratio و container-type باکس رو بلندتر از عرضش می‌کرد و آیکون‌ها
// و متن وسط از جاشون سر می‌خوردن.

const S = 320;
const C = S / 2;
const R_FACE = 156;
const R_NUM = 144;
const R_GOAL = 111;
const W_GOAL = 15;
const R_LAST = 90;
const W_LAST = 8;
const R_HAND_IN = 98;
const R_HAND_OUT = 128;
const PIN = 14;
const PIN_R = 12.5;
// حاشیه‌ی خالی دور صفحه (واحد SVG)
const VB = 2;
const EASE = [0.22, 1, 0.36, 1] as const;

function hms(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}`;
}

// بیشینه‌ی عرض متن وسط (واحد SVG): فاصله‌ی بین عددهای 06 و 18 منهای حاشیه
const CENTER_W = 136;
const VB_SPAN = S - 2 * VB;

/** موقعیت و اندازه‌ی یک خط متن وسط به درصد/cqw تا با اندازه‌ی ساعت مقیاس بشه */
function centerLine(dy: number, fontSize: number): React.CSSProperties {
  return {
    top: `${((C + dy - VB) / VB_SPAN) * 100}%`,
    fontSize: `${(fontSize / VB_SPAN) * 100}cqw`,
  };
}

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
  onQuickLog,
  quickBusy = false,
  quickError = null,
  goalStreak = 0,
  debt7Min = 0,
  showStats = false,
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
  /** ثبت یک‌ضربه‌ی دیشب با ساعت‌های هدف (فقط وقتی دیشب ثبت نشده و ساعت بیداری هدف گذشته) */
  onQuickLog?: () => void;
  quickBusy?: boolean;
  quickError?: string | null;
  /** شب‌های پشت سر هم در بازه‌ی هدف (برای نکته‌ی زیر ساعت) */
  goalStreak?: number;
  /** بدهی خواب 7 شب اخیر (دقیقه) */
  debt7Min?: number;
  /** لینک «آمار خواب» (به آنالیز هفتگی) در سرتیتر کارت */
  showStats?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const [now, setNow] = useState<Date | null>(null);
  const nowMin = now ? now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60 : null;
  const phase = sleepPhase(Math.floor(nowMin ?? 12 * 60), target);
  const bedMin = hhmmToMin(target.sleep) ?? 23 * 60 + 30;
  const wakeMin = hhmmToMin(target.wake) ?? 7 * 60;
  const goalMin = goalFromTargets(target);

  const isMorning = phase === "morning" || phase === "day";
  const showLast = !!lastNight && lastScore !== null && isMorning && !tracking;
  const band = lastScore !== null ? scoreBand(lastScore) : null;
  const scoreShown = useCountUp(showLast ? lastScore : null, !!reduce);

  const lastFrom = lastNight ? minuteOfDay(lastNight.sleptAt) : 0;
  const lastTo = lastNight ? minuteOfDay(lastNight.wokeAt) : 0;
  const trackFrom = tracking ? minuteOfDay(tracking.startedAt) : 0;

  // وسط صفحه
  let kicker = "";
  let big = "";
  let caption = "";
  let caption2 = "";
  let bigCls = "";
  if (tracking) {
    kicker = tr("در حال خواب", "Sleeping");
    big = now ? hms((now.getTime() - new Date(tracking.startedAt).getTime()) / 1000) : "00:00:00";
    caption = tr(`از ${clockOf(tracking.startedAt)}`, `Since ${clockOf(tracking.startedAt)}`);
    bigCls = "is-clock is-hms";
  } else if (showLast && band) {
    kicker = tr("امتیاز دیشب", "Last night's score");
    big = faNum(scoreShown ?? lastScore!);
    caption = `${scoreBandLabel(band)} · ${durationLabel(sleepMinutes(lastNight!))}`;
    bigCls = `is-score slp-c-${band}`;
  } else if (phase === "bedtime" || phase === "night") {
    kicker = tr("وقت خوابه", "Bedtime");
    big = now ? `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}` : "--:--";
    bigCls = "is-clock";
  } else if (phase === "morning" && !lastNight) {
    kicker = tr("صبح بخیر", "Good morning");
    big = tr("دیشب؟", "Last night?");
    caption = tr("هنوز ثبت نشده", "Not logged yet");
    bigCls = "is-word";
  } else {
    kicker = tr("تا وقت خواب", "Until bedtime");
    const toBed = minutesUntil(Math.floor(nowMin ?? 0), target.sleep) ?? 0;
    big = now ? hms(toBed * 60 - now.getSeconds()) : "--:--:--";
    bigCls = "is-clock is-hms";
  }

  // ثانیه فقط وقتی دیده می‌شه که وسط صفحه ساعت h:m:s باشه (ردیاب زنده/شمارش معکوس)؛
  // در بقیه حالت‌ها هر دقیقه (روی مرز دقیقه) یک رندر کافیه، نه هر ثانیه کل SVG.
  const fast = bigCls.includes("is-hms");
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const step = () => {
      setNow(new Date());
      t = setTimeout(step, fast ? 1000 : 60_000 - (Date.now() % 60_000) + 30);
    };
    step();
    return () => clearTimeout(t);
  }, [fast]);

  // ثبت یک‌ضربه: دیشب ثبت نشده، صبح/روز و ساعت بیداری هدف گذشته
  const canQuick = !!onQuickLog && loaded && !lastNight && !tracking && (phase === "morning" || phase === "day")
    && nowMin !== null && nowMin >= wakeMin;

  // نکته‌ی تک‌خطی زیر ساعت + اطلاعات زنده‌ی دو باکس (چرخه‌ها، هدف)
  const hint = loaded && nowMin !== null
    ? dialHint({
        phase, nowMin, bedtime: target.sleep, lastNightMin: lastNight ? sleepMinutes(lastNight) : null,
        goalMin, goalStreak, debt7Min, tracking: !!tracking,
      })
    : null;
  const HintIcon = hint ? HINT_ICON[hint.kind] : null;
  const cycleInfo = nowMin !== null ? cycleTileInfo(nowMin, bedMin, latency, goalMin, phase, tracking ? trackFrom : null) : null;
  // اندازه و جای عمودی متن وسط (نسبت به مرکز)؛ امتیاز درشت و فاصله‌ها بازتر
  const isScore = bigCls.includes("is-score");
  const baseBig = isScore ? 68 : bigCls.includes("is-hms") ? 30 : bigCls.includes("is-word") ? 34 : 46;
  const cy = isScore
    ? { kicker: -44, big: -4, caption: 36, caption2: 0 }
    : caption ? { kicker: -32, big: 0, caption: 32, caption2: 0 } : { kicker: -24, big: 6, caption: 0, caption2: 0 };

  const nowAngle = nowMin !== null ? minuteToAngle(nowMin) : 0;
  const handA = pointAt(C, R_HAND_IN, nowAngle);
  const handB = pointAt(C, R_HAND_OUT, nowAngle);
  const bedPt = pointAt(C, R_GOAL, minuteToAngle(bedMin));
  const wakePt = pointAt(C, R_GOAL, minuteToAngle(wakeMin));
  const cycleDots = useMemo(() => cycleBoundaries(bedMin, wakeMin, latency).map((m) => pointAt(C, R_GOAL, minuteToAngle(m))), [bedMin, wakeMin, latency]);
  const stars = useMemo(() => starField(30, 11, C, 120, 68, 64), []);
  const draw = reduce ? { duration: 0 } : { duration: 1.2, ease: EASE };

  const glow = isMorning && !tracking ? "var(--slp-fair)" : "var(--slp-ink)";
  const trackPt = tracking && nowMin !== null ? pointAt(C, R_LAST, minuteToAngle(nowMin)) : null;

  // سلام و تاریخ امروز (بعد از mount، تا بین سرور و کلاینت اختلافی نباشه)
  const gk = now ? greetKey(now.getHours()) : null;
  const GreetIcon = gk === "morning" ? Sunrise : gk === "afternoon" ? Sun : gk === "evening" ? Sunset : MoonStar;
  const greet = gk === "morning" ? tr("صبح بخیر", "Good morning")
    : gk === "afternoon" ? tr("عصر بخیر", "Good afternoon")
    : gk === "evening" ? tr("شب بخیر", "Good evening")
    : tr("شب بخیر", "Good night");
  const dateText = now ? (() => {
    const [, jm, jd] = toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    return `${weekdayName(now.getDay())} ${faNum(jd)} ${jMonthName(jm - 1)}`;
  })() : "";

  return (
    <section className="sl-card sld m-rise" aria-live="polite" data-phase={tracking ? "tracking" : phase}>
      <header className="sld-head">
        <div className="sld-greet" aria-hidden={!now}>
          <span className="sld-greet-k">{now && <GreetIcon aria-hidden />}{greet}</span>
          <b>{dateText}</b>
        </div>
        {showStats && (
          <Link href="/analysis/weekly#sleep" prefetch={false} className="slp-stats-link">
            <BarChart3 aria-hidden /> {tr("آمار خواب", "Sleep stats")}
          </Link>
        )}
      </header>

      <div className="sld-dial">
        <svg viewBox={`${VB} ${VB} ${S - 2 * VB} ${S - 2 * VB}`} className="sld-svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${kicker} ${big} ${caption} ${caption2}`.trim()}>
          <defs>
            <linearGradient id={`sldg${uid}`} gradientUnits="userSpaceOnUse" x1={bedPt.x} y1={bedPt.y} x2={wakePt.x} y2={wakePt.y}>
              <stop offset="0%" style={{ stopColor: "var(--sld-arc-a)" }} />
              <stop offset="100%" style={{ stopColor: "var(--sld-arc-b)" }} />
            </linearGradient>
            <radialGradient id={`sldf${uid}`} cx="50%" cy="42%" r="64%">
              <stop offset="0%" style={{ stopColor: "var(--sld-face-a)" }} />
              <stop offset="100%" style={{ stopColor: "var(--sld-face-b)" }} />
            </radialGradient>
            <radialGradient id={`sldr${uid}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" style={{ stopColor: glow }} stopOpacity=".2" />
              <stop offset="65%" style={{ stopColor: glow }} stopOpacity=".06" />
              <stop offset="100%" style={{ stopColor: glow }} stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`sldm${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" style={{ stopColor: "var(--sld-moon-a)" }} />
              <stop offset="100%" style={{ stopColor: "var(--sld-moon-b)" }} />
            </linearGradient>
            <linearGradient id={`sldn${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" style={{ stopColor: "var(--sld-sun-a)" }} />
              <stop offset="100%" style={{ stopColor: "var(--sld-sun-b)" }} />
            </linearGradient>
            <filter id={`sldb${uid}`} x="-25%" y="-25%" width="150%" height="150%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>

          {/* صفحه‌ی ساعت: آسمان شب با کم‌رنگ‌شدن به لبه */}
          <circle cx={C} cy={C} r={R_FACE} fill={`url(#sldf${uid})`} className="sld-face" />
          <circle cx={C} cy={C} r={R_FACE} className="sld-rim" />
          <g className="sld-stars" aria-hidden="true">
            {stars.map((st, i) => <circle key={i} cx={st.x} cy={st.y} r={st.r} opacity={st.o} />)}
          </g>
          <circle cx={C} cy={C} r={R_GOAL - 12} fill={`url(#sldr${uid})`} aria-hidden="true" />
          <circle cx={C} cy={C} r={R_LAST - 15} className="sld-bezel" aria-hidden="true" />

          {/* خط زمان 24 ساعته */}
          <circle cx={C} cy={C} r={R_GOAL} className="sld-track" />
          <circle cx={C} cy={C} r={R_LAST} className="sld-lane" />
          {Array.from({ length: 24 }, (_, h) => {
            const a = minuteToAngle(h * 60);
            const major = h % 6 === 0;
            const p0 = pointAt(C, 123, a);
            const p1 = pointAt(C, major ? 132 : 127.5, a);
            return <line key={h} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} className={major ? "sld-tick is-major" : "sld-tick"} />;
          })}
          {Array.from({ length: 8 }, (_, k) => {
            const h = k * 3;
            const p = pointAt(C, R_NUM, minuteToAngle(h * 60));
            return <text key={h} x={p.x} y={p.y} className={h % 6 === 0 ? "sld-hour is-major" : "sld-hour"} textAnchor="middle" dominantBaseline="central">{String(h).padStart(2, "0")}</text>;
          })}

          {/* پنجره‌ی هدف خواب: درخشش ثابت نرم + قوس گرادیانی */}
          <motion.path
            d={arcPath(C, R_GOAL, bedMin, wakeMin)}
            className="sld-goal-glow"
            stroke={`url(#sldg${uid})`}
            filter={`url(#sldb${uid})`}
            aria-hidden="true"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={draw}
          />
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
            {cycleDots.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={2} className="sld-cyc" />)}
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

          {/* سر قوس ردیاب زنده (نبض فقط با transform/opacity) */}
          {trackPt && (
            <g aria-hidden="true">
              <circle cx={trackPt.x} cy={trackPt.y} r={9} className="sld-head-halo" />
              <circle cx={trackPt.x} cy={trackPt.y} r={4.2} className="sld-head" />
            </g>
          )}

          {/* عقربه‌ی همین لحظه: از شیار داخلی تا حلقه‌ی بیرونی */}
          {nowMin !== null && (
            <g aria-hidden="true">
              <line x1={handA.x} y1={handA.y} x2={handB.x} y2={handB.y} className="sld-hand" />
              <circle cx={handB.x} cy={handB.y} r={8} className="sld-now-halo" />
              <circle cx={handB.x} cy={handB.y} r={4} className="sld-now" />
            </g>
          )}

          {/* ماه و خورشید: دو دیسک روی دو سر قوس هدف */}
          <circle cx={bedPt.x} cy={bedPt.y} r={PIN_R} fill={`url(#sldm${uid})`} className="sld-disc" />
          <Moon className="sld-pin is-moon" x={bedPt.x - PIN / 2} y={bedPt.y - PIN / 2} width={PIN} height={PIN} />
          <circle cx={wakePt.x} cy={wakePt.y} r={PIN_R} fill={`url(#sldn${uid})`} className="sld-disc" />
          <Sun className="sld-pin is-sun" x={wakePt.x - PIN / 2} y={wakePt.y - PIN / 2} width={PIN} height={PIN} />

        </svg>
        {/* متن وسط: HTML روی ساعت (متن فارسی داخل SVG در وب‌کیت حروف رو جدا و برعکس می‌کشید) */}
        <div className="sld-center" aria-hidden="true">
          <span className="sld-kicker" style={centerLine(cy.kicker, fitFontSize(kicker, 12.5, CENTER_W))}>{kicker}</span>
          <span className={`sld-big ${bigCls}`} style={centerLine(cy.big, fitFontSize(big, baseBig, CENTER_W))}>{big}</span>
          {caption && <span className={`sld-caption${isScore && band ? ` is-band slp-c-${band}` : ""}`} style={centerLine(cy.caption, fitFontSize(caption, 13, CENTER_W))}>{caption}</span>}
          {caption2 && <span className="sld-caption is-sub" style={centerLine(cy.caption2, fitFontSize(caption2, 12, CENTER_W))}>{caption2}</span>}
        </div>
      </div>

      {/* ساعت‌های هدف (فقط نمایش؛ ویرایش از باکس هدف خواب) */}
      <div className="sld-times" dir="auto">
        <span className="sld-time">
          <span className="sld-time-ico" aria-hidden><Moon /></span>
          <span className="sld-time-txt"><small>{tr("خواب", "Sleep")}</small><b>{target.sleep}</b></span>
        </span>
        <span className="sld-span" aria-label={tr(`هدف ${durationLabel(goalMin)}`, `Goal ${durationLabel(goalMin)}`)}>
          <i aria-hidden />
          <em>{durationLabel(goalMin)}</em>
          <i aria-hidden />
        </span>
        <span className="sld-time is-wake">
          <span className="sld-time-ico" aria-hidden><Sun /></span>
          <span className="sld-time-txt"><small>{tr("بیداری", "Wake")}</small><b>{target.wake}</b></span>
        </span>
      </div>

      {/* دو باکس هوشمند: چرخه‌های خواب و هدف خواب */}
      <div className="sld-tiles">
        {onOpenCycles ? (
          <SleepCycleButton onClick={onOpenCycles} onPreload={onPreloadCycles} info={cycleInfo} bedtime={target.sleep} />
        ) : null}
        <button type="button" className="sld-tile is-goal" onClick={onEditGoal}>
          <span className="sld-tile-ico" aria-hidden><Target /></span>
          <ChevronLeft className="sld-tile-go dir-flip" aria-hidden />
          <span className="sld-tile-txt">
            <small>{tr("هدف خواب", "Sleep goal")}</small>
            <b>{durationLabel(goalMin)}</b>
            <em>{tr("تغییر", "Change")}</em>
          </span>
        </button>
      </div>

      {/* نکته‌ی شخصی تک‌خطی */}
      {hint && HintIcon && (
        <p className={`sld-insight is-${hint.tone}`}>
          <HintIcon aria-hidden /><span>{dialHintText(hint)}</span>
        </p>
      )}

      <div className="sld-actions">
        {tracking ? (
          <>
            <button type="button" className="btn btn-primary" onClick={onWakeUp}>{tr("بیدار شدم", "I'm awake")}</button>
            <button type="button" className="btn btn-ghost sld-cancel" onClick={() => stopTracking()}>{tr("لغو", "Cancel")}</button>
          </>
        ) : phase === "winddown" || phase === "bedtime" || phase === "night" ? (
          <>
            <button type="button" className="btn btn-primary" onClick={() => startTracking()}>{tr("دارم می‌خوابم", "I'm going to sleep")}</button>
            <button type="button" className="btn btn-outline sld-secondary" onClick={onLog}>{lastNight ? tr("ویرایش دیشب", "Edit last night") : tr("ثبت دیشب", "Log last night")}</button>
          </>
        ) : (
          <button type="button" className={lastNight ? "btn btn-outline" : "btn btn-primary"} onClick={onLog}>
            {lastNight ? tr("ویرایش خواب دیشب", "Edit last night's sleep") : tr("ثبت خواب دیشب", "Log last night's sleep")}
          </button>
        )}
      </div>

      {canQuick && (
        <button type="button" className="btn btn-ghost btn-sm sld-quick" onClick={onQuickLog} disabled={quickBusy}>
          {quickBusy && <Spinner label={null} />}
          <Check aria-hidden />
          <span>{tr(`طبق برنامه خوابیدم (${target.sleep} تا ${target.wake})`, `Slept as planned (${target.sleep} to ${target.wake})`)}</span>
        </button>
      )}
      {quickError && <p className="sl-err sld-quick-err" role="alert">{quickError}</p>}
    </section>
  );
}
