"use client";

import { Fragment, useEffect, useState } from "react";
import { TickButton } from "./TickButton";
import { checklistOf, isOccDone, itemKey, toggleTask as toggleChecklist } from "@/lib/routineChecklist";
import { weekdayName, jMonthName, faNum, isoLocal, toJalali } from "@/lib/jalali";
import { tr } from "@/lib/i18n";
import { tasksForDate, ScheduleTask, isDayOver } from "@/lib/schedule";
import { DailyRecord, getDaily, setDaily, getOutingDates, toggleOutingDate } from "@/lib/storage";
import { DEFAULT_SLEEP, DEFAULT_WAKE, isWakeOnTime as isWakeOnTimeShared, timeToMinutes } from "@/lib/wakeSleep";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { keyMatches, useLiveRefresh } from "@/lib/liveSync";

const todayKey = isoLocal(new Date());

export function DayModal({
  date,
  onClose,
  onChanged,
  scheduleOpts,
  wake = DEFAULT_WAKE,
  sleep = DEFAULT_SLEEP,
}: {
  date: Date;
  onClose: () => void;
  onChanged: () => void;
  scheduleOpts?: Parameters<typeof tasksForDate>[1];
  wake?: string;
  sleep?: string;
}) {
  useLockBodyScroll();
  const wakeMinutes = timeToMinutes(wake);
  const isWakeOnTime = (iso: string) => isWakeOnTimeShared(iso, wakeMinutes);
  const iso = isoLocal(date);
  const [daily, setDailyState] = useState<DailyRecord | null>(null);
  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [isOuting, setIsOuting] = useState(false);

  useEffect(() => {
    getDaily(iso).then(setDailyState);
    getOutingDates().then((arr) => setIsOuting(arr.includes(iso)));
    setTasks(tasksForDate(date, scheduleOpts));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iso]);

  // لایه‌ی زنده: تیک همین روز از جای دیگه (تب دیگه/سرور) یا برگشت یک
  // نوشتن ناموفق (rollback) همون لحظه این‌جا هم دیده بشه.
  useLiveRefresh(["daily:" + iso, "outingDates"], (changed) => {
    const all = changed.includes("*");
    if (all || changed.some((c) => keyMatches("daily:" + iso, c))) getDaily(iso).then(setDailyState);
    if (all || changed.includes("outingDates")) getOutingDates().then((arr) => setIsOuting(arr.includes(iso)));
  });

  if (!daily) return null;

  const isFuture = iso > todayKey;
  const isPast = iso < todayKey;
  // تیک‌زدن کارها روی روز گذشته/امروز باز است — ولی نه روز آینده: طبق
  // درخواست صریح کاربر، وانمود به انجام‌شدن کاری که هنوز نرسیده مجاز
  // نیست. ثبت «ساعت بیداری» هم برای روز آینده معنا ندارد و بسته می‌ماند.
  const jd = toJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());

  async function toggleTask(id: string, itemId?: string) {
    if (isFuture || isPast) return;
    // برنامه‌ی لیستی: آیتم یا همه با هم (lib/routineChecklist.ts)
    const items = checklistOf(scheduleOpts?.customOccurrences?.find((c) => c.id === id));
    const next = { ...daily!, tasks: toggleChecklist(daily!.tasks, id, items, itemId) };
    setDailyState(next);
    await setDaily(iso, next);
    onChanged();
  }

  async function registerWake() {
    const next = { ...daily!, wake: new Date().toISOString() };
    setDailyState(next);
    await setDaily(iso, next);
    onChanged();
  }

  async function toggleOuting() {
    setIsOuting((v) => !v);
    await toggleOutingDate(iso);
    onChanged();
  }

  return (
    <>
      <div className="modal-overlay open" onClick={onClose} />
      <div className="modal-panel open">
        <div className="modal-head">
          <div>
            <div className="modal-eyebrow">
              {weekdayName(date.getDay())} —{" "}
              <span style={{ color: isPast ? "#bf0a30" : isFuture ? "#0077b6" : "var(--accent)" }}>
                {isPast ? tr("بسته شده", "Closed") : isFuture ? tr("باز نشده", "Not open yet") : tr("باز است", "Open")}
              </span>
            </div>
            <div className="modal-title">
              {faNum(jd[2])} {jMonthName(jd[1] - 1)} {faNum(jd[0])}
            </div>
          </div>
          <button className="nav-close" onClick={onClose} aria-label={tr("بستن", "Close")}>×</button>
        </div>

        <div className="modal-body">
          {tasks.length ? (
            tasks.map((t) => {
              const items = checklistOf(scheduleOpts?.customOccurrences?.find((c) => c.id === t.id));
              const checked = isOccDone(daily.tasks, t.id, items);
              // همون قاعده‌ی ✕ لیست «برنامه‌های امروز»: روز گذشته، یا امروز
              // و ساعتش رد شده، و تیک نخورده.
              const missed = !checked && isDayOver(iso, new Date());
              return (
                <Fragment key={t.id}>
                <div
                  onClick={() => toggleTask(t.id)}
                  className={`task${isFuture || isPast ? " disabled" : ""}`}
                  aria-disabled={isFuture || isPast}
                >
                  <TickButton as="span" checked={checked} state={missed ? "missed" : "idle"} size={24} disabled={isFuture || isPast} />
                  <div>
                    <div className={`task-name${checked ? " done" : ""}`}>
                      {t.name}
                      {items.length > 0 && <span className="task-time" dir="ltr"> {items.filter((i) => daily.tasks[itemKey(t.id, i.id)]).length}/{items.length}</span>}
                    </div>
                    <div className="task-time">
                      {t.time}
                      {missed && (
                        <span className="task-state missed">
                          {t.time ? " · " : ""}{tr("وقتش گذشته", "Overdue")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {items.length > 0 && (
                  <ul className="day-task-items">
                    {items.map((it) => {
                      const on = !!daily.tasks[itemKey(t.id, it.id)];
                      return (
                        <li key={it.id} className={on ? "is-done" : ""}>
                          <TickButton checked={on} size={20} disabled={isFuture || isPast} onToggle={() => toggleTask(t.id, it.id)} label={`${on ? tr("برداشتن تیک", "Uncheck") : tr("تیک‌زدن", "Check")} ${it.name}`} />
                          <span>{it.name}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                </Fragment>
              );
            })
          ) : (
            <div className="item-line empty">{tr("برای این روز کاری تعریف نشده", "Nothing planned for this day")}</div>
          )}

          <div className="task" onClick={() => toggleOuting()}>
            <TickButton as="span" checked={isOuting} size={24} />
            <div className={`task-name${isOuting ? " done" : ""}`}>{tr("بیرون رفتن این روز", "Went out this day")}</div>
          </div>

          <div className="wake">
            {isFuture ? (
              <span className="wake-text">{tr("روز آینده — هنوز قابل ثبت نیست", "Future day — can't be logged yet")}</span>
            ) : daily.wake ? (
              <span className="wake-text">
                {tr("بیداری:", "Woke up:")}{" "}
                <b>
                  {new Date(daily.wake).getHours().toString().padStart(2, "0")}:
                  {new Date(daily.wake).getMinutes().toString().padStart(2, "0")}
                </b>{" "}
                —{" "}
                <span style={{ color: isWakeOnTime(daily.wake) ? "var(--accent)" : "var(--muted)" }}>
                  {isWakeOnTime(daily.wake) ? tr("به‌موقع", "On time") : tr("دیرتر از هدف", "Later than goal")}
                </span>
              </span>
            ) : iso === todayKey ? (
              <>
                <span className="wake-text">{tr("هدف: خواب", "Goal: sleep")} {sleep} — {tr("بیداری", "wake")} {wake}</span>
                <button onClick={registerWake}>{tr("ثبت بیداری الان", "Log wake-up now")}</button>
              </>
            ) : (
              <span className="wake-text">{tr("هدف: خواب", "Goal: sleep")} {sleep} — {tr("بیداری", "wake")} {wake} — {tr("این روز بسته شده، چیزی ثبت نشد", "this day is closed, nothing was logged")}</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
