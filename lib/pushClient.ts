// ثبت سابسکریپشن Web Push سمت کلاینت — بعد از این‌که کاربر اجازه‌ی نوتیف
// (Notification.requestPermission) رو داد صدا زده می‌شه؛ سرویس‌ورکر رو
// رجیستر می‌کنه، از مرورگر یه PushSubscription می‌گیره، و به سرور می‌فرسته
// تا بتونه بعدا حتی وقتی تب/اپ بسته‌ست واقعا پوش بفرسته.

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function sameKey(a: ArrayBuffer | null | undefined, b: Uint8Array): boolean {
  if (!a) return false;
  const x = new Uint8Array(a);
  if (x.length !== b.length) return false;
  for (let i = 0; i < x.length; i++) if (x[i] !== b[i]) return false;
  return true;
}

/** «سرور این endpoint رو برای این کاربر داره» — تا NotificationEngine بدونه
 *  یادآوری‌ها از سرور میاد و نسخه‌ی تب‌باز تکراری نفرسته. */
const SYNCED_KEY = "arion:pushSynced";

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

function deviceTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

/**
 * idempotent: سابسکریپشن موجود رو دوباره به سرور می‌فرسته (نه یکی جدید)،
 * مگر اینکه با کلید VAPID دیگه‌ای ساخته شده باشه — اون‌وقت عوضش می‌کنه،
 * وگرنه سرور هیچ‌وقت نمی‌تونست بهش پوش بفرسته.
 *
 * موفقیت برای همون کاربری که سرور برگردوند علامت می‌خوره (hasServerPush).
 */
export async function subscribeToPush(): Promise<boolean> {
  if (!pushSupported()) return false;
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) return false;
  if (typeof Notification !== "undefined" && Notification.permission !== "granted") return false;

  try {
    await navigator.serviceWorker.register("/sw.js");
    // pushManager.subscribe روی رجیستریشنی که هنوز worker *فعال* نداره (اولین
    // نصب) خطای «no active Service Worker» می‌ده — قبلا همین‌جا بی‌صدا شکست
    // می‌خورد و دستگاه هیچ‌وقت سابسکرایب نمی‌شد.
    const registration = await navigator.serviceWorker.ready;
    const serverKey = urlBase64ToUint8Array(vapidPublicKey);
    let subscription = await registration.pushManager.getSubscription();
    if (subscription && !sameKey(subscription.options?.applicationServerKey, serverKey)) {
      await subscription.unsubscribe().catch(() => {});
      subscription = null;
    }
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: serverKey as BufferSource,
      });
    }

    const json = subscription.toJSON();
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys, timezone: deviceTimezone() }),
    });
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    if (typeof data?.userId === "string") {
      try { window.localStorage.setItem(SYNCED_KEY, `${data.userId}|${json.endpoint}`); } catch {}
    }
    return true;
  } catch {
    // مثلا کاربر بعدا دسترسی رو رد کرد، یا سرویس‌ورکر توی این مرورگر
    // پشتیبانی نمی‌شه — نوتیف تب‌باز (NotificationEngine) همچنان کار می‌کنه.
    return false;
  }
}

/**
 * آیا یادآوری‌های این کاربر روی همین دستگاه از سرور (Web Push) می‌رسه؟ اگه
 * آره، نسخه‌ی تب‌باز نباید همون یادآوری رو دوباره نشون بده.
 */
export async function hasServerPush(userId: string | undefined): Promise<boolean> {
  if (!userId || !pushSupported() || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return false;
    return window.localStorage.getItem(SYNCED_KEY) === `${userId}|${sub.endpoint}`;
  } catch {
    return false;
  }
}
