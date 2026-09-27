import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { clampText } from "@/lib/validate";
import { adminErrorResponse, loadTarget } from "@/lib/adminUsers";
import { notifyUser } from "@/lib/inAppNotify";

// POST /api/admin/mentors/:profileId/suspend  بدنه { suspend: bool, reason? }
// فقط «منتوری» رو تعلیق می‌کنه (از کشف حذف، پذیرش شاگرد/ساخت برنامه بسته)؛
// مسدودکردنِ کلِ حساب از /admin/users. قوانینِ «کی روی کی» از lib/adminUsers.
export async function POST(req: NextRequest, { params }: { params: { profileId: string } }) {
  const g = await requireAdmin("mentors");
  if (!g.ok) return g.response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.suspend !== "boolean") return NextResponse.json({ error: "ورودی نامعتبر است" }, { status: 400 });
  const suspend: boolean = body.suspend;
  const reason = typeof body.reason === "string" ? clampText(body.reason.trim(), 500) : "";

  const profile = await prisma.mentorProfile.findUnique({
    where: { id: params.profileId },
    select: { id: true, userId: true, suspendedAt: true },
  });
  if (!profile) return NextResponse.json({ error: "منتور پیدا نشد" }, { status: 404 });

  try {
    // همیشه destructive: خود-تعلیق‌برداری یا اقدام روی Owner/ادمینِ دیگه نباید ممکن باشه
    await loadTarget(g, profile.userId, { destructive: true });
  } catch (e) {
    return adminErrorResponse(e);
  }

  if (suspend === !!profile.suspendedAt) {
    return NextResponse.json({ error: suspend ? "این منتور از قبل تعلیقه" : "این منتور تعلیق نیست" }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.mentorProfile.update({
      where: { id: profile.id },
      data: suspend ? { suspendedAt: new Date(), suspendedReason: reason || null } : { suspendedAt: null, suspendedReason: null },
    }),
    prisma.auditLog.create({
      data: {
        actorUserId: g.userId,
        action: suspend ? "mentor.suspend" : "mentor.unsuspend",
        targetType: "User",
        targetId: profile.userId,
        meta: { profileId: profile.id, ...(reason ? { reason } : {}) },
      },
    }),
  ]);

  await notifyUser(profile.userId, {
    type: "mentor.suspension",
    title: suspend ? "منتوری شما تعلیق شد" : "تعلیقِ منتوری برداشته شد",
    body: suspend
      ? `پروفایل منتوری شما تا اطلاع ثانوی از فهرست منتورها حذف شد.${reason ? ` دلیل: ${reason}` : ""}`
      : "پروفایل منتوری‌ات دوباره فعاله.",
    url: "/mentor/profile",
  });

  return NextResponse.json({ ok: true });
}
