import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const roadmap = await prisma.roadmap.findFirst({ where: { id: params.id, userId } });
  if (!roadmap) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ roadmap });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  await prisma.roadmap.deleteMany({ where: { id: params.id, userId } });
  return NextResponse.json({ ok: true });
}
