import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clampText } from "@/lib/validate";

// PATCH /api/ideas/:id  { title?, description? }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, description } = body as { title?: string; description?: string };
  if (title !== undefined && !title.trim()) {
    return NextResponse.json({ error: "عنوان الزامی است" }, { status: 400 });
  }

  const data: { title?: string; description?: string | null } = {};
  if (title !== undefined) data.title = clampText(title.trim(), 120);
  if (description !== undefined) data.description = description.trim() ? clampText(description.trim(), 2000) : null;

  const result = await prisma.idea.updateMany({ where: { id: params.id, userId }, data });
  if (result.count === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/ideas/:id
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await prisma.idea.deleteMany({ where: { id: params.id, userId } });
  return NextResponse.json({ ok: true });
}
