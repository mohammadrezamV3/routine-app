"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Dumbbell, Lock, Play, Plus, Repeat2, RotateCw, Square, Timer, X } from "lucide-react";
import { DashCard } from "./DashCard";
import { ExerciseDay } from "@/lib/exercisePlans";
import { isoLocal } from "@/lib/jalali";
import { parseExerciseItem } from "@/lib/exerciseSets";
import { toFaDigits } from "@/lib/schedule";
import { ExerciseSetTrackerModal } from "./ExerciseSetTrackerModal";
import { ExerciseSetTutorial, EXERCISE_TUTORIAL_SEEN_KEY } from "./ExerciseSetTutorial";

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/** ثانیه‌ها رو به یه لیبلِ کوتاه برای جدولِ مشخصات تبدیل می‌کنه — «۳۰ ثانیه» یا «۲۵ دقیقه» */
function formatSpecDuration(seconds: number | null): string {
  if (!seconds) return "—";
  if (seconds % 60 === 0) return `${toFaDigits(String(seconds / 60))} دقیقه`;
  if (seconds < 60) return `${toFaDigits(String(seconds))} ثانیه`;
  return `${toFaDigits(String(Math.floor(seconds / 60)))}:${toFaDigits((seconds % 60).toString().padStart(2, "0"))}`;
}

// «برنامه تمرینی امروز» — ستونِ بزرگِ سمتِ راستِ داشبوردِ بدنسازی، هم‌نقشِ
// DashTaskList توی روتین. «شروع تمرین» یک تایمر می‌ندازه و به هر حرکت دکمه‌ی
// «شروع» می‌ده؛ «پایان تمرین» جلسه رو ثبت می‌کنه و به هر حرکتِ تیک‌نخورده
// ضربدرِ قرمز می‌زنه. تنها راهِ تکمیلِ یک حرکت، دکمه‌ی «شروع» ـشه که پاپ‌آپِ
// ردیابیِ ست‌به‌ست با استراحتِ زنده (ExerciseSetTrackerModal) رو باز می‌کنه.
export function ExerciseTaskList({
  planId,
  dayPlan,
  dateIso,
  editable,
  title = "برنامه تمرینی",
  restDayLabel = "امروز روز استراحته — چیزی برنامه‌ریزی نشده.",
  initialCompleted,
  initialCompletedItems,
  onSubstitute,
  substitutingItem,
  onSessionEnd,
  onAddProgram,
  onActiveChange,
  delay,
}: {
  planId: string;
  dayPlan: ExerciseDay | undefined;
  dateIso: string;
  editable: boolean;
  title?: string;
  restDayLabel?: string;
  initialCompleted: boolean;
  initialCompletedItems: string[];
  onSubstitute: (day: string, item: string) => void;
  substitutingItem: string | null;
  onSessionEnd: () => void;
  onAddProgram: () => void;
  onActiveChange?: (active: boolean) => void;
  delay?: number;
}) {
  const todayPlan = dayPlan;
  const isFutureDay = dateIso > isoLocal(new Date());
  const isPastDay = dateIso < isoLocal(new Date());
  const hadProgress = !initialCompleted && initialCompletedItems.length > 0;
  const [active, setActive] = useState(hadProgress);
  const [ended, setEnded] = useState(initialCompleted);
  const [checked, setChecked] = useState<Set<string>>(new Set(initialCompletedItems));
  const [elapsed, setElapsed] = useState(0);
  const [ending, setEnding] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [setTrackerItem, setSetTrackerItem] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setEnded(initialCompleted);
    setChecked(new Set(initialCompletedItems));
    setActive(!initialCompleted && initialCompletedItems.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayPlan?.day, initialCompleted, initialCompletedItems]);

  useEffect(() => {
    if (!active) { if (timerRef.current) clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [active]);

  useEffect(() => { onActiveChange?.(active); }, [active, onActiveChange]);

  async function persist(nextChecked: Set<string>, completed: boolean) {
    await fetch("/api/exercise/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId, date: dateIso, completed, completedItems: Array.from(nextChecked) }),
    });
  }

  function startWorkout() {
    if (!editable) return;
    setActive(true);
    setEnded(false);
    setElapsed(0);
  }

  function handleStartClick() {
    if (!editable) return;
    let seen = false;
    try { seen = localStorage.getItem(EXERCISE_TUTORIAL_SEEN_KEY) === "1"; } catch {}
    if (!seen) { setShowTutorial(true); return; }
    startWorkout();
  }

  function markItemDone(item: string) {
    setChecked((prev) => {
      if (prev.has(item)) return prev;
      const next = new Set(prev).add(item);
      persist(next, false);
      return next;
    });
  }

  async function endWorkout() {
    setEnding(true);
    await persist(checked, true);
    setEnding(false);
    setActive(false);
    setEnded(true);
    onSessionEnd();
  }

  return (
    <DashCard delay={delay} className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-dash-text sm:text-[22px]">{title}</h2>
        {active ? (
          <div className="exercise-chrono" dir="ltr">
            <Timer className="h-[13px] w-[13px] sm:h-[15px] sm:w-[15px]" />
            <span className="mono">{formatElapsed(elapsed)}</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={onAddProgram}
            className="flex items-center gap-1 text-[11.5px] font-semibold text-dash-green transition hover:brightness-110 sm:gap-1.5 sm:text-[13.5px]"
          >
            <Plus className="h-[15px] w-[15px] sm:h-[17px] sm:w-[17px]" />
            افزودن برنامه
          </button>
        )}
      </div>

      {!todayPlan ? (
        <div className="py-6 text-center text-[11.5px] text-dash-muted sm:text-[12.5px]">{restDayLabel}</div>
      ) : (
        <>
          <div className="mt-1 shrink-0 text-[11px] text-dash-muted sm:text-[12.5px]">{todayPlan.focus}</div>

          <div className="thin-scroll mt-4 min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1" style={{ maxHeight: 360 }}>
            <table className="exercise-plan-table">
              {active && (
                <thead>
                  <tr>
                    <th className="epc-idx" />
                    <th className="epc-name" />
                    <th className="epc-num"><Dumbbell size={13} /></th>
                    <th className="epc-num"><Repeat2 size={13} /></th>
                    <th className="epc-actions" />
                  </tr>
                </thead>
              )}
              <tbody>
                {todayPlan.items.map((item, idx) => {
                  const isChecked = checked.has(item);
                  const showMiss = isPastDay ? !isChecked : ended && !isChecked;
                  const isSubbing = substitutingItem === item;
                  const canStart = active && editable && !isChecked && !ended;
                  const spec = parseExerciseItem(item);
                  return (
                    <tr key={item}>
                      <td className="epc-idx mono">{idx + 1}-</td>
                      <td className="epc-name">{spec.baseName}</td>
                      {active && <td className="epc-num mono">{spec.sets > 1 ? toFaDigits(String(spec.sets)) : "—"}</td>}
                      {active && (
                        <td className="epc-num mono">
                          {spec.isTimed ? formatSpecDuration(spec.seconds) : spec.reps ?? "—"}
                        </td>
                      )}
                      <td className="epc-actions">
                        <div className="flex shrink-0 items-center justify-end gap-2.5 sm:gap-3.5">
                          <button
                            type="button"
                            aria-label="جایگزینی این حرکت"
                            title="این تجهیزات رو ندارم — جایگزین کن"
                            disabled={!editable || isSubbing || active || ended}
                            onClick={() => onSubstitute(todayPlan.day, item)}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-dash-muted transition hover:bg-white/5 hover:text-dash-text disabled:opacity-30 sm:h-8 sm:w-8"
                          >
                            <RotateCw className={`h-[14px] w-[14px] sm:h-4 sm:w-4${isSubbing ? " animate-spin" : ""}`} />
                          </button>

                          {canStart ? (
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.92 }}
                              transition={{ type: "spring", stiffness: 450, damping: 20 }}
                              onClick={() => setSetTrackerItem(item)}
                              className="exercise-start-btn"
                            >
                              شروع
                            </motion.button>
                          ) : (
                            <motion.div
                              aria-hidden
                              animate={isChecked ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                              transition={{ duration: 0.3, ease: "easeOut" }}
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 sm:h-6 sm:w-6${showMiss ? " task-check-missed" : ""}`}
                              style={
                                isChecked
                                  ? { background: "var(--accent)", borderColor: "var(--accent)", boxShadow: "0 0 10px rgba(var(--accent-rgb),.65)" }
                                  : showMiss
                                  ? { background: "#E05252", borderColor: "#E05252" }
                                  : { background: "transparent", borderColor: "var(--muted)" }
                              }
                            >
                              <AnimatePresence mode="wait">
                                {isChecked ? (
                                  <motion.span
                                    key="on"
                                    initial={{ scale: 0, rotate: -45, opacity: 0 }}
                                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 22 }}
                                    className="flex items-center justify-center text-white"
                                  >
                                    <Check className="h-3 w-3 sm:h-[15px] sm:w-[15px]" strokeWidth={3} />
                                  </motion.span>
                                ) : showMiss ? (
                                  <motion.span
                                    key="x"
                                    initial={{ scale: 0, rotate: 45, opacity: 0 }}
                                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 22 }}
                                    className="flex items-center justify-center text-white"
                                  >
                                    <X className="h-3 w-3 sm:h-[15px] sm:w-[15px]" strokeWidth={3} />
                                  </motion.span>
                                ) : null}
                              </AnimatePresence>
                            </motion.div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {isFutureDay ? (
            <div className="exercise-locked-box mt-5 shrink-0">
              <Lock size={14} />
              وقتش نرسیده!
            </div>
          ) : (
            editable && (!ended || active) && (
              <div className="mt-5 shrink-0">
                {!active && (
                  <button
                    type="button"
                    onClick={handleStartClick}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-[13px] font-bold sm:text-[15px]"
                    style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                  >
                    <Play size={16} />
                    شروع تمرین
                  </button>
                )}
                {active && (
                  <button
                    type="button"
                    disabled={ending}
                    onClick={endWorkout}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-[13px] font-bold sm:text-[15px]"
                    style={{ borderColor: "#E05252", color: "#E05252" }}
                  >
                    <Square size={14} />
                    {ending ? "در حال ثبت…" : "پایان تمرین"}
                  </button>
                )}
              </div>
            )
          )}
        </>
      )}

      {showTutorial && createPortal(
        <ExerciseSetTutorial
          onDone={() => { setShowTutorial(false); startWorkout(); }}
        />,
        document.body
      )}

      {setTrackerItem && createPortal(
        <ExerciseSetTrackerModal
          planId={planId}
          dateIso={dateIso}
          item={setTrackerItem}
          onClose={() => setSetTrackerItem(null)}
          onComplete={() => markItemDone(setTrackerItem)}
        />,
        document.body
      )}
    </DashCard>
  );
}
