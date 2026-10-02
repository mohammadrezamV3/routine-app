import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, badRequest } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { activateDueForUser } from "@/lib/mentorSchedule";
import { publishToUser } from "@/lib/realtime";
import { sessionFeatureBlocked } from "@/lib/featureFlagsServer";

const PAGE_SIZE = 30;
const MAX_IDS = 100;

// GET /api/notifications?before=<ISO> → اعلان‌های درون‌برنامه‌ای خودم (جدیدترین اول)
export async function GET(req: NextRequest) {
  { const off = await sessionFeatureBlocked("notifications"); if (off) return off; }
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;

  // اعلان‌ها با لود هر صفحه خوانده می‌شوند؛ برنامه‌ی زمان‌بندی‌شده‌ای که روزش رسیده همین‌جا فعال می‌شود
  if (!req.nextUrl.searchParams.get("before")) await activateDueForUser(me);

  const beforeRaw = req.nextUrl.searchParams.get("before");
  let before: Date | null = null;
  if (beforeRaw) {
    before = new Date(beforeRaw);
    if (Number.isNaN(before.getTime())) return badRequest("پارامتر before نامعتبره");
  }

  const [rows, unread] = await Promise.all([
    prisma.inAppNotification.findMany({
      where: { userId: me, ...(before ? { createdAt: { lt: before } } : {}) },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE + 1,
      select: { id: true, type: true, title: true, body: true, url: true, readAt: true, createdAt: true },
    }),
    prisma.inAppNotification.count({ where: { userId: me, readAt: null } }),
  ]);

  return NextResponse.json({ notifications: rows.slice(0, PAGE_SIZE), unread, hasMore: rows.length > PAGE_SIZE });
}

// PATCH /api/notifications { ids?: string[], all?: true } → خوانده‌شده، فقط اعلان‌های خودم
export async function PATCH(req: Request) {
  { const off = await sessionFeatureBlocked("notifications"); if (off) return off; }
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;

  const parsed = await readJsonBody(req, 16 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const b = parsed.body || {};

  if (b.all === true) {
    await prisma.inAppNotification.updateMany({ where: { userId: me, readAt: null }, data: { readAt: new Date() } });
    void publishToUser(me, { type: "notification.read", keys: ["notifications"] });
    return NextResponse.json({ ok: true });
  }
  if (!Array.isArray(b.ids) || b.ids.length === 0) return badRequest("ids یا all لازمه");
  if (b.ids.length > MAX_IDS) return badRequest(`حداکثر ${MAX_IDS} اعلان در هر درخواست`);
  const ids = b.ids.filter((x: unknown): x is string => typeof x === "string" && x.length > 0 && x.length <= 64);
  if (ids.length > 0) {
    // userId در where: id اعلان کس دیگه بی‌اثر می‌مونه
    const res = await prisma.inAppNotification.updateMany({ where: { id: { in: ids }, userId: me, readAt: null }, data: { readAt: new Date() } });
    // شمارنده‌ی زنگوله‌ی بقیه‌ی دستگاه‌های خودم
    if (res.count > 0) void publishToUser(me, { type: "notification.read", keys: ["notifications"] });
  }
  return NextResponse.json({ ok: true });
}
