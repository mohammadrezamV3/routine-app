import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/adminAnalytics";
import { MAX_SEGMENT_NAME, sanitizeFilters } from "@/lib/adminUsersView";

// بخش ذخیره‌شده = اسم + مجموعه‌ی فیلترهای لیست کاربران

export async function GET() {
  const guard = await requireAdmin("users.view");
  if (!guard.ok) return guard.response;
  const segments = await prisma.adminSegment.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, name: true, filters: true, createdAt: true } });
  return NextResponse.json({ segments });
}

// POST { name, filters }
export async function POST(req: NextRequest) {
  const guard = await requireAdmin("users.edit");
  if (!guard.ok) return guard.response;
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, MAX_SEGMENT_NAME) : "";
  if (!name) return NextResponse.json({ error: "اسم بخش لازمه" }, { status: 400 });
  if ((await prisma.adminSegment.count()) >= 100) return NextResponse.json({ error: "حداکثر 100 بخش ذخیره می‌شه" }, { status: 409 });
  const filters = sanitizeFilters(body?.filters);
  const seg = await prisma.adminSegment.create({ data: { name, filters, createdById: guard.userId }, select: { id: true, name: true, filters: true } });
  await writeAuditLog(guard.userId, "user.segment_create", "AdminSegment", seg.id, { name });
  return NextResponse.json({ ok: true, segment: seg });
}

// DELETE ?id=
export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin("users.edit");
  if (!guard.ok) return guard.response;
  const id = req.nextUrl.searchParams.get("id") || "";
  const seg = await prisma.adminSegment.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!seg) return NextResponse.json({ error: "پیدا نشد" }, { status: 404 });
  await prisma.adminSegment.delete({ where: { id } });
  await writeAuditLog(guard.userId, "user.segment_delete", "AdminSegment", id, { name: seg.name });
  return NextResponse.json({ ok: true });
}
