// پشته‌ی «بستنِ بالاترین لایه» برای دکمه‌ی برگشتِ اندروید. لایه‌هایی که
// خودِ شل باز می‌کنه (منوی تب‌بار) صریح ثبت می‌شن؛ مودال‌های کدِ وب با
// heuristic ِ hardwareBack.ts بسته می‌شن.
import { useEffect, useRef } from "react";

const stack: { close: () => void }[] = [];

export function popBackHandler(): boolean {
  const top = stack[stack.length - 1];
  if (!top) return false;
  top.close();
  return true;
}

/** تا وقتی `active`ـه، برگشت اول `close` رو صدا می‌زنه */
export function useBackHandler(active: boolean, close: () => void): void {
  const ref = useRef(close);
  ref.current = close;
  useEffect(() => {
    if (!active) return;
    const entry = { close: () => ref.current() };
    stack.push(entry);
    return () => {
      const i = stack.indexOf(entry);
      if (i >= 0) stack.splice(i, 1);
    };
  }, [active]);
}
