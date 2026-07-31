"use client";

import { useMemo, useState } from "react";
import { WEEK_ORDER, tasksForDate, toEnDigits } from "@/lib/schedule";
import { PROGRAM_META, formatDaysLeft } from "@/lib/programMeta";
import { faNum } from "@/lib/jalali";
import { CustomOccurrence, Importance } from "@/lib/storage";
import { LiquidBlobLayers } from "./LiquidBlobBox";

const now = new Date();

type Occ = { dayName: string; jsDay: number; time: string; id: string; custom?: boolean; importance?: Importance };
type ScheduleOpts = { removedOccurrences: Set<string>; customOccurrences: CustomOccurrence[] };

function buildWeeklyGroups(opts: ScheduleOpts) {
  const map: Record<string, { name: string; occ: Occ[] }> = {};
  const list: { name: string; occ: Occ[] }[] = [];
  WEEK_ORDER.forEach((o) => {
    const d = new Date(now);
    d.setDate(now.getDate() + (o.jsDay - now.getDay()));
    const items = tasksForDate(d, opts);
    items.forEach((t) => {
      if (!map[t.name]) { map[t.name] = { name: t.name, occ: [] }; list.push(map[t.name]); }
      const importance = opts.customOccurrences.find((c) => c.id === t.id)?.importance;
      map[t.name].occ.push({ dayName: o.name, jsDay: o.jsDay, time: t.time, id: t.id, custom: !!t.custom, importance });
    });
  });
  return list;
}

function countRemainingSessionsForId(id: string, endDate: Date, opts: ScheduleOpts) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const end = new Date(endDate); end.setHours(0, 0, 0, 0);
  if (end < today) return 0;
  let count = 0;
  const cursor = new Date(today);
  while (cursor <= end) {
    tasksForDate(cursor, opts).forEach((t) => { if (t.id === id) count++; });
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

export function ProgramCard({
  name,
  onClose,
  scheduleOpts,
}: {
  name: string;
  onClose: () => void;
  scheduleOpts: ScheduleOpts;
}) {
  const [flipped, setFlipped] = useState(false);
  const group = useMemo(() => buildWeeklyGroups(scheduleOpts).find((g) => g.name === name), [scheduleOpts, name]);

  if (!group || !group.occ.length) return null;

  let lessonName = name;
  let endDate: Date | null = null;
  group.occ.forEach((o) => {
    if (endDate) return;
    if (o.custom) {
      const c = scheduleOpts.customOccurrences.find((cc) => cc.id === o.id) as any;
      if (c && c.endDate) endDate = new Date(c.endDate);
    } else if (PROGRAM_META[o.id]?.end) {
      endDate = PROGRAM_META[o.id].end;
    }
  });
  const metaHit = group.occ.find((o) => !o.custom && PROGRAM_META[o.id]);
  if (metaHit) lessonName = PROGRAM_META[metaHit.id].lesson;

  let combinedStat: string;
  if (endDate) {
    const today0 = new Date(); today0.setHours(0, 0, 0, 0);
    const end0 = new Date(endDate); end0.setHours(0, 0, 0, 0);
    const daysLeft = Math.round((end0.getTime() - today0.getTime()) / 86400000);
    const uniqueIds = Array.from(new Set(group.occ.map((o) => o.id)));
    let sessions = 0;
    uniqueIds.forEach((id) => { sessions += countRemainingSessionsForId(id, endDate as Date, scheduleOpts); });
    combinedStat = formatDaysLeft(daysLeft, faNum) + " | " + faNum(sessions) + " جلسه";
  } else {
    combinedStat = "پایان‌باز | نامحدود";
  }

  return (
    <>
      <div className="pcard-overlay open" onClick={onClose} />
      <div className="pcard-stage open">
        <div className={`pcard-inner${flipped ? " flipped" : ""}`}>
          <div className="pcard-face pcard-face-front" onClick={() => setFlipped(true)}>
            <button className="pcard-close" onClick={(e) => { e.stopPropagation(); onClose(); }}>×</button>
            <div className="pcard-combined-stat">{combinedStat}</div>
            <div className="pcard-times-list">
              {group.occ.map((o, oi) => (
                <div key={oi} className="pcard-time-row">
                  <span className="pcard-time-text">{o.dayName}</span>
                  <span className="pcard-time-text mono" dir="ltr">{toEnDigits(o.time)}</span>
                </div>
              ))}
            </div>
            <div className="pcard-front-hint">برای دیدن نام درس ضربه بزن</div>
          </div>
          <div className="pcard-face pcard-face-back" onClick={() => setFlipped(false)}>
            <LiquidBlobLayers />
            <div className="pcard-back-content">
              <div className="pcard-back-eyebrow">درس</div>
              <div className="pcard-back-lesson">{lessonName}</div>
              <div className="pcard-back-hint">برای برگشت ضربه بزن</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
