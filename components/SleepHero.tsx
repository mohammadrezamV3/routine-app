"use client";

import { useEffect, useMemo, useState } from "react";
import { GradientRing, RING_AMBER, RING_BLUE, RING_GREEN, RING_OVER, type RingGrad } from "./GradientRing";
import { faNum } from "@/lib/jalali";
import {
  SCORE_BAND_LABEL, clockOf, durationLabel, minutesUntil, moonPhase, scoreBand, sleepMinutes, sleepPhase,
  wakeTimesFor, type ScoreBand, type SleepInsights, type SleepRecord,
} from "@/lib/sleep";
import { startTracking, stopTracking, type SleepTracking } from "@/lib/sleepTracker";

// هیروی بخش خواب: بر اساس ساعت الان و ساعت‌های هدف روتین حالتش عوض می‌شه —
// صبح (ثبت دیشب / امتیاز دیشب)، روز، آماده‌شدن برای خواب (شمارش معکوس)، وقت
// خواب و شب (ردیاب زنده و ساعت‌های خوب بیداری). ماه گوشه‌ی هیرو فاز واقعی
// امشب رو نشون می‌ده.

const BAND_RING: Record<ScoreBand, RingGrad> = { great: RING_GREEN, good: RING_BLUE, fair: RING_AMBER, poor: RING_OVER };

// ستاره‌ها با جای ثابت (بدون Math.random → رندر سرور و کلاینت یکی)
const STARS = Array.from({ length: 16 }, (_, i) => ({
  x: (i * 37 + 11) % 100,
  y: (i * 53 + 7) % 70,
  d: ((i * 7) % 10) / 2.5,
  s: i % 3 === 0 ? 3 : 2,
}));

function hms(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}`;
}

function Moon({ phase }: { phase: number }) {
  // سایه‌ی ماه: بیضی که از راست (ماه نو) به چپ جابه‌جا می‌شه
  const lit = 1 - Math.abs(phase - 0.5) * 2; // 0 ماه نو، 1 کامل
  const waxing = phase < 0.5;
  const rx = 22 * Math.abs(1 - 2 * lit);
  const sweepOuter = waxing ? 1 : 0;
  const sweepInner = lit > 0.5 ? (waxing ? 0 : 1) : (waxing ? 1 : 0);
  const litPath = `M30 8 A22 22 0 0 ${sweepOuter} 30 52 A${rx.toFixed(2)} 22 0 0 ${sweepInner} 30 8 Z`;
  return (
    <svg className="slp-moon slp-moon-float" viewBox="0 0 60 60" aria-hidden="true">
      <circle cx="30" cy="30" r="22" fill="var(--slp-moon)" opacity=".16" />
      <path d={litPath} fill="var(--slp-moon)" />
      <circle cx="24" cy="24" r="3" fill="#000" opacity=".06" />
      <circle cx="35" cy="36" r="4.5" fill="#000" opacity=".05" />
    </svg>
  );
}

export function SleepHero({
  loaded,
  target,
  insights,
  lastNight,
  lastScore,
  tracking,
  onLog,
  onWakeUp,
}: {
  loaded: boolean;
  target: { wake: string; sleep: string };
  insights: SleepInsights;
  lastNight: SleepRecord | null;
  lastScore: number | null;
  tracking: SleepTracking | null;
  onLog: () => void;
  onWakeUp: () => void;
}) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const nowMin = now ? now.getHours() * 60 + now.getMinutes() : 12 * 60;
  const phase = sleepPhase(nowMin, target);
  const moon = useMemo(() => moonPhase(now ?? new Date(0)), [now ? now.toDateString() : ""]); // eslint-disable-line react-hooks/exhaustive-deps

  const toBedMin = minutesUntil(nowMin, target.sleep) ?? 0;
  const toBedSec = now ? toBedMin * 60 - now.getSeconds() : 0;
  const trackedSec = tracking && now ? (now.getTime() - new Date(tracking.startedAt).getTime()) / 1000 : 0;
  const wakeOptions = wakeTimesFor(nowMin);

  const band = lastScore !== null ? scoreBand(lastScore) : null;

  let kicker = "", title = "", sub = "";
  if (tracking) {
    kicker = "در حال خواب";
    title = "شب بخیر، خواب‌های خوب";
    sub = "صبح که بیدار شدی «بیدار شدم» رو بزن تا شبت خودکار ثبت بشه.";
  } else if (lastNight && band && (phase === "morning" || phase === "day")) {
    kicker = "دیشب";
    title = `خوابت ${SCORE_BAND_LABEL[band]} بود`;
    sub = `${durationLabel(sleepMinutes(lastNight))} · از ${clockOf(lastNight.sleptAt)} تا ${clockOf(lastNight.wokeAt)}`;
  } else if (phase === "morning" || phase === "day") {
    kicker = phase === "morning" ? "صبح بخیر" : "خواب دیشب";
    title = "دیشب چطور خوابیدی؟";
    sub = "ثبتش کمتر از ده ثانیه طول می‌کشه و امتیاز و تحلیل‌هات رو می‌سازه.";
  } else if (phase === "winddown") {
    kicker = "آماده‌شدن برای خواب";
    title = "کم‌کم وقت استراحته";
    sub = "نور رو کم کن، گوشی رو کنار بذار و یه کار آروم انجام بده.";
  } else {
    kicker = phase === "bedtime" ? "وقت خواب" : "دیروقته";
    title = "بدنت منتظر خوابه";
    sub = "اگه الان بخوابی، این ساعت‌ها برای بیدارشدن با انرژی بهترن:";
  }

  return (
    <div className="sl-card slp-hero" aria-live="polite">
      <div className="slp-hero-sky" aria-hidden="true">
        {STARS.map((s, i) => (
          <span key={i} className="slp-star" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${s.d}s` }} />
        ))}
      </div>

      <div className="slp-hero-top">
        <Moon phase={moon} />
        <div className="slp-hero-text">
          <span className="slp-hero-kicker">{kicker}</span>
          <h2 className="slp-hero-title">{title}</h2>
          <span className="slp-hero-sub">{sub}</span>
        </div>
      </div>

      {loaded && (
        <div className="slp-hero-body">
          {tracking ? (
            <div className="slp-fact">
              <span>زمان خواب تا الان</span>
              <b className="slp-countdown">{hms(trackedSec)}</b>
            </div>
          ) : lastNight && band && lastScore !== null && (phase === "morning" || phase === "day") ? (
            <>
              <GradientRing value={lastScore / 100} size={92} stroke={9} grad={BAND_RING[band]}>
                <span className="slp-score">
                  <b>{faNum(lastScore)}</b>
                  <small>امتیاز</small>
                </span>
              </GradientRing>
              <div className="slp-hero-facts">
                <div className="slp-fact"><span>هدف هر شب</span><b>{durationLabel(insights.goalMin)}</b></div>
                <div className="slp-fact"><span>بدهی خواب این هفته</span><b>{insights.debt7Min ? durationLabel(insights.debt7Min) : "صفر"}</b></div>
                <div className="slp-fact"><span>شب‌های پیاپی در هدف</span><b>{faNum(insights.goalStreak)}</b></div>
                <div className="slp-fact"><span>میانگین امتیاز</span><b>{insights.avgScore === null ? "-" : faNum(insights.avgScore)}</b></div>
              </div>
            </>
          ) : phase === "winddown" || phase === "day" ? (
            <div className="slp-fact">
              <span>تا ساعت خواب ({target.sleep})</span>
              <b className="slp-countdown">{hms(toBedSec)}</b>
            </div>
          ) : phase === "bedtime" || phase === "night" ? (
            <div className="slp-hero-facts">
              {wakeOptions.map((w) => (
                <div key={w.cycles} className="slp-fact">
                  <span>{faNum(w.cycles)} چرخه · {durationLabel(w.sleepMin)}</span>
                  <b className="mono">{w.clock}</b>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      <div className="slp-hero-actions">
        {tracking ? (
          <>
            <button type="button" className="trade-primary-btn" onClick={onWakeUp}>بیدار شدم</button>
            <button type="button" className="account-outline-btn" onClick={() => stopTracking()}>لغو ردیابی</button>
          </>
        ) : (
          <>
            {phase === "winddown" || phase === "bedtime" || phase === "night" ? (
              <button type="button" className="trade-primary-btn" onClick={() => startTracking()}>دارم می‌خوابم</button>
            ) : null}
            <button type="button" className={phase === "morning" || phase === "day" ? "trade-primary-btn" : "account-outline-btn"} onClick={onLog}>
              {lastNight ? "ویرایش خواب دیشب" : "ثبت خواب دیشب"}
            </button>
          </>
        )}
      </div>
      {tracking && (
        <div className="slp-tracking">
          <span className="slp-tracking-dot" aria-hidden="true" />
          از ساعت {clockOf(tracking.startedAt)} روی همین دستگاه
        </div>
      )}
    </div>
  );
}
