"use client";

import "./sleep-log.css";
import "./sleep-tools.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pause, Play, Square } from "lucide-react";
import { GradientRing, RING_BLUE } from "./GradientRing";
import { SegmentedTabs } from "./SegmentedTabs";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { useSheetFocus } from "@/lib/useSheetFocus";
import { tr } from "@/lib/i18n";
import {
  BREATH_MINUTES, BREATH_PATTERNS, BREATH_PATTERN_IDS, DEFAULT_BREATH_MINUTES, DEFAULT_BREATH_PATTERN,
  breathProgress, normalizeMinutes, normalizePattern, scaleAt, sessionSec, stateAt, targetScale, totalRounds,
  type BreathPatternId, type BreathPhaseKind,
} from "@/lib/sleepBreath";

// تنفس آرام: دایره‌ی بزرگ با دم/نگه‌دار/بازدم، شمارش ثانیه‌ی فاز و پیشرفت جلسه با حلقه.

export type SleepBreathSheetProps = { open: boolean; onClose: () => void };

type Run = "idle" | "running" | "paused" | "done";
const MIN_SCALE = 0.55;

const phaseLabel = (k: BreathPhaseKind) =>
  k === "inhale" ? tr("دم", "Inhale") : k === "exhale" ? tr("بازدم", "Exhale") : k === "hold" ? tr("نگه دار", "Hold") : tr("مکث", "Rest");
const patternHint = (id: BreathPatternId) =>
  id === "478" ? tr("دم 4، نگه داشتن 7، بازدم 8", "Inhale 4, hold 7, exhale 8")
    : id === "box" ? tr("دم، نگه داشتن، بازدم و مکث هر کدام 4 ثانیه", "Inhale, hold, exhale, rest: 4 seconds each")
      : tr("دم 4 و بازدم 6 ثانیه", "Inhale 4, exhale 6 seconds");

export function SleepBreathSheet(props: SleepBreathSheetProps) {
  if (!props.open || typeof document === "undefined") return null;
  return createPortal(<SheetBody {...props} />, document.body);
}

function SheetBody({ onClose }: SleepBreathSheetProps) {
  useLockBodyScroll();
  const [patternId, setPatternId] = useState<BreathPatternId>(DEFAULT_BREATH_PATTERN);
  const [minutes, setMinutes] = useState<number>(DEFAULT_BREATH_MINUTES);
  const [run, setRun] = useState<Run>("idle");
  const [elapsed, setElapsed] = useState(0); // ثانیه
  const accRef = useRef(0); // میلی‌ثانیه‌ی جمع‌شده تا آخرین مکث
  const t0Ref = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const lastPhaseRef = useRef("");
  useSheetFocus(panelRef);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const total = sessionSec(patternId, minutes);
  const rounds = totalRounds(patternId, minutes);

  // ساعت جلسه؛ با بستن پنجره (unmount) تایمر هم پاک می‌شه
  useEffect(() => {
    if (run !== "running") return;
    t0Ref.current = performance.now();
    const id = window.setInterval(() => {
      const e = (accRef.current + performance.now() - t0Ref.current) / 1000;
      if (e >= total) {
        accRef.current = total * 1000;
        setElapsed(total);
        setRun("done");
        return;
      }
      setElapsed(e);
    }, 100);
    return () => {
      window.clearInterval(id);
      accRef.current += performance.now() - t0Ref.current;
    };
  }, [run, total]);

  const st = useMemo(() => stateAt(patternId, minutes, elapsed), [patternId, minutes, elapsed]);

  // لرزش ملایم هنگام عوض شدن فاز و پایان جلسه
  useEffect(() => {
    if (run === "idle") { lastPhaseRef.current = ""; return; }
    if (run === "done") { try { navigator.vibrate?.([30, 60, 30]); } catch { /* */ } return; }
    if (run !== "running") return;
    const key = `${st.round}-${st.phaseIndex}`;
    if (key !== lastPhaseRef.current) {
      lastPhaseRef.current = key;
      try { navigator.vibrate?.(12); } catch { /* */ }
    }
  }, [run, st.round, st.phaseIndex]);

  const start = useCallback(() => {
    accRef.current = 0;
    lastPhaseRef.current = "";
    setElapsed(0);
    setRun("running");
  }, []);
  const pause = useCallback(() => setRun("paused"), []);
  const resume = useCallback(() => setRun("running"), []);
  const stop = useCallback(() => { accRef.current = 0; setElapsed(0); setRun("idle"); }, []);

  // دایره: در حال اجرا تا مقیاس هدف فاز با مدت همون فاز می‌ره؛ مکث همون‌جا می‌ایسته
  let scale = MIN_SCALE;
  let dur = 0.4;
  if (run === "running" && !st.done) {
    scale = MIN_SCALE + (1 - MIN_SCALE) * targetScale(st.kind);
    dur = st.phaseSec;
  } else if (run === "paused") {
    scale = MIN_SCALE + (1 - MIN_SCALE) * scaleAt(patternId, minutes, elapsed);
    dur = 0.15;
  }
  // اولین فریم اجرا: از مقیاس شروع می‌ره و بعد به هدف فاز (transition دیده بشه)
  const circleStyle = { transform: `scale(${scale})`, transitionDuration: `${dur}s` };

  const busy = run === "running" || run === "paused";
  const patternOpts = BREATH_PATTERN_IDS.map((id) => ({ value: id, label: id === "478" ? "4-7-8" : id === "box" ? "4-4-4-4" : "4-6" }));
  const minuteOpts = BREATH_MINUTES.map((m) => ({ value: String(m), label: tr(`${m} دقیقه`, `${m} min`) }));

  const centerLabel = run === "idle" ? tr("آماده", "Ready") : run === "done" ? tr("تمام شد", "Done") : phaseLabel(st.kind);
  const centerNum = run === "idle" || run === "done" ? null : st.left;
  const roundNow = run === "idle" ? 0 : Math.min(rounds, st.round);

  return (
    <>
      <div className="modal-overlay open" onClick={onClose} />
      <div ref={panelRef} tabIndex={-1} className="modal-panel liquid-glass-panel open sleep-scope slg-panel" role="dialog" aria-modal="true" aria-label={tr("تنفس آرام", "Calm breathing")}>
        <div className="modal-head">
          <div className="modal-title">{tr("تنفس آرام", "Calm breathing")}</div>
          <button className="nav-close" onClick={onClose} aria-label={tr("بستن", "Close")}>×</button>
        </div>

        <div className="slg-body stl-body">
          <div className="stl-opts">
            <SegmentedTabs
              className="seg-flush"
              ariaLabel={tr("الگوی تنفس", "Breathing pattern")}
              options={patternOpts}
              active={patternId}
              disabled={busy}
              onChange={(v) => setPatternId(normalizePattern(v))}
            />
            <span className="stl-hint">{patternHint(patternId)}</span>
            <SegmentedTabs
              className="seg-flush"
              ariaLabel={tr("مدت جلسه", "Session length")}
              options={minuteOpts}
              active={String(minutes)}
              disabled={busy}
              onChange={(v) => setMinutes(normalizeMinutes(v))}
            />
          </div>

          <div className="stl-stage" role="timer" aria-label={`${centerLabel}${centerNum != null ? ` ${centerNum}` : ""}`}>
            <div className="stl-circle" style={circleStyle} aria-hidden="true" />
            <GradientRing value={run === "idle" ? 0 : breathProgress(patternId, minutes, elapsed)} size={250} stroke={7} grad={RING_BLUE} className="stl-ring">
              <span className="stl-center">
                <b className="stl-phase">{centerLabel}</b>
                {centerNum != null && <span className="stl-num">{centerNum}</span>}
              </span>
            </GradientRing>
          </div>

          <div className="stl-meta" aria-live="off">
            <span>{tr(`دور ${roundNow} از ${rounds}`, `Round ${roundNow} of ${rounds}`)}</span>
            <span dir="ltr">{fmt(Math.max(0, total - elapsed))}</span>
          </div>
        </div>

        <div className="slg-foot">
          <div className="slg-actions">
            {run === "idle" && (
              <button type="button" className="btn btn-primary slg-save" onClick={start}><Play aria-hidden /> {tr("شروع", "Start")}</button>
            )}
            {run === "done" && (
              <button type="button" className="btn btn-primary slg-save" onClick={start}><Play aria-hidden /> {tr("دوباره", "Again")}</button>
            )}
            {busy && (
              <>
                <button type="button" className="btn btn-ghost" onClick={stop}><Square aria-hidden /> {tr("توقف", "Stop")}</button>
                {run === "running"
                  ? <button type="button" className="btn btn-primary slg-save" onClick={pause}><Pause aria-hidden /> {tr("مکث", "Pause")}</button>
                  : <button type="button" className="btn btn-primary slg-save" onClick={resume}><Play aria-hidden /> {tr("ادامه", "Resume")}</button>}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function fmt(sec: number) {
  const s = Math.ceil(sec);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export default SleepBreathSheet;
