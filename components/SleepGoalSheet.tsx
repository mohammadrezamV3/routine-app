"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SleepGoalCard } from "./SleepGoalCard";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import type { SleepGoal } from "@/lib/sleepGoal";

// پنجره‌ی ویرایش هدف خواب — از زدن روی ساعت‌های هدف زیر صفحه‌ی ساعت (SleepDial)
// باز می‌شه، تا خود صفحه‌ی خواب کارت جدای تنظیمات نداشته باشه.
export function SleepGoalSheet({
  open,
  goal,
  custom,
  goalMin,
  onClose,
  onSaved,
}: {
  open: boolean;
  goal: SleepGoal;
  custom: boolean;
  goalMin: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !open) return null;
  return createPortal(<Body goal={goal} custom={custom} goalMin={goalMin} onClose={onClose} onSaved={onSaved} />, document.body);
}

function Body({ goal, custom, goalMin, onClose, onSaved }: { goal: SleepGoal; custom: boolean; goalMin: number; onClose: () => void; onSaved: () => void }) {
  useLockBodyScroll();
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <>
      <div className="modal-overlay open" onClick={onClose} />
      <div className="modal-panel liquid-glass-panel open sleep-scope slp-goal-panel" role="dialog" aria-modal="true" aria-label="هدف خواب" dir="rtl">
        <div className="modal-head">
          <div className="modal-title">هدف خواب</div>
          <button type="button" className="nav-close" onClick={onClose} aria-label="بستن">×</button>
        </div>
        <SleepGoalCard bare goal={goal} custom={custom} goalMin={goalMin} onSaved={() => { onSaved(); onClose(); }} />
      </div>
    </>
  );
}
