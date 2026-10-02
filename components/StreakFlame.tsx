import { faNum } from "@/lib/jalali";
import { cn } from "@/lib/utils";
import { getStreakTier } from "@/lib/streakTier";

// نمایش شعله + عدد استریک برای یک عدد داده‌شده — presentational محض، بدون
// خودش fetch کردن. هم برای استریک خودمون (StreakBadge) هم برای استریک
// هر دوست (توی DashFriendsCard) استفاده می‌شه.
//
// `compact` یعنی این نمونه توی هدر (یا یه فضای باریک مشابه) نشسته: اندازه‌ی
// شعله همیشه ثابت می‌مونه (rule های CSS با `.header-streak-clock-streak`
// این رو تحمیل می‌کنن)، ولی رنگ/گلو/انیمیشن سطح همچنان کامل اعمال می‌شه —
// فقط رشد اندازه محدوده تا لی‌اوت هدر نشکنه.
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
        {/* سه لایه‌ی تو‌در‌تو، همه از رنگ سطح (currentColor) مشتق می‌شن:
            بدنه‌ی دو‌زبانه، میانه‌ی روشن‌تر و هسته‌ی داغ (رنگ‌ها در globals.css) */}
        <path className="streak-flame-body" d="M12.7 1.6c.4 2.9 2.4 4.6 4.1 6.6 1.5 1.8 2.6 3.8 2.6 6.2 0 4.4-3.3 7.9-7.5 7.9S4.4 18.9 4.4 14.7c0-2.6 1.1-4.7 2.7-6.3.1 1.6.8 2.8 2 3.6-.4-4.1 1.2-7.6 3.6-10.4Z" fill="currentColor" />
        <path className="streak-flame-mid" d="M12.4 8.4c.4 1.9 1.6 3.1 2.7 4.5.9 1.1 1.4 2.3 1.4 3.6 0 2.6-2 4.6-4.6 4.6S7.4 19.1 7.4 16.6c0-1.6.7-2.8 1.6-3.7.2 1 .7 1.7 1.4 2.1-.2-2.5.6-4.6 2-6.6Z" fill="#FFC24A" />
        <path className="streak-flame-core" d="M12.1 13.4c.3 1.1 1 1.8 1.6 2.6.4.5.7 1.1.7 1.8 0 1.4-1.1 2.5-2.4 2.5s-2.4-1.1-2.4-2.4c0-1.6 1-2.9 2.5-4.5Z" fill="#FFF4D2" />
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
