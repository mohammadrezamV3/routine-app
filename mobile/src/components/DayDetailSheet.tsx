import { useState } from "react";
import BottomSheet from "./BottomSheet";
import { FA_WEEKDAY, J_MONTHS, faNum, isoLocal, toJalali } from "@/lib/jalali";
import { tasksForDate, ScheduleOpts } from "@/lib/schedule";
import { isWakeOnTime, timeToMinutes } from "@/lib/wakeSleepLogic";
import { tapHaptic } from "@/lib/haptics";
import {
  useDaily, useOutingDates, toggleDailyTask, registerWakeNow, toggleOutingDate,
} from "@/db/repo";

const todayKey = isoLocal(new Date());

// جزئیاتِ یک روزِ مشخص — پورت از components/DayModal.tsx وب، روی BottomSheet.
export default function DayDetailSheet({
  open,
  onClose,
  date,
  scheduleOpts,
  wake,
  sleep,
}: {
  open: boolean;
  onClose: () => void;
  date: Date;
  scheduleOpts: ScheduleOpts;
  wake: string;
  sleep: string;
}) {
  const iso = isoLocal(date);
  const daily = useDaily(iso);
  const outingDates = useOutingDates();
  const [busy, setBusy] = useState(false);

  const isFuture = iso > todayKey;
  const isPast = iso < todayKey;
  const jd = toJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const tasks = tasksForDate(date, scheduleOpts);
  const isOuting = !!outingDates?.includes(iso);
  const wakeMinutes = timeToMinutes(wake);

  async function toggle(id: string) {
    if (isFuture || busy) return;
    void tapHaptic();
    await toggleDailyTask(iso, id);
  }

  async function onRegisterWake() {
    if (busy) return;
    setBusy(true);
    await registerWakeNow(iso);
    setBusy(false);
  }

  async function onToggleOuting() {
    void tapHaptic();
    await toggleOutingDate(iso);
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={`${faNum(jd[2])} ${J_MONTHS[jd[1] - 1]} ${faNum(jd[0])}`}>
      <div className="mb-3 font-vazir text-[12px]" style={{ color: "var(--muted)" }}>
        {FA_WEEKDAY[date.getDay()]} — {isPast ? "بسته شده" : isFuture ? "باز نشده" : "باز است"}
      </div>

      <div className="flex flex-col gap-2">
        {tasks.length ? (
          tasks.map((t) => {
            const checked = !!daily?.tasks[t.id];
            return (
              <button
                key={t.id}
                onClick={() => toggle(t.id)}
                disabled={isFuture}
                className="flex items-center gap-3 rounded-2xl px-3"
                style={{ minHeight: 52, background: "var(--surface-2)", opacity: isFuture ? 0.5 : 1 }}
              >
                <span
                  className="flex items-center justify-center rounded-full"
                  style={{ width: 24, height: 24, border: `2px solid ${checked ? "var(--accent)" : "var(--surface-line)"}`, background: checked ? "var(--accent)" : "transparent", flexShrink: 0 }}
                >
                  {checked && (
                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                      <path d="M2.5 13l5.5 5.5L21.5 4.5" stroke="var(--bg)" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <div className="min-w-0 flex-1 text-start">
                  <div className="truncate font-vazir text-[13.5px]" style={{ color: "var(--text)", textDecoration: checked ? "line-through" : "none" }}>{t.name}</div>
                  <div className="mono text-[11.5px]" style={{ color: "var(--muted)" }}>{t.time}</div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="rounded-2xl px-3 py-4 text-center font-vazir text-[13px]" style={{ background: "var(--surface-2)", color: "var(--muted)" }}>
            برای این روز کاری تعریف نشده
          </div>
        )}

        <button
          onClick={onToggleOuting}
          className="flex items-center gap-3 rounded-2xl px-3"
          style={{ minHeight: 52, background: "var(--surface-2)" }}
        >
          <span
            className="flex items-center justify-center rounded-full"
            style={{ width: 24, height: 24, border: `2px solid ${isOuting ? "var(--secondary)" : "var(--surface-line)"}`, background: isOuting ? "var(--secondary)" : "transparent", flexShrink: 0 }}
          >
            {isOuting && (
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                <path d="M2.5 13l5.5 5.5L21.5 4.5" stroke="var(--bg)" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <div className="font-vazir text-[13.5px]" style={{ color: "var(--text)" }}>بیرون رفتنِ این روز</div>
        </button>

        <div className="mt-2 rounded-2xl px-3 py-3 font-vazir text-[12.5px]" style={{ background: "var(--surface-2)", color: "var(--muted)" }}>
          {isFuture ? (
            "روزِ آینده — هنوز قابلِ ثبت نیست"
          ) : daily?.wake ? (
            <>
              بیداری:{" "}
              <b style={{ color: "var(--text)" }}>
                {new Date(daily.wake).getHours().toString().padStart(2, "0")}:{new Date(daily.wake).getMinutes().toString().padStart(2, "0")}
              </b>{" "}
              — <span style={{ color: isWakeOnTime(daily.wake, wakeMinutes) ? "var(--accent)" : "var(--muted)" }}>
                {isWakeOnTime(daily.wake, wakeMinutes) ? "به‌موقع" : "دیرتر از هدف"}
              </span>
            </>
          ) : iso === todayKey ? (
            <div className="flex items-center justify-between">
              <span>هدف: خواب {sleep} — بیداری {wake}</span>
              <button onClick={onRegisterWake} disabled={busy} className="font-vazir text-[12.5px] font-bold" style={{ color: "var(--accent)" }}>
                ثبتِ بیداری الان
              </button>
            </div>
          ) : (
            `هدف: خواب ${sleep} — بیداری ${wake} — این روز بسته شده`
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
