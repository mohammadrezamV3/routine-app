import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/webPush";
import { publishToUser } from "@/lib/realtime";

// اعلان پایدار درون‌برنامه‌ای + پوش best-effort. هیچ‌وقت نباید خود اقدام
// اصلی (قبول درخواست، ارسال پیام، …) رو به‌خاطر شکست اعلان fail کنه.
export type NotifyInput = { type: string; title: string; body: string; url?: string };

export async function notifyUser(userId: string, n: NotifyInput): Promise<void> {
  try {
    await prisma.inAppNotification.create({
      data: { userId, type: n.type, title: n.title.slice(0, 120), body: n.body.slice(0, 500), url: n.url ?? null },
    });
  } catch {
    // ثبت اعلان نباید اقدام اصلی رو خراب کنه
  }
  sendPushToUser(userId, { title: n.title, body: n.body, url: n.url }).catch(() => {});
  // زنگوله‌ی همه‌ی دستگاه‌های باز گیرنده همون لحظه تازه می‌شه (فقط نوع، نه متن)
  void publishToUser(userId, { type: "notification.new", keys: ["notifications"] });
}

/** اسم نمایشی کاربر برای متن اعلان‌ها — هیچ‌وقت ایمیل/شماره نه */
export function displayName(u: { name?: string | null; lastName?: string | null; username?: string | null } | null | undefined): string {
  if (!u) return "یک کاربر";
  const full = [u.name, u.lastName].filter(Boolean).join(" ").trim();
  return full || u.username || "یک کاربر";
}
