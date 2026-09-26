// لایه‌ی نازک روی @capacitor/local-notifications — تبدیلِ PlannedNotification
// (content.ts) به فرمتِ native، لغوِ کاملِ pending قبلی و زمان‌بندیِ دسته‌ی جدید.
import { Capacitor } from "@capacitor/core";
import type { PlannedNotification } from "./content";

// سقفِ رسمیِ اندروید برای alarm/notification های pending یک اپ — رد شدن از
// این عدد باعثِ خطای exception در scheduleِ پلاگین می‌شه (content.ts با
// محدودکردنِ پنجره به ۷ روز عملا هیچ‌وقت بهش نزدیک نمی‌شه، این فقط یک ایمنیِ
// اضافه‌ست).
export const ANDROID_MAX_PENDING = 500;

async function loadPlugin() {
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  return LocalNotifications;
}

export async function cancelAllScheduled(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const LocalNotifications = await loadPlugin();
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) {
      await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    }
  } catch {
    /* noop */
  }
}

export async function scheduleNotifications(list: PlannedNotification[]): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (!list.length) return;
  const capped = list.slice(0, ANDROID_MAX_PENDING);
  try {
    const LocalNotifications = await loadPlugin();
    await LocalNotifications.schedule({
      notifications: capped.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        extra: { route: n.route },
        schedule: n.at
          ? { at: n.at, allowWhileIdle: true }
          : { on: { hour: n.daily!.hour, minute: n.daily!.minute }, allowWhileIdle: true, repeats: true },
      })),
    });
  } catch {
    /* یک آیتمِ بد (مثلا اجازه‌ی exact-alarm نبودن روی بعضی OEMها) کلِ دسته رو
     * رد نکنه — تلاشِ بعدی (start/resume بعدی) دوباره امتحان می‌شه. */
  }
}

/** لغوِ همه + زمان‌بندیِ دوباره — تنها مسیرِ عمومی که بقیه‌ی ماژول صدا می‌زنه،
 *  تا هیچ‌وقت نوتیفِ قدیمی/حذف‌شده کنارِ نسخه‌ی جدید pending نمونه. */
export async function reconcileScheduled(list: PlannedNotification[]): Promise<void> {
  await cancelAllScheduled();
  await scheduleNotifications(list);
}
