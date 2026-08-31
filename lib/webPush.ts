import webPush from "web-push";
import { prisma } from "@/lib/prisma";

// نوتیفِ واقعیِ Web Push — برخلافِ lib/notifications.ts (که فقط وقتی تب باز
// باشه کار می‌کنه)، این حتی وقتی اپ/مرورگر کاملاً بسته‌ست هم به کاربر می‌رسه،
// چون از سرورهای Push خودِ مرورگر (نه از تبِ باز) رد می‌شه.

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
 * کاربر یک استثنای یکسان پرتاب می‌شود و کلِ اجرا می‌افتد.
 */
export function isPushConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

export type PushPayload = { title: string; body: string; url?: string };

/**
 * پیام رو به همه‌ی دستگاه‌های ثبت‌شده‌ی یک کاربر می‌فرسته. سابسکریپشن‌هایی که
 * مرورگر دیگه معتبرشون نمی‌دونه (کاربر نوتیف رو غیرفعال کرده یا داده‌های
 * مرورگر پاک شده — endpoint با ۴۰۴/۴۱۰ برمی‌گرده) از دیتابیس پاک می‌شن، وگرنه
 * هر بار دوباره تلاشِ بی‌فایده براشون می‌کردیم.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<{ sent: number; pruned: number }> {
  ensureVapid();
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  let sent = 0;
  const deadIds: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
        sent++;
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          deadIds.push(sub.id);
        }
        // خطاهای دیگه (مثلاً یه قطعیِ موقتِ شبکه) عمداً نادیده گرفته می‌شن —
        // sub رو حذف نمی‌کنیم چون ممکنه موقتی باشه، دفعه‌ی بعد دوباره امتحان می‌شه.
      }
    })
  );

  if (deadIds.length) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: deadIds } } });
  }

  return { sent, pruned: deadIds.length };
}
