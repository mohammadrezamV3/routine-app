import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { clampText } from "@/lib/validate";
import { adminErrorResponse, loadTarget } from "@/lib/adminUsers";
import { recomputeMentorRating } from "@/lib/mentorServer";
import { notifyUser } from "@/lib/inAppNotify";

// PATCH /api/admin/mentors/reports/:id
// بدنه { status: RESOLVED|DISMISSED, resolution?, action?: hide_review|delete_message|suspend_mentor }
// اقدام فقط همراهِ RESOLVED و فقط اگه با نوعِ هدف جور باشه. وقتی اقدامی روی
// هدف انجام می‌شه، بقیه‌ی گزارش‌های بازِ *همون هدف* هم بسته می‌شن (مثلِ
// الگوی گزارش‌های چت) تا ادمین یک چیز رو چند بار بررسی نکنه.

const ACTIONS = ["hide_review", "delete_message", "suspend_mentor"] as const;
type Action = (typeof ACTIONS)[number];

class Conflict extends Error {}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const g = await requireAdmin("mentors");
  if (!g.ok) return g.response;

  const body = await req.json().catch(() => null);
  const status = body?.status === "RESOLVED" || body?.status === "DISMISSED" ? (body.status as "RESOLVED" | "DISMISSED") : null;
  if (!status) return NextResponse.json({ error: "وضعیت نامعتبر است" }, { status: 400 });
  let action: Action | null = null;
  if (body.action !== undefined && body.action !== null && body.action !== "") {
    if (!ACTIONS.includes(body.action)) return NextResponse.json({ error: "اقدام نامعتبر است" }, { status: 400 });
    action = body.action as Action;
  }
  if (action && status !== "RESOLVED") return NextResponse.json({ error: "اقدام فقط همراه با «رسیدگی‌شده» ممکنه" }, { status: 400 });
  const resolution = typeof body.resolution === "string" ? clampText(body.resolution.trim(), 500) : "";

  const report = await prisma.mentorReport.findUnique({
    where: { id: params.id },
    select: { id: true, status: true, targetType: true, targetId: true, targetUserId: true, reason: true },
  });
  if (!report) return NextResponse.json({ error: "گزارش پیدا نشد" }, { status: 404 });
  if (report.status !== "OPEN") return NextResponse.json({ error: "این گزارش قبلا بررسی شده" }, { status: 409 });

  // گزارشی که علیهِ خودِ ادمین یا Owner (یا ادمینِ دیگه بدونِ admins.manage) ثبت شده،
  // حتی بدونِ اقدام هم نباید توسطِ همون ادمین بسته/رد بشه
  if (report.targetUserId) {
    try {
      await loadTarget(g, report.targetUserId, { destructive: true });
    } catch (e) {
      return adminErrorResponse(e);
    }
  }

  // ── پیش‌بررسیِ اقدام (قبل از هر نوشتنی) ──
  let reviewMentorId: string | null = null;
  let suspendProfile: { id: string; userId: string; suspendedAt: Date | null } | null = null;

  if (action === "hide_review") {
    if (report.targetType !== "REVIEW") return NextResponse.json({ error: "این اقدام فقط برای گزارشِ نظر است" }, { status: 400 });
    const review = await prisma.mentorReview.findUnique({ where: { id: report.targetId }, select: { mentorId: true } });
    if (!review) return NextResponse.json({ error: "نظرِ گزارش‌شده دیگه وجود نداره" }, { status: 404 });
    reviewMentorId = review.mentorId;
    try {
      await loadTarget(g, review.mentorId, { destructive: true });
    } catch (e) {
      return adminErrorResponse(e);
    }
  } else if (action === "delete_message") {
    if (report.targetType !== "MESSAGE") return NextResponse.json({ error: "این اقدام فقط برای گزارشِ پیام است" }, { status: 400 });
    const msg = await prisma.mentorMessage.findUnique({ where: { id: report.targetId }, select: { senderId: true } });
    if (msg) {
      try {
        await loadTarget(g, msg.senderId, { destructive: true });
      } catch (e) {
        return adminErrorResponse(e);
      }
    }
  } else if (action === "suspend_mentor") {
    let mentorUserId: string | null = report.targetType === "USER" ? report.targetId : report.targetUserId;
    if (report.targetType === "PROGRAM") {
      const p = await prisma.mentorProgram.findUnique({ where: { id: report.targetId }, select: { mentorId: true } });
      mentorUserId = p?.mentorId ?? mentorUserId;
    }
    suspendProfile = mentorUserId
      ? await prisma.mentorProfile.findUnique({ where: { userId: mentorUserId }, select: { id: true, userId: true, suspendedAt: true } })
      : null;
    if (!suspendProfile) return NextResponse.json({ error: "صاحبِ این محتوا منتور نیست" }, { status: 400 });
    try {
      await loadTarget(g, suspendProfile.userId, { destructive: true });
    } catch (e) {
      return adminErrorResponse(e);
    }
  }

  const now = new Date();
  const hideReason = resolution || report.reason;
  let messageDeleted = false;

  try {
    await prisma.$transaction(async (tx) => {
      const r = await tx.mentorReport.updateMany({
        where: { id: report.id, status: "OPEN" },
        data: { status, resolution: resolution || null, resolvedById: g.userId, resolvedAt: now },
      });
      if (r.count === 0) throw new Conflict();

      if (action === "hide_review") {
        await tx.mentorReview.update({ where: { id: report.targetId }, data: { status: "HIDDEN", hiddenReason: clampText(hideReason, 500) } });
        await tx.auditLog.create({
          data: {
            actorUserId: g.userId, action: "mentor.review_hide", targetType: "MentorReview", targetId: report.targetId,
            meta: { mentorUserId: reviewMentorId, reason: clampText(hideReason, 500), reportId: report.id },
          },
        });
      } else if (action === "delete_message") {
        const d = await tx.mentorMessage.deleteMany({ where: { id: report.targetId } });
        messageDeleted = d.count > 0;
      } else if (action === "suspend_mentor" && suspendProfile && !suspendProfile.suspendedAt) {
        await tx.mentorProfile.update({
          where: { id: suspendProfile.id },
          data: { suspendedAt: now, suspendedReason: clampText(resolution || report.reason, 500) },
        });
        await tx.auditLog.create({
          data: {
            actorUserId: g.userId, action: "mentor.suspend", targetType: "User", targetId: suspendProfile.userId,
            meta: { profileId: suspendProfile.id, reason: clampText(resolution || report.reason, 500), reportId: report.id },
          },
        });
      }

      // گزارش‌های بازِ دیگه روی همون هدف هم بسته می‌شن
      const siblings = action
        ? await tx.mentorReport.updateMany({
            where: { targetType: report.targetType, targetId: report.targetId, status: "OPEN", id: { not: report.id } },
            data: { status: "RESOLVED", resolution: resolution || null, resolvedById: g.userId, resolvedAt: now },
          })
        : { count: 0 };

      await tx.auditLog.create({
        data: {
          actorUserId: g.userId,
          action: "mentor.report_resolve",
          targetType: "MentorReport",
          targetId: report.id,
          meta: {
            status, action, targetType: report.targetType, targetId: report.targetId,
            ...(resolution ? { resolution } : {}),
            ...(action === "delete_message" ? { messageDeleted } : {}),
            ...(siblings.count ? { alsoClosed: siblings.count } : {}),
          },
        },
      });
    });
  } catch (e) {
    if (e instanceof Conflict) return NextResponse.json({ error: "این گزارش همزمان بررسی شده" }, { status: 409 });
    throw e;
  }

  if (reviewMentorId) await recomputeMentorRating(reviewMentorId);
  if (suspendProfile && !suspendProfile.suspendedAt) {
    await notifyUser(suspendProfile.userId, {
      type: "mentor.suspension",
      title: "منتوری شما تعلیق شد",
      body: "در پی بررسی یک گزارش، پروفایل منتوری شما تا اطلاع ثانوی از فهرست منتورها حذف شد.",
      url: "/mentor/profile",
    });
  }

  return NextResponse.json({ ok: true });
}
