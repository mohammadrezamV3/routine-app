import { faNum } from "@/lib/jalali";
import { cn } from "@/lib/utils";
import { getStreakTier } from "@/lib/streakTier";

// نمایش شعله + عدد استریک برای یک عدد داده‌شده — presentational محض، بدون
// خودش fetch کردن. هم برای استریک خودمون (StreakBadge) هم برای استریک
// هر دوست (توی DashFriendsCard) استفاده می‌شه.
//
// `compact` یعنی این نمونه توی هدر (یا یه فضای باریک مشابه) نشسته: اندازه‌ی
// شعله همیشه ثابت می‌مونه (rule های CSS با `.header-streak-clock-streak`
// این رو تحمیل می‌کنن)، ولی رنگ/گلو/انیمیشنِ سطح همچنان کامل اعمال می‌شه —
// فقط رشدِ اندازه محدوده تا لی‌اوت هدر نشکنه.
export function StreakFlame({
  streak,
  className,
  compact = false,
}: {
  streak: number | null;
  className?: string;
  compact?: boolean;
}) {
  const { tier, name } = getStreakTier(streak);
  const label = streak === null ? "در حال بارگذاری استریک" : `${faNum(streak)} روز — ${name}`;

  return (
    <span
      className={cn("header-streak-clock-streak", compact && "streak-flame-compact", className)}
      title={label}
      aria-label={label}
    >
      <svg
        className={`streak-flame streak-flame-tier${tier}`}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path d="M12 2.2c1.1 3.1-2.6 4.7-2.6 8.3a2.6 2.6 0 0 0 5.2 0c0-1.1-.5-1.6-.5-2.7 1.6.9 2.7 2.7 2.7 4.8a4.8 4.8 0 0 1-9.6 0c0-4.3 3.2-6.4 4.8-10.4Z" fill="currentColor" />
        {tier >= 8 && (
          <>
            <circle className="streak-flame-particle streak-flame-particle-a" cx="6.5" cy="7" r="1" fill="currentColor" />
            <circle className="streak-flame-particle streak-flame-particle-b" cx="17.5" cy="9.5" r="1" fill="currentColor" />
            <circle className="streak-flame-particle streak-flame-particle-c" cx="12" cy="1.5" r=".8" fill="currentColor" />
          </>
        )}
      </svg>
      <span className="mono">{streak === null ? "…" : faNum(streak)}</span>
    </span>
  );
}
