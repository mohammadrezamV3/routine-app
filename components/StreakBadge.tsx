"use client";

import { useEffect, useRef, useState } from "react";
import { useMyStreak } from "@/lib/useMyStreak";
import { StreakFlame } from "./StreakFlame";
import { StreakCelebration, type StreakCelebrationProps } from "./StreakCelebration";

// یک جشن در روز، روی همین دستگاه — تیک‌برداشتن و دوباره تیک‌زدن دوباره جشن نمی‌گیره
const CELEBRATED_KEY = "arion:streakCelebrated";
function celebratedOn(iso: string): boolean {
  try { return localStorage.getItem(CELEBRATED_KEY) === iso; } catch { return false; }
}
function markCelebrated(iso: string) {
  try { localStorage.setItem(CELEBRATED_KEY, iso); } catch { /* ذخیره‌سازی بسته */ }
}

// شعله + عدد استریک خود کاربر — توی هدر استفاده می‌شه، پس همیشه compact.
// لحظه‌ای که امروز (با تیک همین تب) کامل می‌شه، جشن دوالینگویی از همین
// شعله بیرون می‌پره (StreakCelebration)؛ زدن شعله هم همون صفحه رو نشون می‌ده.
export function StreakBadge({ className }: { className?: string }) {
  const { streak, todayDone, todayIso, cause } = useMyStreak();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const prevDone = useRef<boolean | null>(null);
  const [cel, setCel] = useState<Omit<StreakCelebrationProps, "anchor" | "onClose"> | null>(null);
  const [landing, setLanding] = useState(false);

  useEffect(() => {
    if (streak === null) return;
    const was = prevDone.current;
    prevDone.current = todayDone;
    if (was === false && todayDone && cause === "local" && !celebratedOn(todayIso)) {
      markCelebrated(todayIso);
      setCel({ mode: "extend", from: Math.max(0, streak - 1), to: streak, todayDone: true });
    }
  }, [streak, todayDone, todayIso, cause]);

  function openView() {
    if (streak === null || cel) return;
    setCel({ mode: "view", from: streak, to: streak, todayDone });
  }

  function onClose() {
    setCel(null);
    setLanding(true);
    setTimeout(() => setLanding(false), 700);
  }

  const anchor = anchorRef.current?.querySelector<HTMLElement>(".streak-flame") ?? anchorRef.current;

  return (
    <>
      <span
        ref={anchorRef}
        className={`streak-badge-hit${cel ? " is-away" : ""}${landing ? " is-landing" : ""}`}
        role="button"
        tabIndex={0}
        aria-label="نمایش استریک"
        onClick={openView}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openView(); } }}
      >
        <StreakFlame streak={streak} className={className} compact />
      </span>
      {cel && <StreakCelebration {...cel} anchor={anchor ?? null} onClose={onClose} />}
    </>
  );
}
