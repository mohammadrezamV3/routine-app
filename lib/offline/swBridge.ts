// پل کلاینت به سرویس‌ورکر (public/sw.js) برای حالت آفلاین. قرارداد پیام‌ها در
// lib/offline/types.ts (SwMessage). هیچ‌کدوم از این توابع روی سرور یا مرورگر بدون
// سرویس‌ورکر خطا نمی‌دن؛ فقط بی‌اثرن.
//
// قواعد استفاده (برای هسته‌ی آفلاین):
//  • setSwUser(id) هر بار که هویت واردشده مشخص شد (هر لود)، و setSwUser(null) *فقط*
//    وقتی سرور تایید کرده که نشست نیست (نه موقع خطای شبکه!). null یعنی «خروج/مهمان» و
//    کل کش صفحه‌های خصوصی پاک می‌شه.
//  • wipeSwCaches() قبل از signOut و موقع عوض‌شدن هویت. کش‌ها رو هم مستقیم از خود صفحه
//    پاک می‌کنه (حتی اگه سرویس‌ورکر خاموش یا در دسترس نباشه).
//  • warmShell(urls) وقتی آنلاینیم و کاربر مشخصه؛ خود SW صف و محدودیت داره.
import type { SwMessage } from "./types";

const READY_TIMEOUT_MS = 4000;
const ACK_TIMEOUT_MS = 2500;

// باید با public/sw.js یکی بمونه
const USER_CACHE_PREFIX = "arion-user-";
const META_CACHE = "arion-meta";

function supported(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const t = setTimeout(() => resolve(fallback), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      () => { clearTimeout(t); resolve(fallback); },
    );
  });
}

/** سرویس‌ورکر فعال؛ اگه ثبت نشده باشه ready هیچ‌وقت حل نمی‌شه، پس سقف زمانی داره */
async function activeWorker(): Promise<ServiceWorker | null> {
  if (!supported()) return null;
  const ctl = navigator.serviceWorker.controller;
  if (ctl) return ctl;
  const reg = await withTimeout(navigator.serviceWorker.ready, READY_TIMEOUT_MS, null);
  return reg && reg.active ? reg.active : null;
}

/** پیام می‌فرسته و تا تاییدیه‌ی SW (یا سقف زمانی) صبر می‌کنه؛ true = SW تایید کرد */
async function send(msg: SwMessage): Promise<boolean> {
  const sw = await activeWorker();
  if (!sw) return false;
  return withTimeout(
    new Promise<boolean>((resolve) => {
      try {
        const ch = new MessageChannel();
        ch.port1.onmessage = () => resolve(true);
        sw.postMessage(msg, [ch.port2]);
      } catch {
        resolve(false);
      }
    }),
    ACK_TIMEOUT_MS,
    false,
  );
}

/** کاربر فعلی رو به SW می‌گه (null = مهمان/خروج تاییدشده) */
export function setSwUser(userId: string | null): Promise<boolean> {
  return send({ type: "arion-user", userId });
}

/** پاک‌کردن همه‌ی کش‌های خصوصی کاربر، هم از SW و هم مستقیم از صفحه */
export async function wipeSwCaches(): Promise<void> {
  if (typeof caches !== "undefined") {
    try {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith(USER_CACHE_PREFIX) || k === META_CACHE).map((k) => caches.delete(k)),
      );
    } catch { /* ادامه با پیام به SW */ }
  }
  await send({ type: "arion-wipe" });
}

/** صفحه‌های اصلی رو برای باز شدن آفلاین پیش‌کش می‌کنه (فقط آنلاین، یک بار برای هر آدرس در هر نشست SW) */
export function warmShell(urls: string[]): Promise<boolean> {
  const list = urls.filter((u) => typeof u === "string" && u.startsWith("/") && !u.startsWith("//"));
  if (!list.length) return Promise.resolve(false);
  return send({ type: "arion-warm-shell", urls: list });
}
