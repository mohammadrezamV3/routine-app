import { faNum } from "@/lib/jalali";
import { cn } from "@/lib/utils";
import { getStreakTier } from "@/lib/streakTier";
import { tr } from "@/lib/i18n";

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
  const label = streak === null ? tr("در حال بارگذاری استریک", "Loading streak") : tr(`${faNum(streak)} روز — ${name}`, `${streak} ${streak === 1 ? "day" : "days"} - ${name}`);

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
        {/* شعله‌ی کارتونی (هم‌شکل شعله‌ی بزرگ، lib/streakFlameShape.ts): بدنه‌ی
            گرد با زبانه‌ی کناری، قطره‌ی زرد داخلی و برق براق — همه از رنگ سطح
            (currentColor) مشتق می‌شن (رنگ‌ها در globals.css) */}
        <path className="streak-flame-body" d="M12 22.8C10.1 22.8 7.65 21.79 6.31 20.44C4.97 19.1 4.28 16.39 3.96 14.75C3.65 13.11 4.18 12.04 4.45 10.62C4.71 9.19 5.27 6.33 5.57 6.21C5.87 6.1 7.65 9.6 8.79 8.94C9.92 8.28 12.48 1.8 13.13 1.8C13.77 1.8 16.8 6.78 17.95 8.94C19.1 11.1 20.08 12.84 20.04 14.75C19.99 16.67 19.03 19.1 17.69 20.44C16.35 21.79 13.9 22.8 12 22.8Z" fill="currentColor" />
        <path className="streak-flame-mid" d="M12 21.33C10.97 21.33 9.65 21.1 8.93 20.71C8.21 20.33 7.77 19.71 7.66 19.01C7.55 18.31 7.8 17.43 8.27 16.5C8.73 15.57 9.76 14.22 10.47 13.4C11.19 12.6 12.17 11.67 12.53 11.67C12.87 11.67 13.4 12.6 13.94 13.4C14.48 14.22 15.33 15.57 15.73 16.5C16.14 17.43 16.45 18.31 16.34 19.01C16.23 19.71 15.79 20.33 15.08 20.71C14.35 21.1 13.03 21.33 12 21.33Z" fill="#FFC24A" />
        <path className="streak-flame-core" d="M6.21 15.66C5.95 15.28 5.66 13.88 5.73 13.14C5.82 12.41 6.56 11.25 6.7 11.25C6.85 11.25 7.07 12.44 7.18 13.14C7.29 13.84 7.44 15.19 7.34 15.45C7.24 15.71 6.48 16.05 6.21 15.66Z" fill="#FFF4D2" />
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
