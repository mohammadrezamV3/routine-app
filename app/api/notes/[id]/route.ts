import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clampText } from "@/lib/validate";
import { NOTE_MAX_CONTENT, NOTE_MAX_TITLE, normalizeChecklist, normalizeTags } from "@/lib/notes";

// PATCH /api/notes/:id — ویرایشِ جزئی (فقط فیلدهای فرستاده‌شده عوض می‌شن)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const existing = await prisma.note.findFirst({ where: { id: params.id, userId } });
  if (!existing) return NextResponse.json({ error: "یادداشت پیدا نشد" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) {
    const title = clampText(String(body.title).trim(), NOTE_MAX_TITLE);
    if (!title) return NextResponse.json({ error: "عنوان لازمه" }, { status: 400 });
    data.title = title;
  }
  if (body.content !== undefined) data.content = clampText(String(body.content), NOTE_MAX_CONTENT);
  if (body.tags !== undefined) data.tags = normalizeTags(body.tags);
  if (body.checklist !== undefined) data.checklist = normalizeChecklist(body.checklist);
  if (body.reminderAt !== undefined) data.reminderAt = body.reminderAt ? new Date(body.reminderAt) : null;
  if (body.color !== undefined) data.color = typeof body.color === "string" ? body.color.slice(0, 16) : null;
  if (body.pinned !== undefined) data.pinned = !!body.pinned;

  const note = await prisma.note.update({ where: { id: params.id }, data });
  return NextResponse.json({ note });
}

// DELETE /api/notes/:id
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const existing = await prisma.note.findFirst({ where: { id: params.id, userId } });
  if (!existing) return NextResponse.json({ error: "یادداشت پیدا نشد" }, { status: 404 });

  await prisma.note.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
