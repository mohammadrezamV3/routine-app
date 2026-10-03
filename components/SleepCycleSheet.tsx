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

const MODES: { value: Mode; label: string }[] = [
  { value: "now", label: "الان" },
  { value: "wake", label: "بیداری" },
  { value: "bed", label: "خواب" },
  { value: "last", label: "دیشب" },
];

const VERDICT_TEXT: Record<WakeVerdict, { title: string; text: string }> = {
  good: { title: "بیدارشدن سبک", text: "نزدیک پایان یه چرخه بیدار شدی؛ معمولا سبک‌تر و سرحال‌تری." },
  ok: { title: "بیدارشدن معمولی", text: "کمی با مرز چرخه فاصله داشتی؛ احتمالا بد نبوده." },
  groggy: { title: "وسط یه چرخه", text: "وسط یه چرخه بیدار شدی؛ ممکنه کمی گیج و خواب‌آلود بوده باشی." },
};

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
      <div className="modal-panel liquid-glass-panel open sleep-scope slc-panel" role="dialog" aria-modal="true" aria-label="چرخه‌های خواب" dir="rtl">
        <div className="modal-head">
          <div className="modal-title">چرخه‌های خواب</div>
          <button type="button" className="nav-close" onClick={onClose} aria-label="بستن">×</button>
        </div>

        <p className="slc-intro">هر چرخه حدود 90 دقیقه‌ست؛ بیدارشدن پایان چرخه سبک‌تر از وسط خواب عمیقه.</p>

        <SegmentedTabs<Mode> options={MODES} active={mode} onChange={setMode} className="slc-tabs" ariaLabel="بخش‌های چرخه‌ی خواب" />

          <motion.div
            key={mode}
            className="slc-section"
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            {mode === "now" && (
              <>
                <h3 className="slc-q">اگه همین الان (<span dir="ltr">{nowClock}</span>) بخوابم، کی بیدار شم؟</h3>
                <SleepCycleList options={nowOpts} listKey={`now-${nowMin}-${latency}`} />
              </>
            )}

            {mode === "wake" && (
              <>
                <label className="slc-field">
                  <span>می‌خوام ساعت</span>
                  <TimeInput value={wakeAt} onChange={setWakeAt} className="wsearch-newform-name" />
                  <span>بیدار شم، کی بخوابم؟</span>
                </label>
                {wakeOpts ? <SleepCycleList options={wakeOpts} listKey={`wake-${wakeAt}-${latency}`} /> : <p className="slc-hint">ساعت رو کامل وارد کن، مثل 07:00</p>}
              </>
            )}

            {mode === "bed" && (
              <>
                <label className="slc-field">
                  <span>اگه ساعت</span>
                  <TimeInput value={bedAt} onChange={setBedAt} className="wsearch-newform-name" />
                  <span>بخوابم، کی بیدار شم؟</span>
                </label>
                {bedOpts ? <SleepCycleList options={bedOpts} listKey={`bed-${bedAt}-${latency}`} /> : <p className="slc-hint">ساعت رو کامل وارد کن، مثل 23:30</p>}
              </>
            )}

            {mode === "last" && <LastNight lastNight={lastNight} latency={latency} />}
          </motion.div>

        <div className="slc-latency">
          <span className="slc-latency-title">چند دقیقه طول می‌کشه خوابت ببره؟</span>
          <SegmentedTabs<string>
            options={LATENCY_PRESETS.map((p) => ({ value: String(p), label: <span dir="ltr">{p}</span> }))}
            active={String(latency)}
            onChange={(v) => onLatencyChange(normalizeLatency(Number(v)))}
            className="slc-latency-tabs"
            ariaLabel="زمان به خواب رفتن به دقیقه"
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
    return <p className="slc-hint">خواب دیشبت هنوز ثبت نشده. بعد از ثبتش، چرخه‌هاش این‌جا دیده می‌شن.</p>;
  }
  const v = VERDICT_TEXT[info.a.verdict];
  return (
    <>
      <div className="slc-last-head">
        <b className="slc-last-big"><span dir="ltr">{info.a.fullCycles}</span> چرخه کامل</b>
        <small>{durationLabel(info.a.asleepMin)} خواب</small>
      </div>
      <div className={`slc-verdict is-${info.a.verdict}`}>
        <b>{v.title}</b>
        <span>{v.text}</span>
      </div>
      <div className="slc-hypno-head">
        <span>مراحل خواب</span>
        <em>تخمینی</em>
      </div>
      <SleepCycleHypnogram totalMin={info.total} latency={info.lat} startClock={info.start} endClock={info.end} />
    </>
  );
}
