import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, notFound, conflict } from "@/lib/mentorGuard";
import { tr } from "@/lib/i18n";

type Ctx = { params: { docId: string } };

function validId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && id.length <= 64;
}

// GET /api/mentors/me/documents/:docId → خود فایل، فقط برای صاحبش.
// هیچ مسیر ذخیره‌سازی برنمی‌گرده؛ بایت‌ها از دیتابیس و با هدرهایی سرو
// می‌شن که مرورگر نه اجراشون کنه (nosniff + attachment) نه کش‌شون کنه.
export async function GET(_req: Request, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  if (!validId(params.docId)) return notFound();

  const doc = await prisma.mentorDocument.findFirst({
    where: { id: params.docId, profile: { userId: g.userId } },
    select: { data: true, mimeType: true, fileName: true, sizeBytes: true },
  });
  if (!doc) return notFound();

  const asciiName = doc.fileName.replace(/[^\x20-\x7e]+/g, "_").replace(/["\\]/g, "_");
  return new NextResponse(new Uint8Array(doc.data), {
    status: 200,
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Length": String(doc.data.length),
      "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}

// DELETE /api/mentors/me/documents/:docId → فقط وقتی وضعیت مربوط VERIFIED نیست
// (مدرکی که تایید فعلی بهش تکیه داره نباید بی‌صدا پاک بشه).
export async function DELETE(_req: Request, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  if (!validId(params.docId)) return notFound();

  const doc = await prisma.mentorDocument.findFirst({
    where: { id: params.docId, profile: { userId: g.userId } },
    select: { id: true, kind: true, category: true, profileId: true, profile: { select: { identityStatus: true } } },
  });
  if (!doc) return notFound();

  const status =
    doc.kind === "IDENTITY"
      ? doc.profile.identityStatus
      : (
          await prisma.mentorCredential.findUnique({
            where: { profileId_category: { profileId: doc.profileId, category: doc.category ?? "" } },
            select: { status: true },
          })
        )?.status ?? "NOT_PROVIDED";
  if (status === "VERIFIED") return conflict(tr("مدرک تاییدشده قابل حذف نیست", "A verified document can't be deleted"));

  await prisma.$transaction(async (tx) => {
    await tx.mentorDocument.delete({ where: { id: doc.id } });
    // اگه آخرین فایل یک درخواست «در انتظار بررسی» حذف شد، چیزی برای بررسی
    // نمونده — وضعیت به «ارسال نشده» برمی‌گرده (ردشده دست نمی‌خوره تا دلیلش بمونه).
    if (status !== "PENDING") return;
    const remaining = await tx.mentorDocument.count({
      where: { profileId: doc.profileId, kind: doc.kind, ...(doc.kind === "CERTIFICATE" ? { category: doc.category } : {}) },
    });
    if (remaining > 0) return;
    if (doc.kind === "IDENTITY") {
      await tx.mentorProfile.update({ where: { id: doc.profileId }, data: { identityStatus: "NOT_PROVIDED" } });
    } else {
      await tx.mentorCredential.updateMany({ where: { profileId: doc.profileId, category: doc.category ?? "" }, data: { status: "NOT_PROVIDED" } });
    }
    await tx.mentorVerificationEvent.create({
      data: { profileId: doc.profileId, kind: doc.kind, category: doc.category, fromStatus: "PENDING", toStatus: "NOT_PROVIDED", reason: "حذف مدرک توسط مربی", actorUserId: g.userId },
    });
  });

  return NextResponse.json({ ok: true });
}
