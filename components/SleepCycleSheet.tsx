"use client";

import "./sleep-cycle.css";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { SegmentedTabs } from "./SegmentedTabs";
import { TimeInput } from "./TimeInput";
import { SleepCycleList } from "./SleepCycleList";
import { SleepCycleHypnogram } from "./SleepCycleHypnogram";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { isEn, tr } from "@/lib/i18n";
import { clockOf, durationLabel, sleepMinutes, type SleepRecord } from "@/lib/sleep";
import { hhmmToMin } from "@/lib/sleepDial";
import {
  LATENCY_PRESETS, analyzeNight, bedOptions, normalizeLatency, wakeOptions, type WakeVerdict,
} from "@/lib/sleepCycles";

// پنجره‌ی «چرخه‌های خواب» — تنها ورودیش چیپ روی کارت صفحه‌ی ساعت (SleepDial)،
// پس خود صفحه‌ی خواب همچنان دو کارته. چهار بخش با SegmentedTabs: همین الان،
// بیدارشدن در ساعت X، خوابیدن در ساعت X، و چرخه‌های دیشب. منطق خالص در
// lib/sleepCycles.ts. فقط وقتی باز باشه رندر می‌شه و ساعت زنده‌اش هر 20 ثانیه
// فقط اگه دقیقه عوض شده باشه استیت می‌گیره.

type Mode = "now" | "wake" | "bed" | "last";

const modes = (): { value: Mode; label: string }[] => [
  { value: "now", label: tr("الان", "Now") },
  { value: "wake", label: tr("بیداری", "Wake") },
  { value: "bed", label: tr("خواب", "Bed") },
  { value: "last", label: tr("دیشب", "Last night") },
];

const verdictText = (): Record<WakeVerdict, { title: string; text: string }> => ({
  good: { title: tr("بیدارشدن سبک", "Light wake-up"), text: tr("نزدیک پایان یه چرخه بیدار شدی؛ معمولا سبک‌تر و سرحال‌تری.", "You woke near the end of a cycle, so you probably feel lighter and fresher.") },
  ok: { title: tr("بیدارشدن معمولی", "Normal wake-up"), text: tr("کمی با مرز چرخه فاصله داشتی؛ احتمالا بد نبوده.", "You were a little away from a cycle boundary; it probably wasn't bad.") },
  groggy: { title: tr("وسط یه چرخه", "Mid-cycle"), text: tr("وسط یه چرخه بیدار شدی؛ ممکنه کمی گیج و خواب‌آلود بوده باشی.", "You woke in the middle of a cycle, so you may have felt a bit groggy.") },
});

function minuteNow(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export default function SleepCycleSheet({
  open, onClose, target, goalMin, latency, onLatencyChange, lastNight,
}: {
  open: boolean;
  onClose: () => void;
  target: { wake: string; sleep: string };
  goalMin: number;
  latency: number;
  onLatencyChange: (min: number) => void;
  lastNight: SleepRecord | null;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !open) return null;
  return createPortal(
    <Body onClose={onClose} target={target} goalMin={goalMin} latency={latency} onLatencyChange={onLatencyChange} lastNight={lastNight} />,
    document.body,
  );
}

function Body({
  onClose, target, goalMin, latency, onLatencyChange, lastNight,
}: Omit<Parameters<typeof SleepCycleSheet>[0], "open">) {
  useLockBodyScroll();
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<Mode>("now");
  const [wakeAt, setWakeAt] = useState(target.wake);
  const [bedAt, setBedAt] = useState(target.sleep);
  const [nowMin, setNowMin] = useState(minuteNow);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  useEffect(() => {
    const t = setInterval(() => setNowMin((p) => { const n = minuteNow(); return n === p ? p : n; }), 20_000);
    return () => clearInterval(t);
  }, []);

  const nowOpts = useMemo(() => wakeOptions(nowMin, latency, goalMin), [nowMin, latency, goalMin]);
  const wakeMin = hhmmToMin(wakeAt);
  const bedMin = hhmmToMin(bedAt);
  const wakeOpts = useMemo(() => (wakeMin === null ? null : bedOptions(wakeMin, latency, goalMin)), [wakeMin, latency, goalMin]);
  const bedOpts = useMemo(() => (bedMin === null ? null : wakeOptions(bedMin, latency, goalMin)), [bedMin, latency, goalMin]);

  const nowClock = `${String(Math.floor(nowMin / 60)).padStart(2, "0")}:${String(nowMin % 60).padStart(2, "0")}`;

  return (
    <>
      <div className="modal-overlay open" onClick={onClose} />
      <div className="modal-panel liquid-glass-panel open sleep-scope slc-panel" role="dialog" aria-modal="true" aria-label={tr("چرخه‌های خواب", "Sleep cycles")} dir={isEn() ? "ltr" : "rtl"}>
        <div className="modal-head">
          <div className="modal-title">{tr("چرخه‌های خواب", "Sleep cycles")}</div>
          <button type="button" className="nav-close" onClick={onClose} aria-label={tr("بستن", "Close")}>×</button>
        </div>

        <p className="slc-intro">{tr("هر چرخه حدود 90 دقیقه‌ست؛ بیدارشدن پایان چرخه سبک‌تر از وسط خواب عمیقه.", "Each cycle is about 90 minutes; waking at the end of a cycle feels lighter than waking in deep sleep.")}</p>

        <SegmentedTabs<Mode> options={modes()} active={mode} onChange={setMode} className="slc-tabs" ariaLabel={tr("بخش‌های چرخه‌ی خواب", "Sleep cycle sections")} />

          <motion.div
            key={mode}
            className="slc-section"
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            {mode === "now" && (
              <>
                <h3 className="slc-q">{tr("اگه همین الان (", "If I fall asleep right now (")}<span dir="ltr">{nowClock}</span>{tr(") بخوابم، کی بیدار شم؟", "), when should I wake up?")}</h3>
                <SleepCycleList options={nowOpts} listKey={`now-${nowMin}-${latency}`} />
              </>
            )}

            {mode === "wake" && (
              <>
                <label className="slc-field">
                  <span>{tr("می‌خوام ساعت", "I want to wake at")}</span>
                  <TimeInput value={wakeAt} onChange={setWakeAt} className="wsearch-newform-name" />
                  <span>{tr("بیدار شم، کی بخوابم؟", "— when should I go to bed?")}</span>
                </label>
                {wakeOpts ? <SleepCycleList options={wakeOpts} listKey={`wake-${wakeAt}-${latency}`} /> : <p className="slc-hint">{tr("ساعت رو کامل وارد کن، مثل 07:00", "Enter the full time, like 07:00")}</p>}
              </>
            )}

            {mode === "bed" && (
              <>
                <label className="slc-field">
                  <span>{tr("اگه ساعت", "If I go to bed at")}</span>
                  <TimeInput value={bedAt} onChange={setBedAt} className="wsearch-newform-name" />
                  <span>{tr("بخوابم، کی بیدار شم؟", "— when should I wake up?")}</span>
                </label>
                {bedOpts ? <SleepCycleList options={bedOpts} listKey={`bed-${bedAt}-${latency}`} /> : <p className="slc-hint">{tr("ساعت رو کامل وارد کن، مثل 23:30", "Enter the full time, like 23:30")}</p>}
              </>
            )}

            {mode === "last" && <LastNight lastNight={lastNight} latency={latency} />}
          </motion.div>

        <div className="slc-latency">
          <span className="slc-latency-title">{tr("چند دقیقه طول می‌کشه خوابت ببره؟", "How many minutes does it take you to fall asleep?")}</span>
          <SegmentedTabs<string>
            options={LATENCY_PRESETS.map((p) => ({ value: String(p), label: <span dir="ltr">{p}</span> }))}
            active={String(latency)}
            onChange={(v) => onLatencyChange(normalizeLatency(Number(v)))}
            className="slc-latency-tabs"
            ariaLabel={tr("زمان به خواب رفتن به دقیقه", "Time to fall asleep in minutes")}
          />
        </div>
      </div>
    </>
  );
}

function LastNight({ lastNight, latency }: { lastNight: SleepRecord | null; latency: number }) {
  const info = useMemo(() => {
    if (!lastNight) return null;
    const total = sleepMinutes(lastNight);
    if (total <= 0) return null;
    const lat = Math.min(normalizeLatency(lastNight.latencyMin ?? latency), total);
    return { total, lat, a: analyzeNight(total, lat), start: clockOf(lastNight.sleptAt), end: clockOf(lastNight.wokeAt) };
  }, [lastNight, latency]);

  if (!info) {
    return <p className="slc-hint">{tr("خواب دیشبت هنوز ثبت نشده. بعد از ثبتش، چرخه‌هاش این‌جا دیده می‌شن.", "Last night's sleep isn't logged yet. Once you log it, its cycles will show up here.")}</p>;
  }
  const v = verdictText()[info.a.verdict];
  return (
    <>
      <div className="slc-last-head">
        <b className="slc-last-big"><span dir="ltr">{info.a.fullCycles}</span> {tr("چرخه کامل", info.a.fullCycles === 1 ? "full cycle" : "full cycles")}</b>
        <small>{durationLabel(info.a.asleepMin)} {tr("خواب", "asleep")}</small>
      </div>
      <div className={`slc-verdict is-${info.a.verdict}`}>
        <b>{v.title}</b>
        <span>{v.text}</span>
      </div>
      <div className="slc-hypno-head">
        <span>{tr("مراحل خواب", "Sleep stages")}</span>
        <em>{tr("تخمینی", "Estimated")}</em>
      </div>
      <SleepCycleHypnogram totalMin={info.total} latency={info.lat} startClock={info.start} endClock={info.end} />
    </>
  );
}
