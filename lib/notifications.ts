// نوتیفِ تب‌باز از طریق Notification API مرورگر — فقط پشتیبان. یادآوری‌های
// اصلی (حتی وقتی مرورگر بسته‌ست) از سرور با Web Push می‌رسن
// (lib/pushScheduler.ts + public/sw.js)؛ این برای مهمان/دستگاهِ بدونِ پوش است.

import { subscribeToPush } from "./pushClient";

const NOTIFIED_PREFIX = "panelMohammad:notified:";

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return "denied";
  const p = await Notification.requestPermission();
  // اجازه‌ی نوتیف به‌تنهایی فقط نسخه‌ی تب‌باز رو فعال می‌کنه؛ برای اینکه
  // وقتی مرورگر بسته‌ست هم یادآوری برسه، دستگاه باید برای Web Push ثبت بشه.
  // قبلا فقط NavDrawer این رو صدا می‌زد و اجازه‌ای که از تنظیمات یا کارت‌های
  // یادآوری/دارو داده می‌شد هیچ‌وقت به پوشِ سرور نمی‌رسید. (برای مهمان
  // سرور ۴۰۱ می‌ده و بی‌اثره.)
  if (p === "granted") void subscribeToPush();
  return p;
}

/** رد «این یادآوری نشون داده شد» — کلید خودش تاریخ داره، مقدار deadline (ms) است
 *  تا ردهای کهنه جارو بشن. قبلا مقدار «امروز» بود و یادآوری‌ای که دیروقتِ
 *  دیشب برای برنامه‌ی بامداد رفته بود، بعد از نیمه‌شب دوباره می‌رفت. */
function alreadyFired(key: string): boolean {
  try {
    return window.localStorage.getItem(NOTIFIED_PREFIX + key) !== null;
  } catch {
    return false;
  }
}

function markFired(key: string, until: number) {
  try {
    window.localStorage.setItem(NOTIFIED_PREFIX + key, String(until));
  } catch {}
}

function unmarkFired(key: string) {
  try {
    window.localStorage.removeItem(NOTIFIED_PREFIX + key);
  } catch {}
}

let pruned = false;
function pruneFired() {
  if (pruned) return;
  pruned = true;
  try {
    const cutoff = Date.now() - 2 * 86_400_000;
    const ls = window.localStorage;
    for (let i = ls.length - 1; i >= 0; i--) {
      const k = ls.key(i);
      if (!k || !k.startsWith(NOTIFIED_PREFIX)) continue;
      const v = Number(ls.getItem(k));
      // مقدارهای فرمتِ قدیمی (رشته‌ی تاریخ) هم NaN می‌شن و پاک می‌شن
      if (!Number.isFinite(v) || v < cutoff) ls.removeItem(k);
    }
  } catch {}
}

/**
 * نمایشِ نوتیف. اول از سرویس‌ورکر (registration.showNotification) — روی
 * کرومِ اندروید `new Notification()` اصلا مجاز نیست و TypeError می‌ده، یعنی
 * قبلا نسخه‌ی تب‌باز روی موبایل هیچ‌وقت چیزی نشون نمی‌داد.
 */
async function showNotification(title: string, options: NotificationOptions): Promise<boolean> {
  try {
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) {
      await reg.showNotification(title, { icon: "/images/logo-icon.png", badge: "/images/logo-icon.png", ...options });
      return true;
    }
  } catch {}
  try {
    new Notification(title, options);
    return true;
  } catch {
    return false;
  }
}

/**
 * یک‌بار به‌ازای هر key (کلید خودش تاریخ/نوبت رو داره). `deadline` لحظه‌ی
 * شروعِ برنامه است: بعد از اون هیچ‌وقت نشون داده نمی‌شه. tag همون key است،
 * پس اگه همون یادآوری از پوشِ سرور هم رسیده باشه، جایگزینش می‌شه نه تکرار.
 */
export function fireReminder(key: string, title: string, body: string, opts?: { deadline?: number; url?: string }) {
  if (getNotificationPermission() !== "granted") return;
  pruneFired();
  const deadline = opts?.deadline ?? Date.now() + 86_400_000;
  if (Date.now() >= deadline) return;
  if (alreadyFired(key)) return;
  markFired(key, deadline);
  void showNotification(title, { body, silent: false, tag: key, data: { url: opts?.url || "/" } }).then((ok) => {
    if (!ok) unmarkFired(key);
  });
}

/** برای تموم تایمر یک حرکت (ست یا حرکت زمان‌محور تکی) — برخلاف fireReminder
 * روزی یک‌بار محدود نیست، چون توی یک جلسه ممکنه چندبار تایمر تموم بشه؛ فقط
 * اگه اجازه از قبل داده شده باشه فایر می‌شه (خودش پرامپت نمی‌کنه). */
export function fireTimerDone(title: string, body: string) {
  if (getNotificationPermission() !== "granted") return;
  void showNotification(title, { body, silent: false });
}
