import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const roadmap = await prisma.roadmap.findFirst({ where: { id: params.id, userId } });
  if (!roadmap) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ roadmap });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await prisma.roadmap.deleteMany({ where: { id: params.id, userId } });
  return NextResponse.json({ ok: true });
}
