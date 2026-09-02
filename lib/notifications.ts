// یادآوری‌های نرم از طریق Notification API مرورگر.
// محدودیت مهم: این فقط وقتی کار می‌کنه که تب باز باشه (حتی در پس‌زمینه) —
// برای نوتیف واقعی حتی وقتی اپ کاملاً بسته‌ست، به service worker + push
// subscription + یک زمان‌بند سمت سرور نیاز داریم که فعلاً این پروژه نداره.

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
  return Notification.requestPermission();
}

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function alreadyFiredToday(key: string): boolean {
  try {
    return window.localStorage.getItem(NOTIFIED_PREFIX + key) === todayStamp();
  } catch {
    return false;
  }
}

function markFiredToday(key: string) {
  try {
    window.localStorage.setItem(NOTIFIED_PREFIX + key, todayStamp());
  } catch {}
}

/** یک‌بار در روز برای هر key؛ لحن آروم و مستقیم، نه صمیمی/رفیق‌وار.
 * برای یادآوری‌هایی که یک روز چند نوبت دارن (مثلِ دارو)، خودِ نوبت باید توی
 * کلید بیاد — مثلاً `med:<id>:480` — تا هر نوبت جدا شمرده بشه. */
export function fireReminder(key: string, title: string, body: string) {
  if (getNotificationPermission() !== "granted") return;
  if (alreadyFiredToday(key)) return;
  try {
    new Notification(title, { body, silent: false });
    markFiredToday(key);
  } catch {}
}

/** برای تمومِ تایمرِ یک حرکت (ست یا حرکتِ زمان‌محورِ تکی) — برخلافِ fireReminder
 * روزی یک‌بار محدود نیست، چون توی یک جلسه ممکنه چندبار تایمر تموم بشه؛ فقط
 * اگه اجازه از قبل داده شده باشه فایر می‌شه (خودش پرامپت نمی‌کنه). */
export function fireTimerDone(title: string, body: string) {
  if (getNotificationPermission() !== "granted") return;
  try {
    new Notification(title, { body, silent: false });
  } catch {}
}
