// درخواست/چکِ اجازه‌ی نوتیفِ محلی — فقط روی native (Capacitor)، روی وب
// همیشه "unsupported" برمی‌گرده تا بقیه‌ی ماژول بی‌سروصدا no-op بشه.
//
// اندروید ۱۳+ (API 33) اجازه‌ی POST_NOTIFICATIONS رو runtime می‌خواد —
// LocalNotifications.requestPermissions() خودش این پرامپت رو نشون می‌ده
// (پلاگین @capacitor/local-notifications این رفتار رو مدیریت می‌کنه، به شرطی
// که POST_NOTIFICATIONS توی AndroidManifest.xml هم declare شده باشه).
import { Capacitor } from "@capacitor/core";

export type NotificationPermissionState = "granted" | "denied" | "prompt" | "unsupported";

async function loadPlugin() {
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  return LocalNotifications;
}

export function notificationsSupported(): boolean {
  return Capacitor.isNativePlatform();
}

export async function getPermissionState(): Promise<NotificationPermissionState> {
  if (!notificationsSupported()) return "unsupported";
  try {
    const LocalNotifications = await loadPlugin();
    const { display } = await LocalNotifications.checkPermissions();
    return display as NotificationPermissionState;
  } catch {
    return "unsupported";
  }
}

/** پرامپتِ اجازه رو نشون می‌ده (اگه لازم باشه) و نتیجه‌ی نهایی رو برمی‌گردونه. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  try {
    const LocalNotifications = await loadPlugin();
    const { display } = await LocalNotifications.requestPermissions();
    return display === "granted";
  } catch {
    return false;
  }
}

/**
 * اندروید ۱۲+ (API 31) برای alarmِ دقیق (setExactAndAllowWhileIdle) به اجازه‌ی
 * جداگانه‌ی SCHEDULE_EXACT_ALARM نیاز داره که کاربر باید از تنظیماتِ سیستم
 * بده — ما این‌جا فقط چک می‌کنیم، هیچ‌وقت کاربر رو مجبور به گرفتنش نمی‌کنیم؛
 * بدونش هم زمان‌بندی کار می‌کنه، فقط ممکنه با کمی تاخیر (Doze) برسه، که برای
 * یادآوریِ نرم مشکلی نیست.
 */
export async function canScheduleExactAlarms(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  try {
    const LocalNotifications = await loadPlugin();
    if (!("checkExactNotificationSetting" in LocalNotifications)) return true;
    const res = await (LocalNotifications as unknown as {
      checkExactNotificationSetting(): Promise<{ exact_alarm: string }>;
    }).checkExactNotificationSetting();
    return res.exact_alarm === "granted";
  } catch {
    return true;
  }
}
