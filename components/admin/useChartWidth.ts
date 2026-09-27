"use client";

import { useEffect, useState } from "react";

// عرضِ واقعیِ ظرفِ نمودار — viewBox دقیقاً هم‌عرضِ پیکسلیِ کانتینر ساخته می‌شه.
// قبلاً viewBox ثابت ۶۴۰ با preserveAspectRatio="none" کش می‌اومد و متنِ
// محورها روی دسکتاپ پهن و روی موبایل له می‌شد.
// callback-ref (نه useRef) چون نمودار تا رسیدنِ داده EmptyState برمی‌گردونه و
// ظرف بعداً mount می‌شه — افکتِ [] با useRef اون موقع دیگه اجرا نمی‌شد.
export function useChartWidth(fallback = 640) {
  const [el, ref] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    if (!el) return;
    const measure = () => {
      const w = Math.round(el.getBoundingClientRect().width);
      if (w > 0) setWidth(w);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return { ref, width };
}

// برچسبِ محورِ افقی: روز/هفته → MM-DD، ماه (YYYY-MM) → کامل
export function bucketLabel(bucket: string): string {
  return bucket.length > 7 ? bucket.slice(5) : bucket;
}
