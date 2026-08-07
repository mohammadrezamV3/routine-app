"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Pause, PartyPopper, Play } from "lucide-react";
import { parseExerciseItem } from "@/lib/exerciseSets";
import { toFaDigits } from "@/lib/schedule";
import { fireTimerDone } from "@/lib/notifications";
import {
  clearExerciseTimer, loadExerciseTimer, saveExerciseTimer, PersistedExerciseTimer,
} from "@/lib/exerciseTimerStore";

const REST_SECONDS = 90;

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m > 0 && s > 0) return `${m} دقیقه و ${s} ثانیه`;
  if (m > 0) return `${m} دقیقه`;
  return `${s} ثانیه`;
}

function formatClock(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${toFaDigits(m)}:${toFaDigits(s)}`;
}

function freshState(): PersistedExerciseTimer {
  return { completedSets: 0, phase: null, endAt: null, pausedRemainingMs: null, startedAt: Date.now() };
}

// «روشِ اول» — پاپ‌آپِ ردیابیِ ست‌به‌ستِ یک حرکت. دو حالت داره: (۱) تکرارمحور
// (مثلاً «۵×۵») → دایره‌ی چک‌باکس با تیکِ دستی، (۲) زمان‌محور (پلانک/کاردیو)
// → یک شمارش‌معکوسِ زنده و قابلِ‌پاز. وضعیتِ تایمر (فازِ فعلی، ستِ فعلی،
// پازبودن) توی localStorage با یک epoch ذخیره می‌شه — نه رفرشِ صفحه نه
// بستن/بازکردنِ دوباره‌ی پاپ‌آپ پیشرفت رو از دست نمی‌ده.
export function ExerciseSetTrackerModal({
  planId,
  dateIso,
  item,
  onClose,
  onComplete,
}: {
  planId: string;
  dateIso: string;
  item: string;
  onClose: () => void;
  onComplete: () => void;
}) {
  const spec = parseExerciseItem(item);
  const { baseName, sets: setCount, isTimed, seconds } = spec;
  const soloTimer = isTimed && setCount === 1 && seconds !== null;

  const [state, setState] = useState<PersistedExerciseTimer>(() => {
    const saved = loadExerciseTimer(planId, dateIso, item);
    if (saved && saved.completedSets < setCount) return saved;
    return freshState();
  });
  const [finishedTotalSec, setFinishedTotalSec] = useState<number | null>(null);
  const [, setTick] = useState(0);

  function persist(patch: Partial<PersistedExerciseTimer>) {
    setState((prev) => {
      const next = { ...prev, ...patch };
      saveExerciseTimer(planId, dateIso, item, next);
      return next;
    });
  }

  const paused = state.pausedRemainingMs !== null;
  const remainingMs = state.phase === null ? null : paused ? state.pausedRemainingMs : state.endAt !== null ? Math.max(0, state.endAt - Date.now()) : null;
  const remainingSec = remainingMs === null ? null : Math.ceil(remainingMs / 1000);

  useEffect(() => {
    if (state.phase === null || paused || state.endAt === null) return;
    const endAt = state.endAt;
    const id = setInterval(() => {
      if (endAt - Date.now() <= 0) {
        clearInterval(id);
        handlePhaseComplete();
      } else {
        setTick((t) => t + 1);
      }
    }, 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.endAt, paused]);

  function handlePhaseComplete() {
    if (state.phase === "resting") {
      persist({ phase: null, endAt: null, pausedRemainingMs: null });
      return;
    }
    const next = state.completedSets + 1;
    if (next >= setCount) {
      const total = Math.round((Date.now() - state.startedAt) / 1000);
      fireTimerDone(baseName, "حرکت تموم شد — عالی بود!");
      clearExerciseTimer(planId, dateIso, item);
      onComplete();
      setFinishedTotalSec(total);
      persist({ completedSets: next, phase: null, endAt: null, pausedRemainingMs: null });
    } else {
      fireTimerDone(baseName, `ست ${toFaDigits(String(next))} تموم شد — وقتِ استراحته`);
      persist({ completedSets: next, phase: "resting", endAt: Date.now() + REST_SECONDS * 1000, pausedRemainingMs: null });
    }
  }

  function tickSet(idx: number) {
    if (idx !== state.completedSets || state.phase !== null || finishedTotalSec !== null) return;
    const next = state.completedSets + 1;
    if (next >= setCount) {
      const total = Math.round((Date.now() - state.startedAt) / 1000);
      clearExerciseTimer(planId, dateIso, item);
      onComplete();
      setFinishedTotalSec(total);
      persist({ completedSets: next });
    } else {
      persist({ completedSets: next, phase: "resting", endAt: Date.now() + REST_SECONDS * 1000, pausedRemainingMs: null });
    }
  }

  function startTiming(idx: number) {
    if (idx !== state.completedSets || state.phase !== null || finishedTotalSec !== null) return;
    persist({ phase: "timing", endAt: Date.now() + (seconds ?? 0) * 1000, pausedRemainingMs: null });
  }

  function togglePause() {
    if (state.phase === null) return;
    if (paused) {
      persist({ endAt: Date.now() + (state.pausedRemainingMs ?? 0), pausedRemainingMs: null });
    } else if (state.endAt !== null) {
      persist({ endAt: null, pausedRemainingMs: Math.max(0, state.endAt - Date.now()) });
    }
  }

  const restPct = state.phase === "resting" && remainingSec !== null ? Math.round(((REST_SECONDS - remainingSec) / REST_SECONDS) * 100) : 0;
  const timePct = state.phase === "timing" && seconds && remainingSec !== null ? Math.round(((seconds - remainingSec) / seconds) * 100) : 0;

  const pauseResumeBtn = (
    <motion.button
      type="button"
      whileTap={{ scale: 0.88 }}
      onClick={togglePause}
      aria-label={paused ? "ادامه" : "توقفِ موقت"}
      className="exercise-pause-btn"
    >
      <AnimatePresence mode="wait" initial={false}>
        {paused ? (
          <motion.span key="play" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.15 }}>
            <Play size={13} fill="currentColor" />
          </motion.span>
        ) : (
          <motion.span key="pause" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.15 }}>
            <Pause size={13} fill="currentColor" />
          </motion.span>
        )}
      </AnimatePresence>
      {paused ? "ادامه" : "توقف"}
    </motion.button>
  );

  return (
    <>
      <div className="modal-overlay open" onClick={onClose} />
      <div className="modal-panel liquid-glass-panel dash-scope open exercise-set-tracker-panel">
        <div className="modal-head">
          <div className="modal-title">{baseName}</div>
          <button className="nav-close" onClick={onClose} aria-label="بستن">×</button>
        </div>

        <div className="modal-body">
          {!soloTimer && (
            <div className="flex flex-wrap items-center justify-center gap-3 py-2">
              {Array.from({ length: setCount }, (_, i) => {
                const done = i < state.completedSets;
                const isCurrent = i === state.completedSets && finishedTotalSec === null;
                const locked = !done && !isCurrent;
                const isTimingThis = isCurrent && state.phase === "timing";
                return (
                  <motion.button
                    key={i}
                    type="button"
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05, type: "spring", stiffness: 400, damping: 24 }}
                    disabled={!isCurrent || state.phase !== null}
                    onClick={() => (isTimed ? startTiming(i) : tickSet(i))}
                    whileTap={isCurrent && state.phase === null ? { scale: 0.85 } : undefined}
                    aria-label={`ست ${i + 1}`}
                    className="exercise-set-circle"
                    style={{
                      background: done ? "var(--accent)" : "transparent",
                      borderColor: done ? "var(--accent)" : isCurrent ? "var(--accent)" : "var(--muted)",
                      opacity: locked ? 0.35 : 1,
                      boxShadow: done ? "0 0 12px rgba(var(--accent-rgb),.6)" : isCurrent ? "0 0 0 3px rgba(var(--accent-rgb),.18)" : "none",
                    }}
                  >
                    <AnimatePresence mode="wait">
                      {done ? (
                        <motion.span
                          key="done"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 22 }}
                          className="flex items-center justify-center text-white"
                        >
                          <Check size={18} strokeWidth={3} />
                        </motion.span>
                      ) : isTimingThis ? (
                        <motion.span
                          key="timing"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          className="mono"
                          style={{ color: "var(--accent)", fontSize: 13 }}
                        >
                          {remainingSec}
                        </motion.span>
                      ) : (
                        <span className="mono" style={{ color: isCurrent ? "var(--accent)" : "var(--muted)" }}>{i + 1}</span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>
          )}

          <div className="mt-4 text-center">
            <AnimatePresence mode="wait">
              {finishedTotalSec !== null ? (
                <motion.div
                  key="finished"
                  initial={{ opacity: 0, y: 10, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 320, damping: 24 }}
                  className="flex flex-col items-center gap-3"
                >
                  <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 400, damping: 14, delay: 0.1 }}>
                    <PartyPopper className="text-dash-green" size={26} />
                  </motion.div>
                  <div className="text-[13px] font-semibold text-dash-text sm:text-[14px]">
                    این حرکت رو توی <span className="mono text-dash-green" dir="ltr">{formatDuration(finishedTotalSec)}</span> تموم کردی!
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-1 rounded-2xl px-8 py-2.5 text-[13px] font-bold"
                    style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                  >
                    باشه
                  </button>
                </motion.div>
              ) : state.phase === "resting" ? (
                <motion.div key="resting" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-2">
                  <div className="text-[11.5px] text-dash-muted">{paused ? "استراحت — موقتاً متوقف شده" : "استراحت تا ستِ بعدی"}</div>
                  <div className="mono text-[26px] font-bold text-dash-green" dir="ltr">{remainingSec}</div>
                  <div className="exercise-rest-bar">
                    <div className="exercise-rest-bar-fill" style={{ width: `${restPct}%` }} />
                  </div>
                  {pauseResumeBtn}
                </motion.div>
              ) : !soloTimer && state.phase === "timing" ? (
                <motion.div key="set-timing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-2">
                  <div className="text-[11.5px] text-dash-muted">{paused ? "متوقف شده — هروقت آماده بودی ادامه بده" : "نگه دار تا شمارش‌معکوس تموم بشه"}</div>
                  <div className="mono text-[26px] font-bold text-dash-green" dir="ltr">{remainingSec}</div>
                  <div className="exercise-rest-bar">
                    <div className="exercise-rest-bar-fill" style={{ width: `${timePct}%` }} />
                  </div>
                  {pauseResumeBtn}
                </motion.div>
              ) : soloTimer ? (
                state.phase === "timing" ? (
                  <motion.div key="solo-timing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-2">
                    <div className="text-[11.5px] text-dash-muted">{paused ? "موقتاً متوقف شده" : "در حالِ اجرا — تا آخر ادامه بده"}</div>
                    <div className="mono text-[34px] font-bold text-dash-green" dir="ltr">{remainingSec !== null ? formatClock(remainingSec) : ""}</div>
                    <div className="exercise-rest-bar" style={{ width: 220 }}>
                      <div className="exercise-rest-bar-fill" style={{ width: `${timePct}%` }} />
                    </div>
                    {pauseResumeBtn}
                  </motion.div>
                ) : (
                  <motion.div key="solo-idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
                    <div className="text-[11.5px] text-dash-muted">
                      وقتی آماده بودی، تایمر رو بزن و تا آخرِ {formatDuration(seconds || 0)} ادامه بده
                    </div>
                    <motion.button
                      type="button"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{
                        scale: 1, opacity: 1,
                        boxShadow: ["0 0 0 0 rgba(var(--accent-rgb),.35)", "0 0 0 8px rgba(var(--accent-rgb),0)"],
                      }}
                      transition={{ scale: { type: "spring", stiffness: 380, damping: 18 }, boxShadow: { duration: 2, repeat: Infinity, ease: "easeOut" } }}
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => startTiming(0)}
                      className="exercise-solo-play"
                      aria-label="شروع تایمر"
                    >
                      <Play size={18} fill="currentColor" />
                    </motion.button>
                  </motion.div>
                )
              ) : (
                <motion.div key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11.5px] text-dash-muted">
                  {isTimed
                    ? state.completedSets === 0
                      ? "برای شروعِ ستِ اول، دایره رو بزن تا شمارش‌معکوس شروع بشه"
                      : "آماده‌ای برای ستِ بعدی؟ دایره رو بزن تا شمارش‌معکوس شروع بشه"
                    : state.completedSets === 0
                    ? "وقتی این ست رو زدی، روی دایره‌ی اول بزن"
                    : "آماده‌ای برای ستِ بعدی؟ بزن روش"}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}
