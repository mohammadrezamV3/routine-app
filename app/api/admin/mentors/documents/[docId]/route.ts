import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { adminErrorResponse, loadTarget } from "@/lib/adminUsers";
import { ALLOWED_DOCUMENT_MIME } from "@/lib/mentorUpload";

// GET /api/admin/mentors/documents/:docId — فایلِ مدرک برای بررسیِ ادمین.
// inline فقط این‌جا مجازه چون نوعِ ذخیره‌شده از magic bytes (تصویر/PDF)
// تشخیص داده شده؛ با این حال nosniff + CSP سخت + sandbox تا حتی اگه محتوا
// دستکاری‌شده باشه اجرا نشه. هر مشاهده در AuditLog ثبت می‌شه (بدونِ بایت).

function contentDisposition(kind: "inline" | "attachment", name: string): string {
  const clean = name.replace(/[\u0000-\u001f\u007f"\\/]+/g, "").trim().slice(0, 100) || "document";
  const encoded = encodeURIComponent(clean).replace(/['()*!]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
  return `${kind}; filename*=UTF-8''${encoded}`;
}

export async function GET(_req: NextRequest, { params }: { params: { docId: string } }) {
  const g = await requireAdmin("mentors");
  if (!g.ok) return g.response;

  const doc = await prisma.mentorDocument.findUnique({
    where: { id: params.docId },
    select: {
      id: true, profileId: true, kind: true, category: true, fileName: true, mimeType: true, sizeBytes: true, data: true,
      profile: { select: { userId: true } },
    },
  });
  if (!doc) return NextResponse.json({ error: "فایل پیدا نشد" }, { status: 404 });
  // قوانینِ «کی روی کی»: نه روی خودش (تضاد منافع — جز Owner که همه رو، حتی خودش رو، تایید می‌کنه)، نه روی Owner، روی ادمینِ دیگه فقط با admins.manage
  try {
    await loadTarget(g, doc.profile.userId, { destructive: !g.isSuperAdmin });
  } catch (e) {
    return adminErrorResponse(e);
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: g.userId,
      action: "mentor.document_view",
      targetType: "User",
      targetId: doc.profile.userId,
      meta: { profileId: doc.profileId, documentId: doc.id, kind: doc.kind, category: doc.category, fileName: doc.fileName, mimeType: doc.mimeType, sizeBytes: doc.sizeBytes },
    },
  });

  const known = (ALLOWED_DOCUMENT_MIME as readonly string[]).includes(doc.mimeType);
  return new NextResponse(new Uint8Array(doc.data), {
    status: 200,
    headers: {
      "Content-Type": known ? doc.mimeType : "application/octet-stream",
      "Content-Length": String(doc.data.length),
      "Content-Disposition": contentDisposition(known ? "inline" : "attachment", doc.fileName),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
