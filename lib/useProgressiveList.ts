"use client";

import { useCallback, useEffect, useRef, useState, type UIEvent } from "react";

/**
 * رندر تدریجی یک لیست بلند (مثل کاتالوگ 700+ حرکتی): اول فقط `step` ردیف،
 * و هر بار که اسکرول به نزدیک ته لیست رسید `step` ردیف دیگه. با عوض‌شدن
 * `resetKey` (مثلا جستجو یا فیلتر) دوباره از اول شروع می‌کنه تا تایپ‌کردن
 * توی جستجو هیچ‌وقت صدها ردیف رو یک‌جا رندر نکنه.
 */
export function useProgressiveList(total: number, resetKey: string, step = 60) {
  const [limit, setLimit] = useState(step);
  const listRef = useRef<HTMLDivElement>(null);

  // نتیجه‌ی جستجو/فیلتر تازه از بالای لیست شروع می‌شه، نه از جای اسکرول قبلی.
  useEffect(() => {
    setLimit(step);
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [resetKey, step]);

  const onScroll = useCallback(
    (e: UIEvent<HTMLElement>) => {
      const el = e.currentTarget;
      if (limit < total && el.scrollTop + el.clientHeight >= el.scrollHeight - 400) {
        setLimit((l) => Math.min(total, l + step));
      }
    },
    [limit, total, step],
  );

  return { limit: Math.min(limit, total), onScroll, listRef };
}
