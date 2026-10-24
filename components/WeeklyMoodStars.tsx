// ستاره‌ی «حال این هفته»: یک ستاره‌ی SVG که تا مقدار انتخاب‌شده پر می‌شه (طلایی) و بقیه فقط خط‌دورن.
import type { CSSProperties } from "react";

export const STAR_GOLD = "#F4BE3A";
const STAR_PATH = "M12 2.6l2.85 5.78 6.38.93-4.62 4.5 1.09 6.35L12 17.15l-5.7 3 1.09-6.35-4.62-4.5 6.38-.93z";

export function WeeklyMoodStar({ filled, size = 30, style }: { filled: boolean; size?: number; style?: CSSProperties }) {
  return (
    <svg className={`wlr-star-svg${filled ? " is-fill" : ""}`} style={style} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={STAR_PATH} fill={filled ? STAR_GOLD : "none"} stroke={filled ? STAR_GOLD : "currentColor"} strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

/** نسخه‌ی فقط‌خواندنی (اسلاید داستان) */
export function WeeklyMoodStarsStatic({ value, size = 30 }: { value: number; size?: number }) {
  return (
    <span className="wlr-stars-static" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => <WeeklyMoodStar key={n} filled={n <= value} size={size} />)}
    </span>
  );
}
