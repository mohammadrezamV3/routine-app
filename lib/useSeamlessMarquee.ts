import { useEffect, useRef, useState } from "react";

// ترکِ اسکرولِ بی‌درزِ عمومی — دو مشکلِ رایجِ نوارهای درحال‌عبور رو حل می‌کنه:
// ۱) اگه آیتم‌ها کم باشن (مثلاً کاربر فقط چندتا نماد انتخاب کرده)، عرضِ کلِ
//    محتوا از عرضِ صفحه کمتر می‌مونه و وسطِ چرخه یه فاصله‌ی خالی دیده می‌شه —
//    این‌جا لیستِ پایه تا یک حداقلِ امن تکرار می‌شه که همیشه از دوبرابرِ
//    پهن‌ترین صفحه‌ی ممکن بیشتر باشه.
// ۲) سرعتِ حرکت (px/ثانیه) نباید به تعداد آیتم‌ها وابسته باشه — duration از
//    روی عرضِ واقعیِ رندرشده حساب می‌شه، نه یک عددِ ثابتِ فرضی.
export function useSeamlessMarquee<T>(
  items: T[],
  opts?: { minCount?: number; pxPerSecond?: number; fallbackDurationSec?: number }
) {
  const minCount = opts?.minCount ?? 20;
  const pxPerSecond = opts?.pxPerSecond ?? 26;
  const trackRef = useRef<HTMLDivElement>(null);
  const [durationSec, setDurationSec] = useState(opts?.fallbackDurationSec ?? 40);

  const base: T[] = [];
  if (items.length) {
    while (base.length < minCount) base.push(...items);
  }
  const track = [...base, ...base];

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    function measure() {
      const halfWidth = el!.scrollWidth / 2;
      if (halfWidth > 0) setDurationSec(Math.max(18, halfWidth / pxPerSecond));
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.length]);

  return { trackRef, track, durationSec };
}
