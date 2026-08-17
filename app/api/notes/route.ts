import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { clampText } from "@/lib/validate";
import { NOTE_MAX_CONTENT, NOTE_MAX_TITLE, normalizeChecklist, normalizeTags } from "@/lib/notes";

// GET /api/notes — لیستِ یادداشت‌های کاربر، سنجاق‌شده‌ها اول
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const notes = await prisma.note.findMany({
    where: { userId },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });
  return NextResponse.json({ notes });
}

// POST /api/notes — ساختِ یادداشتِ جدید
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!checkRateLimit(`note-create:${userId}`, 40, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "تعداد یادداشت‌های ساخته‌شده در این ساعت زیاده — کمی صبر کن" }, { status: 429 });
  }

  const body = await req.json();
  const title = clampText(String(body.title ?? "").trim(), NOTE_MAX_TITLE);
  if (!title) return NextResponse.json({ error: "عنوان لازمه" }, { status: 400 });

  const note = await prisma.note.create({
    data: {
      userId,
      title,
      content: clampText(String(body.content ?? ""), NOTE_MAX_CONTENT),
      tags: normalizeTags(body.tags),
      checklist: normalizeChecklist(body.checklist) ?? undefined,
      reminderAt: body.reminderAt ? new Date(body.reminderAt) : null,
      color: typeof body.color === "string" ? body.color.slice(0, 16) : null,
      pinned: !!body.pinned,
    },
  });
  return NextResponse.json({ note });
}
