// ثبتِ سابسکریپشنِ Web Push سمتِ کلاینت — بعد از این‌که کاربر اجازه‌ی نوتیف
// (Notification.requestPermission) رو داد صدا زده می‌شه؛ سرویس‌ورکر رو
// رجیستر می‌کنه، از مرورگر یه PushSubscription می‌گیره، و به سرور می‌فرسته
// تا بتونه بعداً حتی وقتی تب/اپ بسته‌ست واقعاً پوش بفرسته.

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

export async function subscribeToPush(): Promise<boolean> {
  if (!pushSupported()) return false;
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) return false;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ||
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      }));

    const json = subscription.toJSON();
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
    });
    return true;
  } catch {
    // مثلاً کاربر بعداً دسترسی رو رد کرد، یا سرویس‌ورکر توی این مرورگر
    // پشتیبانی نمی‌شه — نوتیفِ تب‌بازِ معمولی (lib/notifications.ts) همچنان کار می‌کنه.
    return false;
  }
}
