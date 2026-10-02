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
// خودش هیچ کلیکی نداره: لینک دورش (HeaderStreakClock) مستقیم به /streak
// می‌ره، بدون هیچ پاپ‌آپی. جشن دوالینگویی (StreakCelebration) *فقط* لحظه‌ای
// از همین شعله بیرون می‌پره که امروز با تیک همین تب کامل بشه.
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
      setCel({ from: Math.max(0, streak - 1), to: streak });
    }
  }, [streak, todayDone, todayIso, cause]);

  function onClose() {
    setCel(null);
    setLanding(true);
    setTimeout(() => setLanding(false), 700);
  }

  const anchor = anchorRef.current?.querySelector<HTMLElement>(".streak-flame") ?? anchorRef.current;

  return (
    <>
      <span ref={anchorRef} className={`streak-badge-hit${cel ? " is-away" : ""}${landing ? " is-landing" : ""}`}>
        <StreakFlame streak={streak} className={className} compact />
      </span>
      {cel && <StreakCelebration {...cel} anchor={anchor ?? null} onClose={onClose} />}
    </>
  );
}
