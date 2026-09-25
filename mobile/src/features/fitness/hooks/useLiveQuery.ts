import { useEffect, useRef, useState } from "react";
import { liveQuery } from "dexie";

// هوکِ نازکِ دورِ Dexie liveQuery — کوئری هر بار که هر جدولِ لمس‌شده تغییر
// کنه، دوباره اجرا می‌شه (Dexie خودش وابستگی‌ها رو ردیابی می‌کنه، نیازی به
// dependency array دستی نیست جز برای re-subscribe وقتی خودِ تابعِ querier
// عوض بشه، مثلا فیلتر جدید).
export function useLiveQuery<T>(querier: () => Promise<T>, deps: unknown[], initial: T): T {
  const [value, setValue] = useState<T>(initial);
  const querierRef = useRef(querier);
  querierRef.current = querier;

  useEffect(() => {
    const sub = liveQuery(() => querierRef.current()).subscribe({
      next: (v) => setValue(v),
      error: (err) => console.error("[useLiveQuery]", err),
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return value;
}
