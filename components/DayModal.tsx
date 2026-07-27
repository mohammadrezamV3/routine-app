"use client";

import { useEffect, useState } from "react";
import { FA_WEEKDAY, J_MONTHS, faNum, isoLocal, toJalali } from "@/lib/jalali";
import { tasksForDate, ScheduleTask } from "@/lib/schedule";
import { DailyRecord, getDaily, setDaily, getOutingDates, toggleOutingDate } from "@/lib/storage";
import { DEFAULT_SLEEP, DEFAULT_WAKE, isWakeOnTime as isWakeOnTimeShared, timeToMinutes } from "@/lib/wakeSleep";

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

  if (!daily) return null;

  const isFuture = iso > todayKey;
  const isPast = iso < todayKey;
  const isLocked = isFuture || isPast;
  const jd = toJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());

  async function toggleTask(id: string) {
    const next = { ...daily!, tasks: { ...daily!.tasks, [id]: !daily!.tasks[id] } };
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
              {FA_WEEKDAY[date.getDay()]} —{" "}
              <span style={{ color: isPast ? "#bf0a30" : isFuture ? "#0077b6" : "var(--accent)" }}>
                {isPast ? "بسته شده" : isFuture ? "باز نشده" : "باز است"}
              </span>
            </div>
            <div className="modal-title">
              {faNum(jd[2])} {J_MONTHS[jd[1] - 1]} {faNum(jd[0])}
            </div>
          </div>
          <button className="nav-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {tasks.length ? (
            tasks.map((t) => {
              const checked = !!daily.tasks[t.id];
              return (
                <div
                  key={t.id}
                  onClick={() => !isLocked && toggleTask(t.id)}
                  className={`task${isLocked ? " disabled" : ""}`}
                >
                  <div className={`check${checked ? " on" : ""}`}>
                    <svg className="c-check" viewBox="0 0 24 24" fill="none">
                      <path d="M2.5 13l5.5 5.5L21.5 4.5" stroke="var(--bg)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <div className={`task-name${checked ? " done" : ""}`}>{t.name}</div>
                    <div className="task-time">{t.time}</div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="item-line empty">برای این روز کاری تعریف نشده</div>
          )}

          <div
            className="task"
            onClick={toggleOuting}
          >
            <div className={`check${isOuting ? " on" : ""}`}>
              <svg className="c-check" viewBox="0 0 24 24" fill="none">
                <path d="M2.5 13l5.5 5.5L21.5 4.5" stroke="var(--bg)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className={`task-name${isOuting ? " done" : ""}`}>بیرون رفتن این روز</div>
          </div>

          <div className="wake">
            {isFuture ? (
              <span className="wake-text">روز آینده — هنوز قابل ثبت نیست</span>
            ) : daily.wake ? (
              <span className="wake-text">
                بیداری:{" "}
                <b>
                  {new Date(daily.wake).getHours().toString().padStart(2, "0")}:
                  {new Date(daily.wake).getMinutes().toString().padStart(2, "0")}
                </b>{" "}
                —{" "}
                <span style={{ color: isWakeOnTime(daily.wake) ? "var(--accent)" : "var(--muted)" }}>
                  {isWakeOnTime(daily.wake) ? "به‌موقع" : "دیرتر از هدف"}
                </span>
              </span>
            ) : iso === todayKey ? (
              <>
                <span className="wake-text">هدف: خواب {sleep} — بیداری {wake}</span>
                <button onClick={registerWake}>ثبت بیداری الان</button>
              </>
            ) : (
              <span className="wake-text">هدف: خواب {sleep} — بیداری {wake} — این روز بسته شده، چیزی ثبت نشد</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
