"use client";

import { useEffect, useMemo, useState } from "react";
import { faNum, isoLocal, pad } from "@/lib/jalali";
import { tasksForDate } from "@/lib/schedule";
import { getCustomOccurrences, getDailyRange, getRemovedOccurrences } from "@/lib/storage";
import { getWakeSleepTimes, isWakeOnTime, timeToMinutes, DEFAULT_WAKE } from "@/lib/wakeSleep";

const now = new Date();

// همون تایم/استریکی که قبلاً روی صفحه اصلیِ کاربر لاگین‌کرده بود — حالا توی
// هدر، سمت چپ دکمه‌ی نوتیف، تا از هر صفحه‌ای دیده بشه، نه فقط صفحه اصلی.
export function HeaderStreakClock() {
  const [streak, setStreak] = useState<number | null>(null);
  const [clock, setClock] = useState("");
  const [removedOcc, setRemovedOcc] = useState<Set<string>>(new Set());
  const [customOcc, setCustomOcc] = useState<{ id: string; name: string; jsDay: number; time: string }[]>([]);
  const [wakeMinutes, setWakeMinutes] = useState(timeToMinutes(DEFAULT_WAKE));

  useEffect(() => {
    getRemovedOccurrences().then((arr) => setRemovedOcc(new Set(arr)));
    getCustomOccurrences().then(setCustomOcc);
    getWakeSleepTimes().then((v) => { if (v) setWakeMinutes(timeToMinutes(v.wake)); });
  }, []);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClock(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const opts = useMemo(
    () => ({ removedOccurrences: removedOcc, customOccurrences: customOcc }),
    [removedOcc, customOcc]
  );

  useEffect(() => {
    async function computeStreak() {
      const rangeEnd = new Date(now); rangeEnd.setDate(rangeEnd.getDate() - 1);
      const rangeStart = new Date(now); rangeStart.setDate(rangeStart.getDate() - 90);
      const entries = await getDailyRange(isoLocal(rangeStart), isoLocal(rangeEnd));

      let s = 0;
      const cursor = new Date(now);
      cursor.setDate(cursor.getDate() - 1);
      for (let i = 0; i < 90; i++) {
        const key = isoLocal(cursor);
        const expected = tasksForDate(new Date(cursor), opts);
        if (expected.length === 0) {
          cursor.setDate(cursor.getDate() - 1);
          continue;
        }
        const rec = entries[key];
        if (!rec) break;
        const doneCount = expected.filter((t) => rec.tasks[t.id]).length;
        const wakeOK = rec.wake ? isWakeOnTime(rec.wake, wakeMinutes) : false;
        const fullDay = doneCount === expected.length && wakeOK;
        if (fullDay) {
          s++;
          cursor.setDate(cursor.getDate() - 1);
        } else break;
      }
      setStreak(s);
    }
    computeStreak();
  }, [opts, wakeMinutes]);

  return (
    <div className="header-streak-clock">
      <span className="header-streak-clock-time mono">{clock}</span>
      <span className="header-streak-clock-sep" />
      <span className="header-streak-clock-streak">
        <svg className="streak-flame" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 2.2c1.1 3.1-2.6 4.7-2.6 8.3a2.6 2.6 0 0 0 5.2 0c0-1.1-.5-1.6-.5-2.7 1.6.9 2.7 2.7 2.7 4.8a4.8 4.8 0 0 1-9.6 0c0-4.3 3.2-6.4 4.8-10.4Z" fill="currentColor" />
        </svg>
        <span className="mono">{streak === null ? "…" : faNum(streak)}</span>
      </span>
    </div>
  );
}
