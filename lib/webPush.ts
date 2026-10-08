import webPush from "web-push";
import { prisma } from "@/lib/prisma";

// نوتیف واقعی Web Push — برخلاف lib/notifications.ts (که فقط وقتی تب باز
// باشه کار می‌کنه)، این حتی وقتی اپ/مرورگر کاملا بسته‌ست هم به کاربر می‌رسه،
// چون از سرورهای Push خود مرورگر (نه از تب باز) رد می‌شه.

let vapidConfigured = false;
function ensureVapid() {
  if (vapidConfigured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error("VAPID_PRIVATE_KEY/NEXT_PUBLIC_VAPID_PUBLIC_KEY/VAPID_SUBJECT روی .env ست نشدن");
  }
  webPush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

/**
 * آیا کلیدهای VAPID روی این محیط ست شده‌اند؟
 * کران‌ها با این *قبل* از حلقه‌زدن روی کاربرها چک می‌کنند — وگرنه به‌ازای هر
 * کاربر یک استثنای یکسان پرتاب می‌شود و کل اجرا می‌افتد.
 */
export function isPushConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  /** یک شناسه‌ی پایدار برای همین یادآوری — سرویس‌ورکر با همین `tag` نمایش می‌ده
   *  تا اگه نسخه‌ی تب‌باز (NotificationEngine) هم همون رو نشون داد، دوتا نشه. */
  tag?: string;
  /** epoch ms — لحظه‌ی شروع برنامه/رویداد. بعد از این دیگه نباید نشون داده بشه
   *  (هم TTL سرویس پوش روی همین تنظیم می‌شه، هم سرویس‌ورکر خودش چک می‌کنه). */
  deadline?: number;
};

/** سقف TTL وقتی deadline نداریم (اعلان‌های رویدادی مثل پیام منتور) — یک روز،
 *  نه ۴ هفته‌ی پیش‌فرض کتابخونه که باعث می‌شد اعلان کهنه روزها بعد برسه. */
const DEFAULT_TTL_SECONDS = 24 * 60 * 60;
/** سرویس پوش کند/آویزون نباید کل تیک زمان‌بند رو معطل کنه */
const SEND_TIMEOUT_MS = 10_000;

/**
 * پیام رو به همه‌ی دستگاه‌های ثبت‌شده‌ی یک کاربر می‌فرسته. سابسکریپشن‌هایی که
 * مرورگر دیگه معتبرشون نمی‌دونه (کاربر نوتیف رو غیرفعال کرده یا داده‌های
 * مرورگر پاک شده — endpoint با ۴۰۴/۴۱۰ برمی‌گرده) از دیتابیس پاک می‌شن، وگرنه
 * هر بار دوباره تلاش بی‌فایده براشون می‌کردیم.
 *
 * `urgency: high` لازمه: با پیش‌فرض normal، اندروید در حالت Doze پوش رو تا
 * پنجره‌ی نگهداری بعدی (گاهی ده‌ها دقیقه) نگه می‌داره — همون «خیلی دیر می‌رسه».
 * TTL تا deadline: اگه دستگاه تا شروع برنامه آنلاین نشد، سرویس پوش خودش
 * پیام رو دور می‌ریزه، نه اینکه بعدا (بعد از شروع) تحویلش بده.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; pruned: number; failed: number; expired?: boolean }> {
  ensureVapid();
  let ttl = DEFAULT_TTL_SECONDS;
  if (typeof payload.deadline === "number") {
    const secondsLeft = Math.floor((payload.deadline - Date.now()) / 1000);
    // از شروع گذشته → اصلا نفرست
    if (secondsLeft <= 0) return { sent: 0, pruned: 0, failed: 0, expired: true };
    ttl = Math.min(secondsLeft, DEFAULT_TTL_SECONDS);
  }

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  let sent = 0;
  let failed = 0;
  const deadIds: string[] = [];
  const body = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
          { TTL: ttl, urgency: "high", timeout: SEND_TIMEOUT_MS }
        );
        sent++;
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          deadIds.push(sub.id);
        } else {
          // خطاهای دیگه (مثلا یه قطعی موقت شبکه) sub رو حذف نمی‌کنن چون ممکنه
          // موقتی باشن؛ فقط شمرده می‌شن تا زمان‌بند بدونه باید دوباره امتحان کنه.
          failed++;
        }
      }
    })
  );

  if (deadIds.length) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: deadIds } } });
  }

  return { sent, pruned: deadIds.length, failed };
}
