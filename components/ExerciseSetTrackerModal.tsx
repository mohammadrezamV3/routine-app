"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, PartyPopper, Play } from "lucide-react";
import { parseExerciseItem } from "@/lib/exerciseSets";

const REST_SECONDS = 90;

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m > 0 && s > 0) return `${m} دقیقه و ${s} ثانیه`;
  if (m > 0) return `${m} دقیقه`;
  return `${s} ثانیه`;
}

// «روشِ اول» — پاپ‌آپِ ردیابیِ ست‌به‌ستِ یک حرکت. دو حالت داره:
// (۱) حرکاتِ تکرارمحور (مثلاً «۵×۵») → دایره‌ی چک‌باکس برای هر ست، با تیک
// دستی. (۲) حرکاتِ زمان‌محور (پلانک/کاردیو، مثلاً «۳×۳۰ ثانیه» یا «۲۵
// دقیقه») → به‌جای تیکِ دستی، خودِ حرکت با یک شمارش‌معکوسِ زنده اجرا می‌شه.
// بینِ ست‌ها (هر دو حالت) ۹۰ ثانیه استراحتِ زنده شمرده می‌شه.
export function ExerciseSetTrackerModal({
  item,
  onClose,
  onComplete,
}: {
  item: string;
  onClose: () => void;
  onComplete: () => void;
}) {
  const spec = parseExerciseItem(item);
  const { baseName, sets: setCount, isTimed, seconds } = spec;
  const soloTimer = isTimed && setCount === 1 && seconds !== null;

  const [completedSets, setCompletedSets] = useState(0);
  const [restRemaining, setRestRemaining] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [finishedTotalSec, setFinishedTotalSec] = useState<number | null>(null);
  const startedAtRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (restRemaining === null) return;
    if (restRemaining <= 0) { setRestRemaining(null); return; }
    timerRef.current = setInterval(() => {
      setRestRemaining((s) => (s === null ? null : s - 1));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [restRemaining]);

  function finishSet(next: number) {
    setCompletedSets(next);
    if (next >= setCount) {
      setFinishedTotalSec(Math.round((Date.now() - startedAtRef.current) / 1000));
      onComplete();
    } else {
      setRestRemaining(REST_SECONDS);
    }
  }

  useEffect(() => {
    if (timeRemaining === null) return;
    if (timeRemaining <= 0) { setTimeRemaining(null); finishSet(completedSets + 1); return; }
    const t = setInterval(() => setTimeRemaining((s) => (s === null ? null : s - 1)), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining]);

  function tickSet(idx: number) {
    if (idx !== completedSets || restRemaining !== null || finishedTotalSec !== null) return;
    finishSet(completedSets + 1);
  }

  function startTimedSet(idx: number) {
    if (idx !== completedSets || restRemaining !== null || finishedTotalSec !== null || timeRemaining !== null) return;
    setTimeRemaining(seconds);
  }

  const restPct = restRemaining === null ? 0 : Math.round(((REST_SECONDS - restRemaining) / REST_SECONDS) * 100);
  const timePct = timeRemaining === null || !seconds ? 0 : Math.round(((seconds - timeRemaining) / seconds) * 100);

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
                const done = i < completedSets;
                const isCurrent = i === completedSets && finishedTotalSec === null;
                const locked = !done && !isCurrent;
                const isTimingThis = isCurrent && timeRemaining !== null;
                return (
                  <motion.button
                    key={i}
                    type="button"
                    disabled={!isCurrent || restRemaining !== null || timeRemaining !== null}
                    onClick={() => (isTimed ? startTimedSet(i) : tickSet(i))}
                    whileTap={isCurrent && restRemaining === null && timeRemaining === null ? { scale: 0.85 } : undefined}
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
                          {timeRemaining}
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
                <motion.div key="finished" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-3">
                  <PartyPopper className="text-dash-green" size={26} />
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
              ) : restRemaining !== null ? (
                <motion.div key="resting" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-2">
                  <div className="text-[11.5px] text-dash-muted">استراحت تا ستِ بعدی</div>
                  <div className="mono text-[26px] font-bold text-dash-green" dir="ltr">{restRemaining}</div>
                  <div className="exercise-rest-bar">
                    <div className="exercise-rest-bar-fill" style={{ width: `${restPct}%` }} />
                  </div>
                </motion.div>
              ) : !soloTimer && timeRemaining !== null ? (
                <motion.div key="set-timing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-2">
                  <div className="text-[11.5px] text-dash-muted">نگه دار تا شمارش‌معکوس تموم بشه</div>
                  <div className="mono text-[26px] font-bold text-dash-green" dir="ltr">{timeRemaining}</div>
                  <div className="exercise-rest-bar">
                    <div className="exercise-rest-bar-fill" style={{ width: `${timePct}%` }} />
                  </div>
                </motion.div>
              ) : soloTimer ? (
                timeRemaining !== null ? (
                  <motion.div key="solo-timing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-2">
                    <div className="text-[11.5px] text-dash-muted">در حالِ اجرا — تا آخر ادامه بده</div>
                    <div className="mono text-[34px] font-bold text-dash-green" dir="ltr">{formatElapsedMs(timeRemaining)}</div>
                    <div className="exercise-rest-bar" style={{ width: 220 }}>
                      <div className="exercise-rest-bar-fill" style={{ width: `${timePct}%` }} />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="solo-idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
                    <div className="text-[11.5px] text-dash-muted">
                      وقتی آماده بودی، تایمر رو بزن و تا آخرِ {formatDuration(seconds || 0)} ادامه بده
                    </div>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => startTimedSet(0)}
                      className="flex h-16 w-16 items-center justify-center rounded-full"
                      style={{ background: "var(--accent)", color: "var(--bg)" }}
                      aria-label="شروع تایمر"
                    >
                      <Play size={24} fill="currentColor" />
                    </motion.button>
                  </motion.div>
                )
              ) : (
                <motion.div key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11.5px] text-dash-muted">
                  {isTimed
                    ? completedSets === 0
                      ? "برای شروعِ ستِ اول، دایره رو بزن تا شمارش‌معکوس شروع بشه"
                      : "آماده‌ای برای ستِ بعدی؟ دایره رو بزن تا شمارش‌معکوس شروع بشه"
                    : completedSets === 0
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

function formatElapsedMs(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
