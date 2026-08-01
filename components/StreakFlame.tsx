import { faNum } from "@/lib/jalali";
import { cn } from "@/lib/utils";

// نمایشِ شعله + عددِ استریک برای یک عددِ داده‌شده — presentational محض، بدون
// خودش fetch کردن. هم برای استریکِ خودمون (StreakBadge) هم برای استریکِ
// هر دوست (توی DashFriendsCard) استفاده می‌شه.
export function StreakFlame({ streak, className }: { streak: number | null; className?: string }) {
  const tier = streak === null ? 0 : streak >= 100 ? 4 : streak >= 30 ? 3 : streak >= 7 ? 2 : streak >= 1 ? 1 : 0;

  return (
    <span className={cn("header-streak-clock-streak", className)}>
      <svg className={`streak-flame streak-flame-tier${tier}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2.2c1.1 3.1-2.6 4.7-2.6 8.3a2.6 2.6 0 0 0 5.2 0c0-1.1-.5-1.6-.5-2.7 1.6.9 2.7 2.7 2.7 4.8a4.8 4.8 0 0 1-9.6 0c0-4.3 3.2-6.4 4.8-10.4Z" fill="currentColor" />
      </svg>
      <span className="mono">{streak === null ? "…" : faNum(streak)}</span>
    </span>
  );
}
