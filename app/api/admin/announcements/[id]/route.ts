import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/adminAnalytics";
import { readJsonBody } from "@/lib/validate";
import { parseAnnouncementInput } from "@/lib/announcements";

// PATCH → ویرایش (عنوان/متن/وضعیت/انقضا — هر فیلد نفرستاده دست نمی‌خوره)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin("content");
  if (!guard.ok) return guard.response;

  const existing = await prisma.announcement.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "اطلاعیه پیدا نشد" }, { status: 404 });

  const parsed = await readJsonBody(req, 32 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const input = parseAnnouncementInput(parsed.body, true);
  if (!input.ok) return NextResponse.json({ error: input.error }, { status: 400 });
  if (Object.keys(input.data).length === 0) return NextResponse.json({ error: "تغییری فرستاده نشده" }, { status: 400 });

  const updated = await prisma.announcement.update({ where: { id: existing.id }, data: input.data });
  await writeAuditLog(guard.userId, "announcement.update", "Announcement", updated.id, {
    before: { title: existing.title, active: existing.active, expiresAt: existing.expiresAt },
    after: { title: updated.title, active: updated.active, expiresAt: updated.expiresAt },
    bodyChanged: existing.body !== updated.body,
  });
  return NextResponse.json({ announcement: updated });
}

// DELETE → حذف کامل
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin("content");
  if (!guard.ok) return guard.response;

  const existing = await prisma.announcement.findUnique({ where: { id: params.id }, select: { id: true, title: true } });
  if (!existing) return NextResponse.json({ error: "اطلاعیه پیدا نشد" }, { status: 404 });

  await prisma.announcement.delete({ where: { id: existing.id } });
  await writeAuditLog(guard.userId, "announcement.delete", "Announcement", existing.id, { title: existing.title });
  return NextResponse.json({ ok: true });
}
