"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CAL_WEEK_ORDER, FA_WEEKDAY_SHORT, J_MONTHS, faNum,
  formatJalali, isoLocal, jalaliMonthLength, jalaliToGregorianApprox, toJalali,
} from "@/lib/jalali";

type CodingLogEntry = {
  id: string;
  date: string;
  completed: boolean;
  minutesSpent: number | null;
  topic: string | null;
  notes: string | null;
};

const now = new Date();
const jToday = toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
const todayIso = isoLocal(now);

export function CodingPanel() {
  const [calYear, setCalYear] = useState(jToday[0]);
  const [calMonth, setCalMonth] = useState(jToday[1]);
  const [logs, setLogs] = useState<CodingLogEntry[]>([]);
  const [streak, setStreak] = useState<number | null>(null);
  const [selectedIso, setSelectedIso] = useState(todayIso);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [minutesSpent, setMinutesSpent] = useState("");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");

  const monthLen = jalaliMonthLength(calMonth);
  const firstG = jalaliToGregorianApprox(calYear, calMonth, 1);
  const startCol = (firstG.getDay() + 1) % 7;
  const monthStartIso = isoLocal(jalaliToGregorianApprox(calYear, calMonth, 1));
  const monthEndIso = isoLocal(jalaliToGregorianApprox(calYear, calMonth, monthLen));

  async function loadMonth() {
    setLoading(true);
    const res = await fetch(`/api/coding/log?from=${monthStartIso}&to=${monthEndIso}`);
    const data = await res.json();
    setLogs(data.logs || []);
    setLoading(false);
  }

  useEffect(() => { loadMonth(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [calYear, calMonth]);

  // استریک بر پایه‌ی ۹۰ روز اخیر محاسبه می‌شه، نه فقط ماه در حال نمایش —
  // چون استریک می‌تونه از مرز ماه رد بشه.
  async function loadStreak() {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 90);
    const res = await fetch(`/api/coding/log?from=${isoLocal(start)}&to=${isoLocal(end)}`);
    const data = await res.json();
    const byDate: Record<string, boolean> = {};
    (data.logs as CodingLogEntry[] || []).forEach((l) => { byDate[isoLocal(new Date(l.date))] = l.completed; });

    let s = 0;
    const cursor = new Date();
    if (!byDate[isoLocal(cursor)]) cursor.setDate(cursor.getDate() - 1);
    while (byDate[isoLocal(cursor)]) {
      s++;
      cursor.setDate(cursor.getDate() - 1);
    }
    setStreak(s);
  }

  useEffect(() => { loadStreak(); }, [logs]);

  const byDay = useMemo(() => {
    const map: Record<string, CodingLogEntry> = {};
    logs.forEach((l) => { map[isoLocal(new Date(l.date))] = l; });
    return map;
  }, [logs]);

  useEffect(() => {
    const l = byDay[selectedIso];
    setMinutesSpent(l?.minutesSpent != null ? String(l.minutesSpent) : "");
    setTopic(l?.topic || "");
    setNotes(l?.notes || "");
  }, [selectedIso, byDay]);

  const selectedDone = !!byDay[selectedIso]?.completed;

  async function save(nextCompleted: boolean) {
    setSaving(true);
    const res = await fetch("/api/coding/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: selectedIso,
        completed: nextCompleted,
        minutesSpent: minutesSpent ? +minutesSpent : undefined,
        topic: topic || undefined,
        notes: notes || undefined,
      }),
    });
    setSaving(false);
    if (res.ok) loadMonth();
  }

  const cells: JSX.Element[] = [];
  for (let i = 0; i < startCol; i++) cells.push(<div key={"e" + i} className="cal-cell empty" />);
  for (let d = 1; d <= monthLen; d++) {
    const gd = jalaliToGregorianApprox(calYear, calMonth, d);
    const iso = isoLocal(gd);
    const done = !!byDay[iso]?.completed;
    cells.push(
      <div
        key={iso}
        onClick={() => setSelectedIso(iso)}
        className={`cal-cell${iso === selectedIso ? " today" : ""}${done ? " done" : ""}`}
      >
        <span className="cal-check">
          <svg viewBox="0 0 24 24" fill="none"><path d="M2.5 13l5.5 5.5L21.5 4.5" stroke="var(--bg)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <span className="cal-daynum mono">{faNum(d)}</span>
      </div>
    );
  }

  const selectedJalali = toJalali(+selectedIso.slice(0, 4), +selectedIso.slice(5, 7), +selectedIso.slice(8, 10));

  return (
    <div style={{ marginTop: 10 }}>
      <div className="home-stats">
        <svg className="streak-flame" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 2.2c1.1 3.1-2.6 4.7-2.6 8.3a2.6 2.6 0 0 0 5.2 0c0-1.1-.5-1.6-.5-2.7 1.6.9 2.7 2.7 2.7 4.8a4.8 4.8 0 0 1-9.6 0c0-4.3 3.2-6.4 4.8-10.4Z" fill="currentColor" />
        </svg>
        استریک کدنویسی: <b>{streak === null ? "…" : faNum(streak)}</b> روز
      </div>

      <div className="tm-extra">
        <div className="domain-sub">{formatJalali(selectedJalali)}{selectedIso === todayIso ? " (امروز)" : ""}</div>

        <div className="task" style={{ cursor: "pointer" }} onClick={() => save(!selectedDone)}>
          <div className={`check${selectedDone ? " on" : ""}`}>
            <svg className="c-check" viewBox="0 0 24 24" fill="none"><path d="M2.5 13l5.5 5.5L21.5 4.5" stroke="var(--bg)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div className={`task-name${selectedDone ? " done" : ""}`}>کدنویسی کردم</div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <input
            type="number" min={0} max={1440} className="wsearch-newform-name" style={{ flex: "1 1 120px" }}
            placeholder="دقیقه صرف‌شده (اختیاری)" value={minutesSpent} onChange={(e) => setMinutesSpent(e.target.value)}
          />
          <input
            className="wsearch-newform-name" style={{ flex: "1 1 160px" }}
            placeholder="موضوع (اختیاری)" value={topic} onChange={(e) => setTopic(e.target.value)}
          />
        </div>
        <input
          className="wsearch-newform-name" style={{ marginTop: 8 }}
          placeholder="یادداشت (اختیاری)" value={notes} onChange={(e) => setNotes(e.target.value)}
        />
        <button onClick={() => save(selectedDone)} disabled={saving} style={{ marginTop: 10, borderColor: "var(--accent)", color: "var(--accent)" }}>
          {saving ? "در حال ذخیره…" : "ذخیره جزئیات"}
        </button>
      </div>

      <div className="tm-extra">
        <div className="domain-sub">تقویم تمرین</div>
        <div className="cal-controls">
          <button className="small mono" onClick={() => { if (calMonth === 1) { setCalMonth(12); setCalYear((y) => y - 1); } else setCalMonth((m) => m - 1); }}>‹</button>
          <div className="cal-label">{J_MONTHS[calMonth - 1]} {faNum(calYear)}</div>
          <button className="small mono" onClick={() => { if (calMonth === 12) { setCalMonth(1); setCalYear((y) => y + 1); } else setCalMonth((m) => m + 1); }}>›</button>
        </div>
        <div className="cal-grid">
          {CAL_WEEK_ORDER.map((d) => <div key={d} className="cal-weekday">{FA_WEEKDAY_SHORT[d]}</div>)}
          {cells}
        </div>
        {loading && <div className="item-line" style={{ marginTop: 10 }}>در حال بارگذاری…</div>}
      </div>
    </div>
  );
}
