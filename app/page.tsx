"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CAL_WEEK_ORDER,
  FA_WEEKDAY,
  FA_WEEKDAY_SHORT,
  J_MONTHS,
  faNum,
  isoLocal,
  jalaliMonthLength,
  jalaliToGregorianApprox,
  pad,
  toJalali,
} from "@/lib/jalali";
import { tasksForDate } from "@/lib/schedule";
import {
  getCustomOccurrences,
  getDailyRange,
  getRemovedOccurrences,
  getOutingDates,
} from "@/lib/storage";
import { DayModal } from "@/components/DayModal";

const now = new Date();
const todayKey = isoLocal(now);
const jToday = toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());

function isWakeOnTime(iso: string) {
  const d = new Date(iso);
  const h = d.getHours(), m = d.getMinutes();
  return h < 9 || (h === 9 && m <= 30);
}

export default function HomePage() {
  const [calYear, setCalYear] = useState(jToday[0]);
  const [calMonth, setCalMonth] = useState(jToday[1]);
  const [monthCompletion, setMonthCompletion] = useState<Record<string, boolean>>({});
  const [streak, setStreak] = useState<number | null>(null);
  const [clock, setClock] = useState("");
  const [openDate, setOpenDate] = useState<Date | null>(null);
  const [removedOcc, setRemovedOcc] = useState<Set<string>>(new Set());
  const [customOcc, setCustomOcc] = useState<{ id: string; name: string; jsDay: number; time: string }[]>([]);
  const [outingDates, setOutingDates] = useState<Set<string>>(new Set());

  function loadOutingDates() {
    getOutingDates().then((arr) => setOutingDates(new Set(arr)));
  }

  useEffect(() => {
    getRemovedOccurrences().then((arr) => setRemovedOcc(new Set(arr)));
    getCustomOccurrences().then(setCustomOcc);
    loadOutingDates();
  }, []);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClock(`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const opts = useMemo(
    () => ({ removedOccurrences: removedOcc, customOccurrences: customOcc }),
    [removedOcc, customOcc]
  );

  async function loadMonth(jy: number, jm: number) {
    const monthLen = jalaliMonthLength(jm);
    const firstIso = isoLocal(jalaliToGregorianApprox(jy, jm, 1));
    const lastIso = isoLocal(jalaliToGregorianApprox(jy, jm, monthLen));
    const entries = await getDailyRange(firstIso, lastIso); // یک درخواست برای کل ماه

    const result: Record<string, boolean> = {};
    for (let d = 1; d <= monthLen; d++) {
      const gd = jalaliToGregorianApprox(jy, jm, d);
      const iso = isoLocal(gd);
      const rec = entries[iso];
      if (rec) {
        const expected = tasksForDate(gd, opts);
        const doneCount = expected.filter((t) => rec.tasks[t.id]).length;
        const wakeOK = rec.wake ? isWakeOnTime(rec.wake) : false;
        result[iso] = expected.length > 0 && doneCount === expected.length && wakeOK;
      } else {
        result[iso] = false;
      }
    }
    setMonthCompletion(result);
  }

  async function computeStreak() {
    // یک درخواست برای کل بازه ۹۰ روزه، به‌جای تا ۹۰ درخواست جدا
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
      const wakeOK = rec.wake ? isWakeOnTime(rec.wake) : false;
      const fullDay = doneCount === expected.length && wakeOK;
      if (fullDay) {
        s++;
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    }
    setStreak(s);
  }

  useEffect(() => {
    loadMonth(calYear, calMonth);
    computeStreak();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calYear, calMonth, removedOcc, customOcc]);

  const monthLen = jalaliMonthLength(calMonth);
  const firstG = jalaliToGregorianApprox(calYear, calMonth, 1);
  const startCol = (firstG.getDay() + 1) % 7;

  const weekdayHeaders = CAL_WEEK_ORDER.map((d) => (
    <div key={d} className="cal-weekday">{FA_WEEKDAY_SHORT[d]}</div>
  ));

  const cells: JSX.Element[] = [];
  for (let i = 0; i < startCol; i++) {
    cells.push(<div key={"e" + i} className="cal-cell empty" />);
  }
  for (let d = 1; d <= monthLen; d++) {
    const gd = jalaliToGregorianApprox(calYear, calMonth, d);
    const iso = isoLocal(gd);
    const isToday = iso === todayKey;
    const done = !!monthCompletion[iso];
    const hasOuting = outingDates.has(iso);
    cells.push(
      <div
        key={iso}
        onClick={() => setOpenDate(gd)}
        className={`cal-cell ${isToday ? "today " : ""}${done ? "done" : ""}`}
      >
        <span className="cal-check">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M2.5 13l5.5 5.5L21.5 4.5" stroke="var(--bg)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="cal-daynum mono">{faNum(d)}</span>
        {hasOuting && <span className="outing-dot" />}
      </div>
    );
  }

  const weekdayName = FA_WEEKDAY[now.getDay()];

  return (
    <>
      <section id="sec-top">
        <h1>روتین من</h1>
        <div className="dateline">
          <span>{weekdayName}</span>
          <span className="mono">{faNum(jToday[2])} {J_MONTHS[jToday[1] - 1]} {faNum(jToday[0])}</span>
          <span className="mono">{todayKey}</span>
          <span className="mono" style={{ color: "var(--accent)", fontWeight: 600 }}>{clock}</span>
        </div>
        <div className="home-stats">
          استریک: <b>{streak === null ? "…" : faNum(streak)}</b> روز
        </div>
      </section>

      <section id="sec-calendar">
        <div className="cal-head-row">
          <h2>تقویم ماهانه</h2>
          <button
            className="cal-return-btn"
            aria-label="برگشت به امروز"
            onClick={() => { setCalYear(jToday[0]); setCalMonth(jToday[1]); }}
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M19.5 12a7.5 7.5 0 1 1-2.6-5.68" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M19.8 4v5.2h-5.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12.3" r="1.7" fill="currentColor" />
            </svg>
          </button>
        </div>
        <div className="cal-controls">
          <div className="cal-nav">
            <button
              className="small mono"
              onClick={() => { if (calMonth === 1) { setCalMonth(12); setCalYear((y) => y - 1); } else setCalMonth((m) => m - 1); }}
            >‹</button>
          </div>
          <div className="cal-label">{J_MONTHS[calMonth - 1]} {faNum(calYear)}</div>
          <div className="cal-nav">
            <button
              className="small mono"
              onClick={() => { if (calMonth === 12) { setCalMonth(1); setCalYear((y) => y + 1); } else setCalMonth((m) => m + 1); }}
            >›</button>
          </div>
        </div>
        <div className="cal-grid">
          {weekdayHeaders}
          {cells}
        </div>
      </section>

      {openDate && (
        <DayModal
          date={openDate}
          onClose={() => setOpenDate(null)}
          onChanged={() => { loadMonth(calYear, calMonth); computeStreak(); loadOutingDates(); }}
          scheduleOpts={opts}
        />
      )}
    </>
  );
}
