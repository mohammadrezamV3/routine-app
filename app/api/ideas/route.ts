import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clampText } from "@/lib/validate";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ideas = await prisma.idea.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ ideas });
}

// POST /api/ideas  { title, description }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, description } = body as { title: string; description?: string };
  if (!title || !title.trim()) {
    return NextResponse.json({ error: "عنوان الزامی است" }, { status: 400 });
  }

  const idea = await prisma.idea.create({
    data: {
      userId,
      title: clampText(title.trim(), 120),
      description: description ? clampText(description.trim(), 2000) : null,
    },
  });
  return NextResponse.json({ ok: true, idea });
}
