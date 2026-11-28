"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMedications } from "./useMedications";
import { dosesOnDay, toggleDose, type DoseLog, type DoseSlot } from "./medicationDoses";
import { getDoseLog, setDoseLog } from "./medicationDoseStore";
import { useLiveRefresh } from "./liveSync";
import { isoLocal } from "./jalali";

/** نوبت‌های دارویی امروز و تیک‌شون برای کارت «برنامه‌های امروز» (جدا از تیک‌های روتین) */
export function useTodayDoses(enabled: boolean) {
  const { meds, saveMedication } = useMedications();
  const [log, setLog] = useState<DoseLog | null>(null);
  const [today, setToday] = useState(() => isoLocal(new Date()));

  useEffect(() => { if (enabled) getDoseLog().then(setLog).catch(() => setLog({})); }, [enabled]);
  useLiveRefresh(["medicationDoses"], () => { if (enabled) getDoseLog().then(setLog).catch(() => {}); });
  useEffect(() => {
    const t = setInterval(() => setToday((p) => { const n = isoLocal(new Date()); return n === p ? p : n; }), 30_000);
    return () => clearInterval(t);
  }, []);

  const slots: DoseSlot[] = useMemo(() => (enabled ? dosesOnDay(meds ?? [], today) : []), [enabled, meds, today]);
  const taken = log?.[today] ?? [];
  const toggle = useCallback((key: string) => {
    setLog((prev) => {
      const next = toggleDose(prev ?? {}, today, key);
      void setDoseLog(next);
      return next;
    });
  }, [today]);

  return { ready: meds !== null && log !== null, count: meds?.length ?? 0, slots, taken, toggle, saveMedication };
}
