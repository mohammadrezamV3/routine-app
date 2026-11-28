"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { m as motion } from "framer-motion";
import { TickButton } from "./TickButton";
import { Check, Dumbbell, Lock, Pencil, Play, Plus, Repeat2, RotateCw, Timer, X } from "lucide-react";
import { DashCard } from "./DashCard";
import type { ExerciseDay } from "@/lib/exercisePlans";
import { isoLocal } from "@/lib/jalali";
import { reportLiveError } from "@/lib/liveSync";
import { parseExerciseItem } from "@/lib/exerciseSets";
import {
  MAX_SESSIONS_PER_DAY, SessionEntry, applySessionWrite, defaultSessionNo, isSessionFullyDone, nextSessionNo, sessionStatus,
} from "@/lib/exerciseSessions";
import { SegmentedTabs } from "./SegmentedTabs";
import dynamic from "next/dynamic";
import { EXERCISE_TUTORIAL_SEEN_KEY } from "@/lib/tutorialSeen";
// فقط با شروع تمرین / زدن یک حرکت لازم می‌شن — کدشون توی باندل اولیه نیست
const ExerciseSetTrackerModal = dynamic(() => import("./ExerciseSetTrackerModal").then((m) => m.ExerciseSetTrackerModal), { ssr: false });
const ExerciseSetTutorial = dynamic(() => import("./ExerciseSetTutorial").then((m) => m.ExerciseSetTutorial), { ssr: false });
import { Spinner } from "./Spinner";
import { isEn, tr } from "@/lib/i18n";
import { exerciseDisplayName, focusDisplay, useExerciseEn } from "@/lib/exerciseI18n";

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/** ثانیه‌ها رو به یه لیبل کوتاه برای جدول مشخصات تبدیل می‌کنه — «30 ثانیه» یا «25 دقیقه» */
function formatSpecDuration(seconds: number | null): string {
  if (!seconds) return "—";
  if (seconds % 60 === 0) return tr(`${seconds / 60} دقیقه`, `${seconds / 60} min`);
  if (seconds < 60) return tr(`${seconds} ثانیه`, `${seconds} sec`);
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
  title = tr("برنامه تمرینی", "Workout plan"),
  restDayLabel = tr("امروز روز استراحته — چیزی برنامه‌ریزی نشده.", "Today is a rest day. Nothing is planned."),
  sessions,
  onSubstitute,
  substitutingItem,
  onSessionEnd,
  onAddProgram,
  onActiveChange,
  onStarted,
  onProgress,
  delay,
}: {
  planId: string;
  dayPlan: ExerciseDay | undefined;
  dateIso: string;
  editable: boolean;
  title?: string;
  restDayLabel?: string;
  /** جلسه‌های ثبت‌شده‌ی همین روز (چند جلسه در روز؛ lib/exerciseSessions.ts) */
  sessions: SessionEntry[];
  onSubstitute: (day: string, item: string) => void;
  substitutingItem: string | null;
  onSessionEnd: () => void;
  onAddProgram: () => void;
  onActiveChange?: (active: boolean) => void;
  /** «شروع تمرین» روی سرور ثبت شد — حالت «ماندن» با همین روز را گذرانده حساب می‌کند */
  onStarted?: () => void;
  /** تعداد حرکت‌های انجام‌شده‌ی همین روز (اجتماع جلسه‌ها، زنده با هر تیک) برای حلقه‌ی بالای صفحه */
  onProgress?: (done: number, completed: boolean, dateIso: string) => void;
  delay?: number;
}) {
  useExerciseEn();
  const todayPlan = dayPlan;
  const isFutureDay = dateIso > isoLocal(new Date());
  const isPastDay = dateIso < isoLocal(new Date());
  // چند جلسه در روز: هر چیز از فهرست جلسه‌ها مشتق می‌شه. `local` نسخه‌ی خوش‌بینانه‌ی
  // فهرست سرور است (هر نوشتن همان لحظه روش می‌نشیند و با خطا برمی‌گردد).
  const sessionsKey = JSON.stringify(sessions.map((x) => [x.no, x.completed, x.completedItems.length, x.plannedCount, x.started]));
  const [local, setLocal] = useState<SessionEntry[]>(sessions);
  const [sessionNo, setSessionNo] = useState(() => defaultSessionNo(sessions));
  const [elapsed, setElapsed] = useState(0);
  const [ending, setEnding] = useState(false);
  const [tutorialFor, setTutorialFor] = useState<"start" | "new" | null>(null);
  const [setTrackerItem, setSetTrackerItem] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const localRef = useRef(local);
  localRef.current = local;

  // روز یا فهرست سرور عوض شد → دوباره از سرور؛ جلسه‌ی انتخاب‌شده فقط وقتی دیگه
  // وجود نداره (روز دیگه) به پیش‌فرض برمی‌گرده.
  const dayKey = `${dateIso}|${todayPlan?.day ?? ""}`;
  const lastDayKey = useRef(dayKey);
  useEffect(() => {
    setLocal(sessions);
    if (lastDayKey.current !== dayKey) {
      lastDayKey.current = dayKey;
      setSessionNo(defaultSessionNo(sessions));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionsKey, dayKey]);

  const cur = local.find((x) => x.no === sessionNo);
  const status = sessionStatus(cur);
  const active = status === "active" && editable;
  const curDone = status === "done";
  const curResumable = status === "resumable";
  const ended = (status === "done" || status === "resumable");
  const dayEnded = local.some((x) => x.completed);
  const checked = useMemo(() => new Set(cur?.completedItems ?? []), [cur]);
  const canAddSession = editable && !isFutureDay && !!todayPlan && !active && local.length > 0 && local.length < MAX_SESSIONS_PER_DAY;

  useEffect(() => {
    if (!active) { if (timerRef.current) clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [active]);

  useEffect(() => { onActiveChange?.(active); }, [active, onActiveChange]);
  useEffect(() => {
    const union = new Set<string>();
    local.forEach((x) => x.completedItems.forEach((i) => union.add(i)));
    onProgress?.(union.size, dayEnded, dateIso);
  }, [local, dayEnded, dateIso, onProgress]);

  // true = روی سرور نشست. خطا دیگه بی‌صدا بلعیده نمی‌شه: صدازننده تغییر
  // optimistic رو برمی‌گردونه و پیام سراسری (LiveSyncToaster) نشون داده می‌شه.
  async function post(body: Record<string, unknown>): Promise<boolean> {
    const res = await fetch("/api/exercise/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId, date: dateIso, session: sessionNoRef.current, ...body }),
    }).catch(() => null);
    if (res?.ok) return true;
    if (res && res.status === 409) {
      // جلسه‌ی کامل دوباره شروع نمی‌شه — وضعیت واقعی رو از سرور بگیر
      reportLiveError(tr("این جلسه کامل انجام شده و دوباره شروع نمی‌شود. برای تمرین بیشتر جلسه‌ی جدید بساز", "This session is already fully completed. Start a new session to train more"));
      onSessionEnd();
    } else {
      reportLiveError(tr("ذخیره نشد — تغییر برگردانده شد. اتصال را چک کن و دوباره امتحان کن", "Not saved. The change was reverted. Check your connection and try again"));
    }
    return false;
  }
  const sessionNoRef = useRef(sessionNo);
  sessionNoRef.current = sessionNo;

  function startWorkout(newSession = false) {
    if (!editable) return;
    const no = newSession ? nextSessionNo(localRef.current) : sessionNo;
    if (newSession && no > MAX_SESSIONS_PER_DAY) return;
    const before = localRef.current;
    sessionNoRef.current = no;
    setSessionNo(no);
    setElapsed(0);
    setLocal(applySessionWrite(before, { session: no, started: true }));
    // ثبت «شروع/ادامه» — بدون این، حالت «ماندن» (lib/exerciseProgression.ts) همین
    // تمرین را فردا دوباره می‌آورد. روی جلسه‌ی ناقص پایان‌خورده یعنی «ادامه».
    post({ started: true }).then((ok) => {
      if (ok) onStarted?.();
      else setLocal(before);
    });
  }

  function handleStartClick(newSession = false) {
    if (!editable) return;
    let seen = false;
    try { seen = localStorage.getItem(EXERCISE_TUTORIAL_SEEN_KEY) === "1"; } catch {}
    if (!seen) { setTutorialFor(newSession ? "new" : "start"); return; }
    startWorkout(newSession);
  }

  // optimistic: تیک همون لحظه می‌خوره؛ اگه سرور رد کرد همون حرکت برمی‌گرده.
  function markItemDone(item: string) {
    const list = localRef.current;
    const no = sessionNoRef.current;
    const prevItems = list.find((x) => x.no === no)?.completedItems ?? [];
    if (prevItems.includes(item)) return;
    const nextItems = [...prevItems, item];
    const optimistic = applySessionWrite(list, { session: no, completed: false, completedItems: nextItems });
    localRef.current = optimistic;
    setLocal(optimistic);
    post({ completed: false, completedItems: nextItems }).then((ok) => {
      if (ok) return;
      setLocal((curList) => applySessionWrite(curList, {
        session: no, completed: false,
        completedItems: (curList.find((x) => x.no === no)?.completedItems ?? []).filter((i) => i !== item),
      }));
    });
  }

  const remainingCount = (todayPlan?.items ?? []).filter((it) => !checked.has(it)).length;

  // زدن «پایان تمرین» وقتی هنوز حرکتی مونده، به‌جای ثبت بی‌برگشت، اول
  // می‌پرسه. بعد از پایان ناقص همین جلسه با «ادامه‌ی تمرین» قابل ادامه‌ست.
  function requestEndWorkout() {
    if (remainingCount > 0) { setConfirmEnd(true); return; }
    endWorkout();
  }

  async function endWorkout() {
    setConfirmEnd(false);
    setEnding(true);
    const before = localRef.current;
    const items = Array.from(checked);
    const planned = todayPlan?.items.length ?? 0;
    const ok = await post({ completed: true, completedItems: items, plannedCount: planned });
    setEnding(false);
    if (!ok) return; // تمرین باز می‌مونه تا دوباره «پایان» بزنه
    setLocal(applySessionWrite(before, { session: sessionNoRef.current, completed: true, completedItems: items, plannedCount: planned }));
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
            {tr("تغییر برنامه", "Change plan")}
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
          <div className="mt-1 shrink-0 text-[11px] text-dash-muted sm:text-[12.5px]">{focusDisplay(todayPlan.focus)}</div>

          {local.length > 1 && (
            <SegmentedTabs
              className="mt-3 shrink-0"
              ariaLabel={tr("جلسه‌های تمرین این روز", "Workout sessions of this day")}
              disabled={active}
              active={String(sessionNo)}
              onChange={(v) => { setSessionNo(Number(v)); setElapsed(0); }}
              options={local.map((x) => ({ value: String(x.no), label: tr(`جلسه ${x.no}`, `Session ${x.no}`) }))}
            />
          )}

          {/* کارت با تعداد حرکت‌ها بزرگ نمی‌شه (درخواست صریح) — خود لیست
              سقف ارتفاع داره و داخلش اسکرول می‌شه. باگ قبلی: سقف روی قاب بیرونی
              بود و اسکرولر h-full داشت؛ درصد ارتفاع روی max-height حل نمی‌شه،
              پس اسکرولر هیچ‌وقت اسکرول نمی‌کرد و ردیف‌ها از کارت بیرون می‌زدن.
              حالا max-height مستقیم روی خود عنصر overflow نشسته. */}
          <div className="mt-4 shrink-0" dir="ltr">
          <div className="exercise-list-scroll thin-scroll overflow-y-auto overflow-x-hidden px-1" dir={isEn() ? "ltr" : "rtl"} style={{ maxHeight: 360 }}>
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
                      <td className="epc-name">{exerciseDisplayName(spec.baseName)}</td>
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
                            aria-label={tr("جایگزینی این حرکت", "Replace this exercise")}
                            title={tr("این تجهیزات رو ندارم — جایگزین کن", "I don't have this equipment. Replace it")}
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
                              {tr("شروع", "Start")}
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
              {tr("هنوز وقتش نرسیده", "Not yet")}
            </div>
          ) : active ? (
            <div className="mt-5 shrink-0">
              <button
                type="button"
                disabled={ending}
                onClick={requestEndWorkout}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border py-3 text-[13px] font-bold sm:text-[15px]"
                style={{ borderColor: "#E05252", color: "#E05252" }}
              >
                {ending ? <Spinner size={14} /> : tr("پایان تمرین", "Finish workout")}
              </button>
            </div>
          ) : curDone ? (
            // جلسه‌ی کامل: دوباره شروع نمی‌شه؛ فقط جلسه‌ی جدید (تمرین اضافه)
            <div className="mt-5 flex shrink-0 flex-col gap-2.5">
              <div className="exercise-locked-box exercise-state-done">
                <Check size={14} strokeWidth={3} />
                {tr("انجام شد", "Completed")}
              </div>
              {canAddSession && (
                <button type="button" className="btn btn-ghost btn-sm w-full" onClick={() => handleStartClick(true)}>
                  <Plus size={14} />
                  {tr("جلسه‌ی جدید", "New session")}
                </button>
              )}
            </div>
          ) : curResumable ? (
            // جلسه‌ی پایان‌خورده ولی ناقص: ادامه از همان‌جا که مانده
            <div className="mt-5 flex shrink-0 flex-col gap-2.5">
              {editable ? (
                <>
                  <button type="button" className="btn btn-primary w-full" onClick={() => handleStartClick(false)}>
                    <Play size={16} />
                    {tr("ادامه‌ی تمرین", "Continue workout")}
                  </button>
                  {canAddSession && (
                    <button type="button" className="btn btn-ghost btn-sm w-full" onClick={() => handleStartClick(true)}>
                      <Plus size={14} />
                      {tr("جلسه‌ی جدید", "New session")}
                    </button>
                  )}
                </>
              ) : (
                <div className="exercise-locked-box exercise-state-missed">
                  <X size={14} strokeWidth={3} />
                  {tr("ناقص ماند", "Left unfinished")}
                </div>
              )}
            </div>
          ) : isPastDay ? (
            dayEnded ? (
              <div className="exercise-locked-box exercise-state-done mt-5 shrink-0">
                <Check size={14} strokeWidth={3} />
                {tr("انجام دادی", "Done")}
              </div>
            ) : (
              <div className="exercise-locked-box exercise-state-missed mt-5 shrink-0">
                <X size={14} strokeWidth={3} />
                {tr("وقتش گذشته", "Overdue")}
              </div>
            )
          ) : (
            editable && (
              <div className="mt-5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleStartClick(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border py-3 text-[13px] font-bold sm:text-[15px]"
                  style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                >
                  <Play size={16} />
                  {tr("شروع تمرین", "Start workout")}
                </button>
              </div>
            )
          )}
        </>
      )}

      {tutorialFor && createPortal(
        <ExerciseSetTutorial
          onDone={() => { const nw = tutorialFor === "new"; setTutorialFor(null); startWorkout(nw); }}
        />,
        document.body
      )}

      {confirmEnd && createPortal(
        <>
          <div className="modal-overlay open" onClick={() => setConfirmEnd(false)} />
          <div className="modal-panel liquid-glass-panel dash-scope open">
            <div className="modal-head">
              <div className="modal-title">{tr("هنوز تمرین مونده", "Workout not finished")}</div>
              <button className="nav-close" onClick={() => setConfirmEnd(false)} aria-label={tr("بستن", "Close")}>×</button>
            </div>
            <div className="modal-body">
              <div className="text-[12.5px] leading-relaxed text-dash-text sm:text-[13.5px]">
                {tr(`${remainingCount} حرکت از برنامه‌ی امروزت هنوز انجام نشده. اگه الان تمرین رو ببندی،
                همون‌ها «انجام‌نشده» ثبت می‌شن؛ ولی بعدا می‌تونی همین جلسه رو ادامه بدی.`, `${remainingCount} ${remainingCount === 1 ? "exercise" : "exercises"} from today's plan ${remainingCount === 1 ? "is" : "are"} still not done. If you finish now, they will be marked as not done, but you can continue this session later.`)}
              </div>
              <div className="mt-4 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmEnd(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-[13px] font-bold sm:text-[14px]"
                  style={{ background: "var(--accent)", color: "var(--sec-on-accent, var(--bg))", boxShadow: "0 8px 22px rgba(var(--accent-rgb),.3)" }}
                >
                  {tr("ادامه تمرین", "Continue workout")}
                </button>
                <button
                  type="button"
                  disabled={ending}
                  onClick={endWorkout}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border bg-transparent py-3 text-[13px] font-bold sm:text-[14px]"
                  style={{ borderColor: "#E05252", color: "#E05252" }}
                >
                  {ending ? <Spinner size={14} /> : tr("پایان تمرین", "Finish workout")}
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
