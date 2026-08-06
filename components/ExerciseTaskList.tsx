"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Play, Plus, RotateCw, Square, X } from "lucide-react";
import { DashCard } from "./DashCard";
import { ExerciseDay } from "@/lib/exercisePlans";

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// «برنامه تمرینی امروز» — ستونِ بزرگِ سمتِ راستِ داشبوردِ بدنسازی، هم‌نقشِ
// DashTaskList توی روتین (همون تیترِ همردیف با «افزودن برنامه»). «شروع
// تمرین» یک تایمر می‌ندازه و چک‌باکس‌ها رو فعال می‌کنه؛ «پایان تمرین» جلسه
// رو ثبت می‌کنه و به هر حرکتِ تیک‌نخورده ضربدرِ قرمز می‌زنه (دقیقاً منطقِ
// «missed» ی که توی DashTaskRow برای برنامه‌های گذشته‌ی روتین ساخته شده).
// دکمه‌ی شروع/پایان همیشه چسبیده به تهِ باکسه (flex-col h-full + mt-auto)؛
// اگه حرکات از جا خارج بشن، خودِ لیست اسکرول می‌شه، باکس کش نمیاد.
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
  delay?: number;
}) {
  const todayPlan = dayPlan;
  const hadProgress = !initialCompleted && initialCompletedItems.length > 0;
  const [active, setActive] = useState(hadProgress);
  const [ended, setEnded] = useState(initialCompleted);
  const [checked, setChecked] = useState<Set<string>>(new Set(initialCompletedItems));
  const [elapsed, setElapsed] = useState(0);
  const [ending, setEnding] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setEnded(initialCompleted);
    setChecked(new Set(initialCompletedItems));
    setActive(!initialCompleted && initialCompletedItems.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayPlan?.day, initialCompleted]);

  useEffect(() => {
    if (!active) { if (timerRef.current) clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [active]);

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

  function toggleItem(item: string) {
    if (!active || !editable) return;
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
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
        <div className="flex items-center gap-3">
          {active && (
            <span className="mono text-[13px] font-semibold text-dash-green sm:text-[15px]" dir="ltr">{formatElapsed(elapsed)}</span>
          )}
          <button
            type="button"
            onClick={onAddProgram}
            className="flex items-center gap-1 text-[11.5px] font-semibold text-dash-green transition hover:brightness-110 sm:gap-1.5 sm:text-[13.5px]"
          >
            <Plus className="h-[15px] w-[15px] sm:h-[17px] sm:w-[17px]" />
            افزودن برنامه
          </button>
        </div>
      </div>

      {!todayPlan ? (
        <div className="py-6 text-center text-[11.5px] text-dash-muted sm:text-[12.5px]">{restDayLabel}</div>
      ) : (
        <>
          <div className="mt-1 shrink-0 text-[11px] text-dash-muted sm:text-[12.5px]">{todayPlan.focus}</div>

          <div className="thin-scroll mt-4 flex min-h-0 flex-1 flex-col divide-y divide-dash-border overflow-y-auto" style={{ maxHeight: 360 }}>
            {todayPlan.items.map((item, idx) => {
              const isChecked = checked.has(item);
              const showMiss = ended && !isChecked;
              const isSubbing = substitutingItem === item;
              return (
                <div key={item} className="flex items-center gap-2.5 py-3 sm:gap-3.5">
                  <span className="mono w-5 shrink-0 text-[11px] text-dash-muted sm:text-[12.5px]">{idx + 1}-</span>
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-dash-text sm:text-[14.5px]">{item}</span>

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

                  <button
                    type="button"
                    disabled={!active}
                    onClick={() => toggleItem(item)}
                    aria-pressed={isChecked}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors disabled:cursor-not-allowed sm:h-6 sm:w-6"
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
                        <motion.span key="on" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex items-center justify-center text-white">
                          <Check className="h-3 w-3 sm:h-[15px] sm:w-[15px]" strokeWidth={3} />
                        </motion.span>
                      ) : showMiss ? (
                        <motion.span key="x" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex items-center justify-center text-white">
                          <X className="h-3 w-3 sm:h-[15px] sm:w-[15px]" strokeWidth={3} />
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  </button>
                </div>
              );
            })}
          </div>

          {editable && (!ended || active) && (
            <div className="mt-5 shrink-0">
              {!active && (
                <button
                  type="button"
                  onClick={startWorkout}
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
          )}
        </>
      )}
    </DashCard>
  );
}
