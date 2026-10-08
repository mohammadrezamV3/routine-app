// سمت سرور اطلاعیه‌ها: تشخیص بیننده (مهمان/کاربر، پلن پولی) و خواندن
// اطلاعیه‌های زنده برای لیست زنگوله یا پاپ‌آپ/بنر. فیلتر نهایی همیشه با
// selectAnnouncements (lib/announcements.ts) انجام می‌شه تا سرور، کلاینت و
// تست یک قاعده داشته باشن.
import { prisma } from "@/lib/prisma";
import {
  audiencesFor,
  selectAnnouncements,
  type AnnouncementViewer,
  type DisplayAnnouncement,
} from "@/lib/announcements";

/** پلن پولی فعال = اشتراک ACTIVE منقضی‌نشده روی پلنی با قیمت بیشتر از صفر */
export async function hasActivePaidPlan(userId: string, now = new Date()): Promise<boolean> {
  const row = await prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE", currentPeriodEnd: { gte: now }, plan: { priceMonthly: { gt: 0 } } },
    select: { id: true },
  });
  return !!row;
}

export async function announcementViewer(userId: string | null): Promise<AnnouncementViewer> {
  if (!userId) return { loggedIn: false, paid: false };
  return { loggedIn: true, paid: await hasActivePaidPlan(userId) };
}

function liveWhere(now: Date, viewer: AnnouncementViewer) {
  return {
    active: true,
    audience: { in: audiencesFor(viewer) },
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    ],
  };
}

/** اطلاعیه‌های لیست زنگوله برای این بیننده (جدیدترین اول) */
export async function listAnnouncementsFor(viewer: AnnouncementViewer, take: number, now = new Date()) {
  const rows = await prisma.announcement.findMany({
    where: { ...liveWhere(now, viewer), showInList: true },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true, title: true, body: true, createdAt: true, active: true, startsAt: true, expiresAt: true,
      audience: true, showInList: true, display: true, pages: true, priority: true,
    },
  });
  return selectAnnouncements(rows, { mode: "list", now, viewer });
}

/** پاپ‌آپ/بنرهای زنده برای این بیننده، بدون بسته‌شده‌های کاربر لاگین‌کرده */
export async function displayAnnouncementsFor(
  userId: string | null,
  viewer: AnnouncementViewer,
  now = new Date(),
): Promise<DisplayAnnouncement[]> {
  const [rows, dismissed] = await Promise.all([
    prisma.announcement.findMany({
      where: { ...liveWhere(now, viewer), display: { not: "NONE" } },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 50,
    }),
    userId
      ? prisma.announcementDismissal.findMany({ where: { userId }, select: { announcementId: true }, take: 2000 })
      : Promise.resolve([] as { announcementId: string }[]),
  ]);
  return selectAnnouncements(rows, { mode: "display", now, viewer, dismissed: dismissed.map((d) => d.announcementId) }).map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    display: r.display as DisplayAnnouncement["display"],
    position: r.position,
    pages: r.pages,
    tone: r.tone,
    priority: r.priority,
    dismissible: r.dismissible,
    frequency: r.frequency,
    ctaLabel: r.ctaLabel,
    ctaUrl: r.ctaUrl,
    imageUrl: r.imageUrl,
    createdAt: r.createdAt.toISOString(),
  }));
}
