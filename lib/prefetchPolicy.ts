// سیاست پیش‌واکشی مسیرها: فقط بعد از اولین رندر (زمان بیکاری) و نه روی اتصال کند / حالت صرفه‌جویی داده.
type Conn = { saveData?: boolean; effectiveType?: string };

export function canPrefetch(): boolean {
  if (typeof navigator === "undefined") return false;
  const c = (navigator as Navigator & { connection?: Conn }).connection;
  if (!c) return true;
  if (c.saveData) return false;
  return c.effectiveType !== "slow-2g" && c.effectiveType !== "2g" && c.effectiveType !== "3g";
}

export function prefetchWhenIdle(prefetch: (href: string) => void, href: string, timeout = 5000): () => void {
  if (typeof window === "undefined" || !canPrefetch()) return () => {};
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
  const run = () => { try { prefetch(href); } catch { /* بهینه‌سازیه، نه ضروری */ } };
  if (w.requestIdleCallback) {
    const id = w.requestIdleCallback(run, { timeout });
    return () => w.cancelIdleCallback?.(id);
  }
  const t = setTimeout(run, 2000);
  return () => clearTimeout(t);
}
