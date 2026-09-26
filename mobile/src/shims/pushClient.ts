// نسخه‌ی اپ از lib/pushClient.ts (tooling/webCompat.ts → webModuleRedirects).
// اپ سرویس‌ورکر/Web Push نداره (هرگز sw.js ثبت نمی‌شه)؛ یادآوری‌ها با
// LocalNotificationsِ Capacitor زمان‌بندی می‌شن (src/notifications). پس
// «سابسکرایب» این‌جا یعنی فقط گرفتنِ اجازه‌ی نوتیفِ محلی.
import { Capacitor } from "@capacitor/core";
import { getPermissionState, requestNotificationPermission } from "@m/notifications/permission";

export function pushSupported(): boolean {
  return Capacitor.isNativePlatform();
}

export async function subscribeToPush(): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    if ((await getPermissionState()) === "granted") return true;
    return await requestNotificationPermission();
  } catch {
    return false;
  }
}
