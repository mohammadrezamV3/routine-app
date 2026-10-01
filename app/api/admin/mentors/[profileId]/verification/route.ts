import { NextRequest, NextResponse } from "next/server";
import { Prisma, VerificationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { adminErrorResponse, loadTarget } from "@/lib/adminUsers";
import { clampText } from "@/lib/validate";
import { isMentorCategory, MENTOR_CATEGORY_META, VERIFICATION_LABELS } from "@/lib/mentorCategories";
import { notifyUser } from "@/lib/inAppNotify";

// POST /api/admin/mentors/:profileId/verification
// بدنه { kind: IDENTITY|CERTIFICATE, category?, status, reason? }
// تنها مسیری که وضعیت احراز رو می‌نویسه. هر تغییر: فیلد پروفایل/مدرک +
// MentorVerificationEvent + AuditLog + اعلان به منتور. REJECTED بدون دلیل → ۴۰۰.
// قفل خوش‌بینانه روی وضعیت قبلی: اگه همزمان (مثلا با ارسال مدرک تازه) عوض
// شده باشه → ۴۰۹ تا ادمین روی داده‌ی کهنه تصمیم نگیره.

const STATUSES: VerificationStatus[] = ["NOT_PROVIDED", "PENDING", "VERIFIED", "REJECTED"];

class Conflict extends Error {}
class NoChange extends Error {}

export async function POST(req: NextRequest, { params }: { params: { profileId: string } }) {
  const g = await requireAdmin("mentors");
  if (!g.ok) return g.response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "ورودی نامعتبر است" }, { status: 400 });

  const kind = body.kind === "IDENTITY" || body.kind === "CERTIFICATE" ? (body.kind as "IDENTITY" | "CERTIFICATE") : null;
  const status = STATUSES.includes(body.status) ? (body.status as VerificationStatus) : null;
  if (!kind || !status) return NextResponse.json({ error: "نوع یا وضعیت نامعتبر است" }, { status: 400 });

  let category: string | null = null;
  if (kind === "CERTIFICATE") {
    if (!isMentorCategory(body.category)) return NextResponse.json({ error: "دسته‌ی مدرک نامعتبر است" }, { status: 400 });
    category = body.category;
  }

  const reason = typeof body.reason === "string" ? clampText(body.reason.trim(), 500) : "";
  if (status === "REJECTED" && !reason) {
    return NextResponse.json({ error: "دلیل رد الزامی است" }, { status: 400 });
  }

  const profile = await prisma.mentorProfile.findUnique({
    where: { id: params.profileId },
    select: { id: true, userId: true, identityStatus: true },
  });
  if (!profile) return NextResponse.json({ error: "مربی پیدا نشد" }, { status: 404 });
  // قوانین «کی روی کی»: نه روی خودش (تضاد منافع — جز Owner که همه رو، حتی خودش رو، تایید می‌کنه)، نه روی Owner، روی ادمین دیگه فقط با admins.manage
  try {
    await loadTarget(g, profile.userId, { destructive: !g.isSuperAdmin });
  } catch (e) {
    return adminErrorResponse(e);
  }

  const now = new Date();
  let fromStatus: VerificationStatus;

  try {
    fromStatus = await prisma.$transaction(async (tx) => {
      let from: VerificationStatus;
      if (kind === "IDENTITY") {
        from = profile.identityStatus;
        if (from === status && status !== "REJECTED") throw new NoChange();
        const r = await tx.mentorProfile.updateMany({
          where: { id: profile.id, identityStatus: from },
          data: {
            identityStatus: status,
            identityRejectReason: status === "REJECTED" ? reason : null,
            identityReviewedAt: now,
          },
        });
        if (r.count === 0) throw new Conflict();
      } else {
        const existing = await tx.mentorCredential.findUnique({
          where: { profileId_category: { profileId: profile.id, category: category! } },
          select: { id: true, status: true },
        });
        from = existing?.status ?? "NOT_PROVIDED";
        if (from === status && status !== "REJECTED") throw new NoChange();
        const data = { status, rejectReason: status === "REJECTED" ? reason : null, reviewedAt: now };
        if (existing) {
          const r = await tx.mentorCredential.updateMany({ where: { id: existing.id, status: from }, data });
          if (r.count === 0) throw new Conflict();
        } else {
          await tx.mentorCredential.create({ data: { profileId: profile.id, category: category!, ...data } });
        }
      }

      await tx.mentorVerificationEvent.create({
        data: {
          profileId: profile.id, kind, category, fromStatus: from, toStatus: status,
          reason: reason || null, actorUserId: g.userId,
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: g.userId,
          action: kind === "IDENTITY" ? "mentor.verify_identity" : "mentor.verify_certificate",
          targetType: "User",
          targetId: profile.userId,
          meta: { profileId: profile.id, category, from, to: status, ...(reason ? { reason } : {}) },
        },
      });
      return from;
    });
  } catch (e) {
    if (e instanceof NoChange) return NextResponse.json({ error: "وضعیت فعلی همین است؛ تغییری ثبت نشد" }, { status: 400 });
    if (e instanceof Conflict || (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) {
      return NextResponse.json({ error: "وضعیت در این فاصله تغییر کرده است؛ صفحه باید تازه شود" }, { status: 409 });
    }
    throw e;
  }

  const subject = kind === "IDENTITY"
    ? "مدرک هویت"
    : `«${MENTOR_CATEGORY_META[category as keyof typeof MENTOR_CATEGORY_META].certLabel}»`;
  const text =
    status === "VERIFIED" ? `${subject} شما تایید شد.`
    : status === "REJECTED" ? `${subject} شما رد شد؛ دلیل: ${reason}`
    : status === "PENDING" ? `${subject} شما در صف بررسی ادمین‌های آریون قرار گرفت.`
    : `وضعیت ${subject} شما به «${VERIFICATION_LABELS[status]}» تغییر کرد؛ بررسی دوباره پس از ارسال مدرک تازه انجام می‌شود.`;
  await notifyUser(profile.userId, {
    type: "verification.result",
    title: kind === "IDENTITY" ? "احراز هویت" : "مدرک تخصصی",
    body: text,
    url: "/mentor/profile",
  });

  return NextResponse.json({ ok: true, fromStatus, status });
}
