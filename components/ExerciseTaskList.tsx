"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { TickButton } from "./TickButton";
import { Check, Dumbbell, Lock, Pencil, Play, Repeat2, RotateCw, Timer, X } from "lucide-react";
import { DashCard } from "./DashCard";
import type { ExerciseDay } from "@/lib/exercisePlans";
import { isoLocal } from "@/lib/jalali";
import { reportLiveError } from "@/lib/liveSync";
import { parseExerciseItem } from "@/lib/exerciseSets";
import { ExerciseSetTrackerModal } from "./ExerciseSetTrackerModal";
import { ExerciseSetTutorial, EXERCISE_TUTORIAL_SEEN_KEY } from "./ExerciseSetTutorial";
import { Spinner } from "./Spinner";

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/** ثانیه‌ها رو به یه لیبل کوتاه برای جدول مشخصات تبدیل می‌کنه — «30 ثانیه» یا «25 دقیقه» */
function formatSpecDuration(seconds: number | null): string {
  if (!seconds) return "—";
  if (seconds % 60 === 0) return `${seconds / 60} دقیقه`;
  if (seconds < 60) return `${seconds} ثانیه`;
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
}

// «برنامه تمرینی امروز» — ستون بزرگ سمت راست داشبورد بدنسازی، هم‌نقش
// DashTaskList توی روتین. «شروع تمرین» یک تایمر می‌ندازه و به هر حرکت دکمه‌ی
// «شروع» می‌ده؛ «پایان تمرین» جلسه رو ثبت می‌کنه و به هر حرکت تیک‌نخورده
// ضربدر قرمز می‌زنه. تنها راه تکمیل یک حرکت، دکمه‌ی «شروع» ـشه که پاپ‌آپ
// ردیابی ست‌به‌ست با استراحت زنده (ExerciseSetTrackerModal) رو باز می‌کنه.
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
  onStarted,
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
  /** «شروع تمرین» روی سرور ثبت شد — حالت «ماندن» با همین روز را گذرانده حساب می‌کند */
  onStarted?: () => void;
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
  const [confirmEnd, setConfirmEnd] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // `initialCompletedItems` از والد به‌صورت `res.completedItems ?? []` میاد،
  // یعنی وقتی لاگی وجود نداره هر رندر یک آرایه‌ی *جدید* ساخته می‌شه. با گذاشتن
  // خود آرایه توی وابستگی‌ها، این افکت هر رندر اجرا می‌شد و
  // `setChecked(new Set(...))` هم هر بار یک Set جدید (پس state جدید) می‌ساخت
  // → رندر بعدی → افکت دوباره → یک حلقه‌ی رندر بی‌پایان که CPU رو اشغال
  // می‌کرد و گوشی رو داغ. حالا وابستگی یک کلید رشته‌ای پایدار از محتواست.
  const completedKey = initialCompletedItems.join("|");
  useEffect(() => {
    setEnded(initialCompleted);
    setChecked(new Set(completedKey ? completedKey.split("|") : []));
    setActive(!initialCompleted && completedKey.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayPlan?.day, initialCompleted, completedKey]);

  useEffect(() => {
    if (!active) { if (timerRef.current) clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [active]);

  useEffect(() => { onActiveChange?.(active); }, [active, onActiveChange]);

  // true = روی سرور نشست. خطا دیگه بی‌صدا بلعیده نمی‌شه: صدازننده تغییر
  // optimistic رو برمی‌گردونه و پیام سراسری (LiveSyncToaster) نشون داده می‌شه.
  async function persist(nextChecked: Set<string>, completed: boolean): Promise<boolean> {
    const res = await fetch("/api/exercise/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId, date: dateIso, completed, completedItems: Array.from(nextChecked) }),
    }).catch(() => null);
    if (res?.ok) return true;
    reportLiveError("ذخیره نشد — تغییر برگردانده شد. اتصال را چک کن و دوباره امتحان کن");
    return false;
  }

  function startWorkout() {
    if (!editable) return;
    setActive(true);
    setEnded(false);
    setElapsed(0);
    // ثبت «شروع» — بدون این، حالت «ماندن» (lib/exerciseProgression.ts) همین
    // تمرین را فردا دوباره می‌آورد. شکستش جلسه را نمی‌بندد؛ اولین تیک/پایان
    // هم لاگ می‌سازد و لاگ دارای پیشرفت «شروع‌شده» حساب می‌شود.
    fetch("/api/exercise/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId, date: dateIso, started: true }),
    })
      .then((r) => { if (r.ok) onStarted?.(); })
      .catch(() => {});
  }

  function handleStartClick() {
    if (!editable) return;
    let seen = false;
    try { seen = localStorage.getItem(EXERCISE_TUTORIAL_SEEN_KEY) === "1"; } catch {}
    if (!seen) { setShowTutorial(true); return; }
    startWorkout();
  }

  // optimistic: تیک همون لحظه می‌خوره؛ اگه سرور رد کرد همون حرکت برمی‌گرده.
  // checkedRef تا چند تیک پشت‌سرهم قبل از رندر بعدی هم مجموعه‌ی کامل رو بفرستن.
  const checkedRef = useRef(checked);
  checkedRef.current = checked;
  function markItemDone(item: string) {
    const prev = checkedRef.current;
    if (prev.has(item)) return;
    const next = new Set(prev).add(item);
    checkedRef.current = next;
    setChecked(next);
    persist(next, false).then((ok) => {
      if (ok) return;
      setChecked((cur) => {
        if (!cur.has(item)) return cur;
        const rolled = new Set(cur);
        rolled.delete(item);
        return rolled;
      });
    });
  }

  const remainingCount = (todayPlan?.items ?? []).filter((it) => !checked.has(it)).length;

  // زدن «پایان تمرین» وقتی هنوز حرکتی مونده، به‌جای ثبت بی‌برگشت، اول
  // می‌پرسه — چون بعد ثبت، اون حرکت‌ها ضربدر قرمز «انجام‌نشده» می‌گیرن.
  function requestEndWorkout() {
    if (remainingCount > 0) { setConfirmEnd(true); return; }
    endWorkout();
  }

  async function endWorkout() {
    setConfirmEnd(false);
    setEnding(true);
    const ok = await persist(checked, true);
    setEnding(false);
    if (!ok) return; // تمرین باز می‌مونه تا دوباره «پایان» بزنه
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
            <Pencil className="h-[15px] w-[15px] sm:h-[17px] sm:w-[17px]" />
            تغییر برنامه
          </button>
        )}
      </div>

      {!todayPlan ? (
        // روز استراحت خودکار تیک می‌خوره (از خود پلن، بدون لاگ) — فقط نمایشی
        <div className="flex flex-col items-center gap-2 py-6 text-center text-[11.5px] text-dash-muted sm:text-[12.5px]">
          <TickButton as="span" size={24} disabled checked={!isFutureDay} />
          <span>{restDayLabel}</span>
        </div>
      ) : (
        <>
          <div className="mt-1 shrink-0 text-[11px] text-dash-muted sm:text-[12.5px]">{todayPlan.focus}</div>

          <div className="mt-4 min-h-0 flex-1" dir="ltr" style={{ maxHeight: 360 }}>
          <div className="thin-scroll h-full overflow-y-auto overflow-x-hidden px-1" dir="rtl">
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
                      {active && <td className="epc-num mono">{spec.sets > 1 ? spec.sets : "—"}</td>}
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
                            <TickButton as="span" tone="exercise" size={24} checked={isChecked} state={showMiss ? "missed" : "idle"} />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>

          {isFutureDay ? (
            <div className="exercise-locked-box mt-5 shrink-0">
              <Lock size={14} />
              هنوز وقتش نرسیده
            </div>
          ) : ended && !active ? (
            // تمرین این روز «تمام» ثبت شده (ExerciseLog.completed) — همون
            // باکس وضعیت «هنوز وقتش نرسیده»، فقط با متن/رنگ خودش.
            <div className="exercise-locked-box exercise-state-done mt-5 shrink-0">
              <Check size={14} strokeWidth={3} />
              انجام دادی
            </div>
          ) : isPastDay && !active ? (
            <div className="exercise-locked-box exercise-state-missed mt-5 shrink-0">
              <X size={14} strokeWidth={3} />
              وقتش گذشته
            </div>
          ) : (
            editable && (!ended || active) && (
              <div className="mt-5 shrink-0">
                {!active && (
                  <button
                    type="button"
                    onClick={handleStartClick}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border py-3 text-[13px] font-bold sm:text-[15px]"
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
                    onClick={requestEndWorkout}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border py-3 text-[13px] font-bold sm:text-[15px]"
                    style={{ borderColor: "#E05252", color: "#E05252" }}
                  >
                    {ending ? <Spinner size={14} /> : "پایان تمرین"}
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

      {confirmEnd && createPortal(
        <>
          <div className="modal-overlay open" onClick={() => setConfirmEnd(false)} />
          <div className="modal-panel liquid-glass-panel dash-scope open">
            <div className="modal-head">
              <div className="modal-title">هنوز تمرین مونده</div>
              <button className="nav-close" onClick={() => setConfirmEnd(false)} aria-label="بستن">×</button>
            </div>
            <div className="modal-body">
              <div className="text-[12.5px] leading-relaxed text-dash-text sm:text-[13.5px]">
                {remainingCount} حرکت از برنامه‌ی امروزت هنوز انجام نشده. اگه الان تمرین رو ببندی،
                همون‌ها «انجام‌نشده» ثبت می‌شن.
              </div>
              <div className="mt-4 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmEnd(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-[13px] font-bold sm:text-[14px]"
                  style={{ background: "var(--accent)", color: "var(--bg)", boxShadow: "0 8px 22px rgba(var(--accent-rgb),.3)" }}
                >
                  ادامه تمرین
                </button>
                <button
                  type="button"
                  disabled={ending}
                  onClick={endWorkout}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border bg-transparent py-3 text-[13px] font-bold sm:text-[14px]"
                  style={{ borderColor: "#E05252", color: "#E05252" }}
                >
                  {ending ? <Spinner size={14} /> : "پایان تمرین"}
                </button>
              </div>
            </div>
          </div>
        </>,
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
