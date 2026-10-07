// گرم‌کردن چانک‌های تنبل در زمان بیکاری مرورگر — کلیک اول بدون انتظار شبکه باز می‌شه
// ولی چانک روی مسیر لود اولیه نیست. هر loader فقط یک بار اجرا می‌شه.
const done = new WeakSet<() => Promise<unknown>>();

export function preloadWhenIdle(loader: () => Promise<unknown>, timeout = 4000) {
  if (typeof window === "undefined" || done.has(loader)) return;
  done.add(loader);
  const run = () => { loader().catch(() => {}); };
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(run, { timeout });
  else setTimeout(run, 2000);
}
