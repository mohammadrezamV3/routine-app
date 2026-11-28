"use client";

import "./sleep-cycle.css";
import "./sleep-log.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { m as motion, useReducedMotion } from "framer-motion";
import { SegmentedTabs } from "./SegmentedTabs";
import { SleepTimeField } from "./SleepTimeField";
import { Spinner } from "./Spinner";
import { X } from "lucide-react";
import { SleepCycleList } from "./SleepCycleList";
import { SleepCycleHypnogram } from "./SleepCycleHypnogram";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { useSheetFocus } from "@/lib/useSheetFocus";
import { isEn, tr } from "@/lib/i18n";
import { clockOf, durationLabel, minutesToClock, sleepMinutes, type SleepRecord } from "@/lib/sleep";
import { setSleepGoal } from "@/lib/sleepGoal";
import { hhmmToMin } from "@/lib/sleepDial";
import {
  LATENCY_PRESETS, CYCLE_MIN, analyzeNight, bedOptions, normalizeLatency, wakeOptions, type WakeVerdict,
} from "@/lib/sleepCycles";
import { GOAL_PRESETS_MIN, bedForDuration, clockMin, hoursShort, spanMin } from "@/lib/sleepSheetHelpers";

// پنجره‌ی «برنامه خواب»: یک پنجره برای چرخه‌های خواب و هدف خواب. پنج بخش با
// SegmentedTabs: همین الان، بیدارشدن در ساعت X، خوابیدن در ساعت X، هدف (ویرایش) و
// چرخه‌های دیشب. ورودی‌ها: کاشی‌های چرخه‌ها و هدف خواب روی کارت صفحه‌ی ساعت
// (SleepDial). منطق خالص در lib/sleepCycles.ts و lib/sleepSheetHelpers.ts. ساعت
// خواب هدف همیشه = بیداری - مدت - زمان به خواب رفتن (یک منبع)، پس مدت و دو ساعت
// هیچ‌وقت ناهم‌خوان نمی‌شن. ساعت زنده هر 20 ثانیه فقط اگه دقیقه عوض شده باشه استیت می‌گیره.

export type PlanTab = "now" | "wake" | "bed" | "goal" | "last";
type Mode = PlanTab;

const modes = (): { value: Mode; label: string }[] => [
  { value: "now", label: tr("الان", "Now") },
  { value: "wake", label: tr("بیداری", "Wake") },
  { value: "bed", label: tr("خواب", "Bed") },
  { value: "goal", label: tr("هدف", "Goal") },
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

export default function SleepPlanSheet({
  open, onClose, initialTab = "now", target, goalMin, latency, onLatencyChange, lastNight, onGoalSaved,
}: {
  open: boolean;
  onClose: () => void;
  initialTab?: PlanTab;
  target: { wake: string; sleep: string };
  goalMin: number;
  latency: number;
  onLatencyChange: (min: number) => void;
  lastNight: SleepRecord | null;
  onGoalSaved: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !open) return null;
  return createPortal(
    <Body onClose={onClose} initialTab={initialTab} target={target} goalMin={goalMin} latency={latency} onLatencyChange={onLatencyChange} lastNight={lastNight} onGoalSaved={onGoalSaved} />,
    document.body,
  );
}

/** مدت خواب (بدون زمان به خواب رفتن) هدف ذخیره‌شده؛ بیرون از 6 تا 10 ساعت → نزدیک‌ترین گزینه‌ی آماده */
function initialSleepMin(target: { wake: string; sleep: string }, goalMin: number, latency: number): number {
  const span = spanMin(target.sleep, target.wake) ?? goalMin;
  const m = Math.round(span - latency);
  if (m >= 360 && m <= 600) return m;
  let best: number = GOAL_PRESETS_MIN[0];
  for (const p of GOAL_PRESETS_MIN) if (Math.abs(p - m) < Math.abs(best - m)) best = p;
  return best;
}

function Body({
  onClose, initialTab, target, goalMin, latency, onLatencyChange, lastNight, onGoalSaved,
}: Omit<Parameters<typeof SleepPlanSheet>[0], "open">) {
  useLockBodyScroll();
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  useSheetFocus(panelRef);
  const [mode, setMode] = useState<Mode>(initialTab ?? "now");
  const [wakeAt, setWakeAt] = useState(target.wake);
  const [bedAt, setBedAt] = useState(target.sleep);
  const [nowMin, setNowMin] = useState(minuteNow);
  // هدف: ساعت بیداری + مدت خواب (دقیقه)؛ ساعت خواب از همین دو و زمان به خواب رفتن ساخته می‌شه
  const [goalWake, setGoalWake] = useState(target.wake);
  const [goalSleepMin, setGoalSleepMin] = useState(() => initialSleepMin(target, goalMin, latency));
  const [customSleepMin] = useState(goalSleepMin);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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

  const nowClock = minutesToClock(nowMin);

  // هدف: یک منبع حقیقت
  const goalSpan = goalSleepMin + latency;
  const goalBed = bedForDuration(goalWake, goalSpan);
  const goalOk = goalBed !== null && clockMin(goalWake) !== null;
  const goalDirty = goalOk && (goalBed !== target.sleep || goalWake !== target.wake);
  const durOptions = useMemo(() => {
    const list: number[] = [...GOAL_PRESETS_MIN];
    if (!list.includes(customSleepMin)) list.push(customSleepMin);
    list.sort((a, b) => a - b);
    return list.map((m) => {
      const h = m % 30 === 0 ? hoursShort(m) : `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
      return { value: String(m), label: tr(`${h} س`, `${h}h`) };
    });
  }, [customSleepMin]);

  // خلاصه‌ی بالا: خواب → بیداری و مدت بینشون، مطابق بخش فعال
  const summary = useMemo((): { bed: string; wake: string; span: number | null } => {
    const none = { bed: "--:--", wake: "--:--", span: null };
    if (mode === "goal") return goalOk ? { bed: goalBed!, wake: goalWake, span: goalSpan } : none;
    if (mode === "now") { const b = nowOpts.find((o) => o.best) ?? nowOpts[0]; return { bed: nowClock, wake: b.clock, span: b.sleepMin + latency }; }
    if (mode === "wake") { const b = wakeOpts?.find((o) => o.best); return b && wakeMin !== null ? { bed: b.clock, wake: wakeAt, span: b.sleepMin + latency } : none; }
    if (mode === "bed") { const b = bedOpts?.find((o) => o.best); return b && bedMin !== null ? { bed: bedAt, wake: b.clock, span: b.sleepMin + latency } : none; }
    if (lastNight) { const t = sleepMinutes(lastNight); if (t > 0) return { bed: clockOf(lastNight.sleptAt), wake: clockOf(lastNight.wokeAt), span: t }; }
    return none;
  }, [mode, goalOk, goalBed, goalWake, goalSpan, nowOpts, nowClock, wakeOpts, wakeMin, wakeAt, bedOpts, bedMin, bedAt, latency, lastNight]);

  async function saveGoal() {
    if (busy || !goalOk || !goalDirty || goalBed === null) return;
    setBusy(true);
    setErr(null);
    try {
      await setSleepGoal({ wake: goalWake, sleep: goalBed });
      onGoalSaved();
      onClose();
    } catch {
      setErr(tr("ذخیره نشد. دوباره امتحان کن.", "Couldn't save. Please try again."));
      setBusy(false);
    }
  }

  const cyc = goalSleepMin / CYCLE_MIN;
  const cyclesNote = Number.isInteger(cyc)
    ? tr(`${cyc} چرخه کامل`, `${cyc} full cycles`)
    : tr(`آخر چرخه نیست، نزدیک‌ترین: ${Math.round(cyc)} چرخه`, `not on a cycle edge, nearest: ${Math.round(cyc)} cycles`);

  return (
    <>
      <div className="modal-overlay open" onClick={onClose} />
      <div ref={panelRef} tabIndex={-1} className="modal-panel liquid-glass-panel open sleep-scope slg-panel slc-panel" role="dialog" aria-modal="true" aria-label={tr("برنامه خواب", "Sleep plan")} dir={isEn() ? "ltr" : "rtl"}>
        <div className="modal-head">
          <div className="modal-title">{tr("برنامه خواب", "Sleep plan")}</div>
          <button type="button" className="btn btn-ghost btn-icon btn-bare" onClick={onClose} aria-label={tr("بستن", "Close")}><X aria-hidden /></button>
        </div>

        <div className="slg-body slc-body">
          <div className="slc-sum" aria-live="polite">
            <div className="slc-sum-end"><small>{tr("خواب", "Bed")}</small><b dir="ltr">{summary.bed}</b></div>
            <div className="slc-sum-mid" aria-hidden={summary.span === null}>
              <svg viewBox="0 0 56 10" width="56" height="10" aria-hidden="true"><path d="M2 5h52" stroke="currentColor" strokeWidth="2" strokeDasharray="2 5" strokeLinecap="round" fill="none" /></svg>
              <span>{summary.span !== null ? durationLabel(summary.span) : "--"}</span>
            </div>
            <div className="slc-sum-end"><small>{tr("بیداری", "Wake")}</small><b dir="ltr">{summary.wake}</b></div>
          </div>

          <SegmentedTabs<Mode> options={modes()} active={mode} onChange={setMode} className="slc-tabs seg-flush" ariaLabel={tr("بخش‌های برنامه خواب", "Sleep plan sections")} />

          <motion.div
            key={mode}
            className="slc-section"
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            {mode === "now" && (
              <>
                <h3 className="slc-q">{tr("اگه الان (", "If I fall asleep now (")}<span dir="ltr">{nowClock}</span>{tr(") بخوابی، این ساعت‌ها آخر یک چرخه‌ان:", "), these wake times end a cycle:")}</h3>
                <SleepCycleList kind="wake" options={nowOpts} listKey={`now-${nowMin}-${latency}`} />
              </>
            )}

            {mode === "wake" && (
              <>
                <SleepTimeField label={tr("می‌خوام این ساعت بیدار شم", "I want to wake up at")} value={wakeAt} fallback={target.wake} onChange={setWakeAt} />
                {wakeOpts ? <SleepCycleList kind="bed" options={wakeOpts} listKey={`wake-${wakeAt}-${latency}`} /> : <p className="slc-hint">{tr("ساعت رو کامل وارد کن، مثل 07:00", "Enter the full time, like 07:00")}</p>}
              </>
            )}

            {mode === "bed" && (
              <>
                <SleepTimeField label={tr("می‌خوام این ساعت بخوابم", "I want to go to bed at")} value={bedAt} fallback={target.sleep} onChange={setBedAt} />
                {bedOpts ? <SleepCycleList kind="wake" options={bedOpts} listKey={`bed-${bedAt}-${latency}`} /> : <p className="slc-hint">{tr("ساعت رو کامل وارد کن، مثل 23:30", "Enter the full time, like 23:30")}</p>}
              </>
            )}

            {mode === "goal" && (
              <>
                <SleepTimeField label={tr("ساعت بیداری", "Wake-up time")} value={goalWake} fallback={target.wake} onChange={setGoalWake} />
                <div className="slc-field-block">
                  <span className="slc-label">{tr("چند ساعت بخوابی؟", "How long do you want to sleep?")}</span>
                  <SegmentedTabs<string>
                    options={durOptions}
                    active={String(goalSleepMin)}
                    onChange={(v) => setGoalSleepMin(Number(v))}
                    className="slc-dur seg-flush"
                    ariaLabel={tr("مدت هدف خواب", "Sleep goal length")}
                  />
                </div>
                <p className="slc-note">
                  {goalOk
                    ? <>{tr("برای ", "For ")}<b dir="ltr">{goalWake}</b>{tr(" باید ساعت ", " you should be in bed by ")}<b dir="ltr">{goalBed}</b>{tr(` توی رخت‌خواب باشی (${cyclesNote}، با ${latency} دقیقه تا خواب رفتن)`, ` (${cyclesNote}, including ${latency} min to fall asleep)`)}</>
                    : tr("ساعت بیداری رو کامل وارد کن، مثل 07:00", "Enter the full wake-up time, like 07:00")}
                </p>
                {err && <span className="sl-err" role="alert">{err}</span>}
              </>
            )}

            {mode === "last" && <LastNight lastNight={lastNight} latency={latency} />}
          </motion.div>
        </div>

        <div className="slg-foot slc-latency">
          <div className="slc-latency-row">
            <span className="slc-latency-title">{tr("تا خوابت ببره (دقیقه)", "Time to fall asleep (min)")}</span>
            <SegmentedTabs<string>
              options={LATENCY_PRESETS.map((p) => ({ value: String(p), label: String(p) }))}
              active={String(latency)}
              onChange={(v) => onLatencyChange(normalizeLatency(Number(v)))}
              className="slc-latency-tabs seg-flush"
              ariaLabel={tr("زمان به خواب رفتن به دقیقه", "Time to fall asleep in minutes")}
            />
          </div>
          {mode === "goal" && (
            <button type="button" className="btn btn-primary btn-lg slc-save" onClick={saveGoal} disabled={busy || !goalOk || !goalDirty}>
              {busy ? <Spinner size={14} /> : tr("ذخیره هدف", "Save goal")}
            </button>
          )}
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
    <div className="slc-last">
     <div className="slc-last-a">
      <div className="slc-last-head">
        <b className="slc-last-big"><span dir="ltr">{info.a.fullCycles}</span> {tr("چرخه کامل", info.a.fullCycles === 1 ? "full cycle" : "full cycles")}</b>
        <small>{durationLabel(info.a.asleepMin)} {tr("خواب", "asleep")}</small>
      </div>
      <dl className="slc-facts">
        <div><dt>{tr("خواب", "Bedtime")}</dt><dd dir="ltr">{info.start}</dd></div>
        <div><dt>{tr("بیداری", "Wake-up")}</dt><dd dir="ltr">{info.end}</dd></div>
        <div><dt>{tr("تا مرز چرخه", "To cycle edge")}</dt><dd>{durationLabel(info.a.offBoundaryMin)}</dd></div>
      </dl>
      <div className={`slc-verdict is-${info.a.verdict}`}>
        <b>{v.title}</b>
        <span>{v.text}</span>
      </div>
     </div>
     <div className="slc-last-b">
      <div className="slc-hypno-head">
        <span>{tr("مراحل خواب", "Sleep stages")}</span>
        <em>{tr("تخمینی", "Estimated")}</em>
      </div>
      <SleepCycleHypnogram totalMin={info.total} latency={info.lat} startClock={info.start} endClock={info.end} />
     </div>
    </div>
  );
}
