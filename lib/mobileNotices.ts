import { prisma } from "@/lib/prisma";
import { SETTING_KEYS } from "@/lib/userSettingKeys";
import { recentPaidCheckouts } from "@/lib/mobileBilling";
import type { MobileNotice, MobileNoticesResponse } from "@/lib/mobileAccountContract";

// اطلاعیه‌های سروری برای اپ موبایل.
//
// وب جدولِ «نوتیف» نداره — NotificationPanel.tsx اطلاعیه‌های ثابت (خوش‌آمد)
// رو با فهرستِ «بسته‌شده»های UserSetting ِ dismissedStaticNotifs نشون می‌ده
// و بقیه‌اش یادآوری‌های محاسبه‌شده‌ی سمتِ کلاینته (که اپ خودش با
// LocalNotifications داره). این‌جا همون الگو سمتِ سرور: اطلاعیه‌ها هر بار از
// روی داده‌ی واقعی ساخته می‌شن و «خونده‌شده» توی همون کلید ذخیره می‌شه
// (id های اضافه برای وب بی‌اثرن — فقط idهای ثابتِ خودش رو فیلتر می‌کنه).
//
// منابع:
//   • welcome              — یک‌بار، تا خونده بشه (هم‌رسان با وب)
//   • ticket_answered      — تیکتِ ANSWERED؛ id شاملِ updatedAt است، پس جوابِ تازه = اطلاعیه‌ی تازه
//   • expiring             — ماژول‌های فعالی که ظرفِ ۷ روز منقضی می‌شن
//   • payment              — خریدِ موفقِ اپ در ۱۴ روزِ اخیر (از MobileCheckout ِ PAID)

const READ_KEY = SETTING_KEYS.dismissedStaticNotifs;
/** idهای ثابتِ وب — هیچ‌وقت از فهرست بیرون انداخته نمی‌شن */
const WEB_STATIC_IDS = new Set(["welcome", "pwa"]);
const MAX_READ_IDS = 200;
const EXPIRY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const PAYMENT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

const MODULE_LABELS: Record<string, string> = {
  ROUTINE: "روتین", SLEEP: "خواب", TASKS: "کارها", EXERCISE: "بدنسازی", CALORIE: "کالری",
  TRADE: "ترید", ROADMAP: "رودمپ", AI_INSIGHT: "تحلیلِ هوشمند",
};

async function readIds(userId: string): Promise<string[]> {
  const row = await prisma.userSetting.findUnique({ where: { userId_key: { userId, key: READ_KEY } }, select: { value: true } });
  const v = row?.value;
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

async function buildNotices(userId: string, now: Date): Promise<Omit<MobileNotice, "read">[]> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true, isSuperAdmin: true } });
  if (!user) return [];
  const [tickets, access, paid] = await Promise.all([
    prisma.supportTicket.findMany({
      where: { userId, status: "ANSWERED" },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { id: true, subject: true, updatedAt: true },
    }),
    user.isSuperAdmin
      ? Promise.resolve([] as { module: string; expiresAt: Date | null }[])
      : prisma.moduleAccess.findMany({
          where: { userId, active: true, expiresAt: { gt: now, lte: new Date(now.getTime() + EXPIRY_WINDOW_MS) } },
          select: { module: true, expiresAt: true },
          orderBy: { expiresAt: "asc" },
        }),
    recentPaidCheckouts(userId, new Date(now.getTime() - PAYMENT_WINDOW_MS)),
  ]);

  const out: Omit<MobileNotice, "read">[] = [];
  for (const p of paid) {
    out.push({
      id: `payment:${p.id}`, kind: "payment", title: "خرید موفق",
      body: "پرداختت تأیید شد و پلن فعال است. از خریدت ممنونیم!",
      createdAt: (p.resolvedAt ?? now).toISOString(), href: "/account/plans",
    });
  }
  for (const t of tickets) {
    out.push({
      id: `ticket:${t.id}:${t.updatedAt.getTime()}`, kind: "ticket_answered", title: "پاسخِ پشتیبانی",
      body: `به تیکتِ «${t.subject}» پاسخ داده شد.`, createdAt: t.updatedAt.toISOString(), href: `/account/support/${t.id}`,
    });
  }
  if (access.length > 0) {
    const first = access[0].expiresAt!;
    const labels = Array.from(new Set(access.map((a) => MODULE_LABELS[a.module] ?? a.module)));
    const days = Math.max(1, Math.ceil((first.getTime() - now.getTime()) / 86_400_000));
    out.push({
      id: `expiring:${first.toISOString().slice(0, 10)}`, kind: "expiring", title: "اشتراکت رو به پایانه",
      body: `دسترسیِ ${labels.join("، ")} تا ${days.toLocaleString("fa-IR")} روزِ دیگر تمام می‌شود.`,
      createdAt: new Date(first.getTime() - EXPIRY_WINDOW_MS).toISOString(), href: "/account/plans",
    });
  }
  out.push({
    id: "welcome", kind: "welcome", title: "به آریون خوش اومدی!",
    body: "روتین، خواب، بدنسازی و کالری، ژورنال ترید و رودمپ یادگیری — همه یه‌جا. اگه سوالی داشتی از «پشتیبانی» بپرس.",
    createdAt: user.createdAt.toISOString(), href: null,
  });
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listNotices(userId: string, now = new Date()): Promise<MobileNoticesResponse> {
  const [notices, read] = await Promise.all([buildNotices(userId, now), readIds(userId)]);
  const readSet = new Set(read);
  const withRead = notices.map((n) => ({ ...n, read: readSet.has(n.id) }));
  return { notices: withRead, unreadCount: withRead.filter((n) => !n.read).length };
}

/** فقط idهایی که همین الان واقعا جزوِ اطلاعیه‌های کاربرن ثبت می‌شن — ورودیِ دلبخواه ذخیره نمی‌شه */
export async function markNoticesRead(userId: string, input: { ids?: unknown; all?: unknown }, now = new Date()): Promise<MobileNoticesResponse> {
  const current = await buildNotices(userId, now);
  const currentIds = new Set(current.map((n) => n.id));
  const wanted = input.all === true
    ? [...currentIds]
    : Array.isArray(input.ids) ? input.ids.filter((x): x is string => typeof x === "string" && currentIds.has(x)).slice(0, 100) : [];

  if (wanted.length > 0) {
    const existing = await readIds(userId);
    const merged = Array.from(new Set([...existing, ...wanted]));
    const statics = merged.filter((id) => WEB_STATIC_IDS.has(id));
    const others = merged.filter((id) => !WEB_STATIC_IDS.has(id)).slice(-MAX_READ_IDS);
    const value = [...statics, ...others];
    await prisma.userSetting.upsert({
      where: { userId_key: { userId, key: READ_KEY } },
      create: { userId, key: READ_KEY, value },
      update: { value },
    });
  }
  return listNotices(userId, now);
}
