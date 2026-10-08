"use client";

// بعد از اولین پینت و در زمان بیکاری مرورگر، افکت‌های غیربحرانی رو mount می‌کنه
// تا از باندل اولیه‌ی همه‌ی صفحه‌ها بیرون باشن (بدون تغییر در رفتار دیده‌شده).
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const Inner = dynamic(() => import("./DeferredEffectsInner"), { ssr: false });

export function DeferredEffects() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (h: number) => void };
    if (w.requestIdleCallback) {
      const h = w.requestIdleCallback(() => setReady(true), { timeout: 2500 });
      return () => w.cancelIdleCallback?.(h);
    }
    const t = setTimeout(() => setReady(true), 1200);
    return () => clearTimeout(t);
  }, []);
  return ready ? <Inner /> : null;
}
