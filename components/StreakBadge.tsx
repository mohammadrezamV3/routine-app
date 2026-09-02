"use client";

import { useMyStreak } from "@/lib/useMyStreak";
import { StreakFlame } from "./StreakFlame";

// شعله + عدد استریک خود کاربر — توی هدر استفاده می‌شه.
export function StreakBadge({ className }: { className?: string }) {
  const streak = useMyStreak();
  return <StreakFlame streak={streak} className={className} />;
}
