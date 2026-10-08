"use client";

// ستون «اکولایزری» مشترک آنالیز هفتگی و هفته‌نامه — جایگزین لوله‌های مایع قبلی.
// هر ستون از چند خانه‌ی کوچیک روی هم ساخته می‌شه؛ هرچی امتیاز بیشتر، خانه‌های
// بیشتری از پایین روشن می‌شن. فقط یک رنگ (--ring-1a/1b) و شدتش از پایین به
// بالا بیشتر می‌شه. سطح هفته‌ی قبل یک خط نازک روی همون ستونه.
//
// انیمیشن فقط opacity/transform و با on: تا on=false خانه‌ها خاموشن و با true
// از پایین یکی‌یکی روشن می‌شن (تأخیر با --i در CSS). حرکت‌کاهی و
// html[data-perf="low"] تأخیر رو برمی‌دارن (components/weekly-meter.css).
import "./weekly-meter.css";

export type MeterSize = "lg" | "md" | "sm" | "xs";

const SEGMENTS: Record<MeterSize, number> = { lg: 12, md: 10, sm: 6, xs: 5 };

/** چند خانه برای این امتیاز روشن می‌شه — امتیاز بالای صفر حداقل یک خانه */
export function litCount(value: number | null, segments: number): number {
  if (value === null || !Number.isFinite(value) || value <= 0) return 0;
  return Math.max(1, Math.min(segments, Math.round((value / 100) * segments)));
}

export function MeterColumn({
  value, prev = null, size = "md", on = true, delay = 0, future = false, highlight = false, className,
}: {
  value: number | null;
  /** امتیاز همون روز/بخش در هفته‌ی قبل — خط نازک افقی */
  prev?: number | null;
  size?: MeterSize;
  /** false = هنوز روشن نشده (برای شروع انیمیشن وقتی وارد دید شد) */
  on?: boolean;
  /** تأخیر شروع این ستون به میلی‌ثانیه (برای ورود پله‌ای ستون‌ها) */
  delay?: number;
  /** روز آینده: خانه‌ها خط‌چین */
  future?: boolean;
  /** بهترین روز: خانه‌ی بالایی می‌درخشه */
  highlight?: boolean;
  className?: string;
}) {
  const n = SEGMENTS[size];
  const lit = litCount(value, n);
  const cls = ["wm-col", `wm-${size}`, on ? "is-on" : "", future ? "is-future" : "", value === null && !future ? "is-empty" : "", highlight ? "is-hi" : "", className || ""]
    .filter(Boolean).join(" ");
  return (
    <span className={cls} style={{ ["--wm-delay" as string]: `${delay}ms` }} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => {
        const isLit = i < lit;
        // شدت رنگ: خانه‌ی پایین کم‌رنگ‌تر، بالاترین خانه‌ی روشن پررنگ‌ترین
        const k = isLit ? 0.45 + 0.55 * ((i + 1) / Math.max(lit, 1)) : 0;
        return (
          <i
            key={i}
            className={`wm-seg${isLit ? " is-lit" : ""}${isLit && i === lit - 1 ? " is-top" : ""}`}
            style={{ ["--i" as string]: i, ["--k" as string]: k.toFixed(2) }}
          />
        );
      })}
      {prev !== null && Number.isFinite(prev) && !future && (
        <b className="wm-prev" style={{ ["--p" as string]: Math.max(0, Math.min(100, prev)) }} />
      )}
    </span>
  );
}
