import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/adminAnalytics";
import { readJsonBody } from "@/lib/validate";
import { parseAnnouncementInput, type AnnouncementInput } from "@/lib/announcements";

// GET → همه‌ی اطلاعیه‌ها (فعال/غیرفعال/منقضی) برای پنل ادمین
export async function GET() {
  const guard = await requireAdmin("content");
  if (!guard.ok) return guard.response;

  const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
  return NextResponse.json({ announcements });
}

// POST → ساخت اطلاعیه‌ی جدید
export async function POST(req: NextRequest) {
  const guard = await requireAdmin("content");
  if (!guard.ok) return guard.response;

  const parsed = await readJsonBody(req, 32 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const input = parseAnnouncementInput(parsed.body, false);
  if (!input.ok) return NextResponse.json({ error: input.error }, { status: 400 });
  const data = input.data as AnnouncementInput;

  const created = await prisma.announcement.create({
    data: { title: data.title, body: data.body, active: data.active, expiresAt: data.expiresAt, createdById: guard.userId },
  });
  await writeAuditLog(guard.userId, "announcement.create", "Announcement", created.id, {
    title: created.title, active: created.active, expiresAt: created.expiresAt,
  });
  return NextResponse.json({ announcement: created });
}
