// دروازه‌ی گرم‌کردن آفلاین: خود صفحه و داده‌اش همیشه اول. هیچ کار پس‌زمینه‌ی آفلاین قبل از اینکه
// صفحه کامل لود شده، بیکار و ساکت باشه شروع نمی‌شه و با هر ناوبری/تعامل کاربر مکث می‌کنه.

import { canPrefetch } from "../prefetchPolicy";

/** بعد از رویداد load این‌قدر صبر می‌کنیم تا گرم‌کردن شروع بشه */
export const WARM_START_DELAY_MS = 8000;
/** بعد از آخرین تعامل/ناوبری این‌قدر سکوت لازمه */
export const QUIET_MS = 3000;
const POLL_MS = 600;

let lastActivity = Date.now();
let installed = false;

function install() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const mark = () => { lastActivity = Date.now(); };
  for (const ev of ["pointerdown", "keydown", "touchstart", "wheel", "scroll", "click", "popstate", "hashchange", "beforeunload"]) {
    window.addEventListener(ev, mark, { capture: true, passive: true });
  }
  document.addEventListener("visibilitychange", mark);
}

/** ناوبری نرم در جریانه؟ (RouteProgress همین نشانه رو روی html می‌ذاره) */
export function isNavigating(): boolean {
  try { return document.documentElement.hasAttribute("data-route-loading"); } catch { return false; }
}

function pageLoaded(): Promise<void> {
  if (document.readyState === "complete") return Promise.resolve();
  return new Promise((r) => window.addEventListener("load", () => r(), { once: true }));
}

function sleep(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }

/** آماده برای کار پس‌زمینه؟ (تب دیده می‌شه، ناوبری نیست، اتصال سریعه، چند ثانیه تعامل نبوده) */
export function isQuietNow(): boolean {
  if (typeof document === "undefined") return false;
  if (document.visibilityState === "hidden") return false;
  if (isNavigating() || !canPrefetch()) return false;
  return Date.now() - lastActivity >= QUIET_MS;
}

/**
 * تا لود کامل + تاخیر اولیه + سکوت صبر می‌کنه؛ بعدش به requestIdleCallback می‌ره.
 * resolve(false) = شرایط (اتصال کند/صرفه‌جویی داده) هیچ‌وقت مناسب نبود و باید کار رها بشه.
 */
export async function whenQuiet(firstDelay = false): Promise<boolean> {
  if (typeof window === "undefined") return false;
  install();
  if (!canPrefetch()) return false;
  await pageLoaded();
  if (firstDelay) await sleep(WARM_START_DELAY_MS);
  for (let i = 0; i < 400; i++) {
    if (!canPrefetch()) return false;
    if (isQuietNow()) {
      await new Promise<void>((r) => {
        const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
        if (w.requestIdleCallback) w.requestIdleCallback(() => r(), { timeout: 3000 });
        else setTimeout(r, 300);
      });
      if (isQuietNow()) return true;
    }
    await sleep(POLL_MS);
  }
  return false;
}
