"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CAL_WEEK_ORDER, weekdayShort, jMonthName, faNum,
  isoLocal, jalaliMonthLength, jalaliToGregorianApprox, toJalali,
} from "@/lib/jalali";
import { tasksForDate } from "@/lib/schedule";
import { getCustomOccurrences, getDailyRange, getRemovedOccurrences, getOutingDates } from "@/lib/storage";
import { keyMatches, useLiveRefresh } from "@/lib/liveSync";
import { DEFAULT_SLEEP, DEFAULT_WAKE } from "@/lib/wakeSleep";
import { DayModal } from "@/components/DayModal";

const now = new Date();
const todayKey = isoLocal(now);
const jToday = toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());

// تاریخچه‌ی ماهانه — دقیقا همون تقویمی که قبلا توی صفحه اصلی بود (حالا با
// ظاهر تازه‌تر)، منتقل‌شده زیر برنامه هفتگی: هر روز رفته/نرفته‌ش رو نشون
// می‌ده و با کلیک روی هر روز جزئیاتش (DayModal) باز می‌شه.
export function HistoryCalendar({
  wake = DEFAULT_WAKE,
  sleep = DEFAULT_SLEEP,
  onPick,
}: {
  wake?: string;
  sleep?: string;
  /** اگه پاس داده بشه، کلیک روی هر روز به‌جای بازکردن DayModal همین رو صدا
   * می‌زنه — برای حالت «انتخاب تاریخ گذشته» (دکمه‌ی تاریخچه‌ی داشبورد). */
  onPick?: (iso: string) => void;
}) {
  const [calYear, setCalYear] = useState(jToday[0]);
  const [calMonth, setCalMonth] = useState(jToday[1]);
  const [monthCompletion, setMonthCompletion] = useState<Record<string, boolean>>({});
  const [monthDotStatus, setMonthDotStatus] = useState<Record<string, "done" | "missed">>({});
  const [openDate, setOpenDate] = useState<Date | null>(null);
  const [removedOcc, setRemovedOcc] = useState<Set<string>>(new Set());
  const [customOcc, setCustomOcc] = useState<{ id: string; name: string; jsDay: number; time: string }[]>([]);
  const [outingDates, setOutingDates] = useState<Set<string>>(new Set());

  function loadOutingDates() {
    getOutingDates().then((arr) => setOutingDates(new Set(arr)));
  }

  const [version, setVersion] = useState(0);
  function loadAll() {
    getRemovedOccurrences().then((arr) => setRemovedOcc(new Set(arr)));
    getCustomOccurrences().then(setCustomOcc);
    loadOutingDates();
  }
  useEffect(loadAll, []);
  // لایه‌ی زنده: تیک/برنامه/روز بیرون‌رفتن از هرجا عوض شد، تقویم همون لحظه
  useLiveRefresh(["daily", "customOccurrences", "removedOccurrences", "outingDates"], (changed) => {
    const all = changed.includes("*");
    if (all || changed.some((c) => c === "customOccurrences" || c === "removedOccurrences")) {
      getRemovedOccurrences().then((arr) => setRemovedOcc(new Set(arr)));
      getCustomOccurrences().then(setCustomOcc);
    }
    if (all || changed.includes("outingDates")) loadOutingDates();
    if (all || changed.some((c) => keyMatches("daily", c))) setVersion((v) => v + 1);
  });

  const opts = useMemo(() => ({ removedOccurrences: removedOcc, customOccurrences: customOcc }), [removedOcc, customOcc]);

  async function loadMonth(jy: number, jm: number) {
    const monthLen = jalaliMonthLength(jm);
    const firstIso = isoLocal(jalaliToGregorianApprox(jy, jm, 1));
    const lastIso = isoLocal(jalaliToGregorianApprox(jy, jm, monthLen));
    const entries = await getDailyRange(firstIso, lastIso);

    const result: Record<string, boolean> = {};
    const dots: Record<string, "done" | "missed"> = {};
    for (let d = 1; d <= monthLen; d++) {
      const gd = jalaliToGregorianApprox(jy, jm, d);
      const iso = isoLocal(gd);
      const rec = entries[iso];
      const expected = tasksForDate(gd, opts);
      const doneCount = rec ? expected.filter((t) => rec.tasks[t.id]).length : 0;
      // بیدارشدن سروقت دیگه شرط AND برای «روز کامل» نیست — همون فیکس
      // lib/friendStats.ts و lib/useMyStreak.ts، هم‌قاعده‌ی این‌جا هم شد.
      const isDone = expected.length > 0 && doneCount === expected.length;
      result[iso] = isDone;
      // نقطه‌ی سبز/قرمز فقط برای روزهایی که واقعا گذشته و کاری براشون برنامه‌
      // ریزی شده بود معنی داره — روز آینده یا روزی که اصلا تسکی نداشته رو
      // قرمز نشون ندیم، چون چیزی برای «انجام‌ندادن» وجود نداشته.
      if (expected.length > 0 && iso <= todayKey) {
        dots[iso] = isDone ? "done" : "missed";
      }
    }
    setMonthCompletion(result);
    setMonthDotStatus(dots);
  }

  useEffect(() => {
    loadMonth(calYear, calMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calYear, calMonth, removedOcc, customOcc, version]);

  const monthLen = jalaliMonthLength(calMonth);
  const firstG = jalaliToGregorianApprox(calYear, calMonth, 1);
  const startCol = (firstG.getDay() + 1) % 7;

  const cells: JSX.Element[] = [];
  for (let i = 0; i < startCol; i++) cells.push(<div key={"e" + i} className="cal-cell empty" />);
  for (let d = 1; d <= monthLen; d++) {
    const gd = jalaliToGregorianApprox(calYear, calMonth, d);
    const iso = isoLocal(gd);
    const isToday = iso === todayKey;
    const dotStatus = monthDotStatus[iso];
    const hasOuting = outingDates.has(iso);
    cells.push(
      <div
        key={iso}
        onClick={() => (onPick ? onPick(iso) : setOpenDate(gd))}
        className={`cal-cell ${isToday ? "today " : ""}${dotStatus === "done" ? "done" : dotStatus === "missed" ? "missed" : ""}`}
      >
        <span className="cal-daynum mono">{faNum(d)}</span>
        {dotStatus && <span className={`cal-status-dot ${dotStatus === "missed" ? "missed" : ""}`} />}
        {hasOuting && <span className="outing-dot" />}
      </div>
    );
  }

  return (
    <div>
      <div className="cal-controls">
        <button className="small mono" onClick={() => { if (calMonth === 1) { setCalMonth(12); setCalYear((y) => y - 1); } else setCalMonth((m) => m - 1); }}>‹</button>
        <div className="cal-label">{jMonthName(calMonth - 1)} {faNum(calYear)}</div>
        <button className="small mono" onClick={() => { if (calMonth === 12) { setCalMonth(1); setCalYear((y) => y + 1); } else setCalMonth((m) => m + 1); }}>›</button>
      </div>
      <div className="cal-grid">
        {CAL_WEEK_ORDER.map((d) => <div key={d} className="cal-weekday">{weekdayShort(d)}</div>)}
        {cells}
      </div>

      {openDate && (
        <DayModal
          date={openDate}
          onClose={() => setOpenDate(null)}
          onChanged={() => { loadMonth(calYear, calMonth); loadOutingDates(); }}
          scheduleOpts={opts}
          wake={wake}
          sleep={sleep}
        />
      )}
    </div>
  );
}
