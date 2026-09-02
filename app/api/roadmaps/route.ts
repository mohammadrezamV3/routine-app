import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { generateRoadmap } from "@/lib/aiClient";
import { clampText } from "@/lib/validate";

export async function GET() {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const roadmaps = await prisma.roadmap.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, topic: true, title: true, note: true, createdAt: true },
  });
  return NextResponse.json({ roadmaps });
}

export async function POST(req: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await req.json();
  const { topic } = body as { topic: string };
  if (!topic || !topic.trim()) {
    return NextResponse.json({ error: "موضوع الزامی است" }, { status: 400 });
  }
  const cleanTopic = clampText(topic.trim(), 120);

  let generated;
  try {
    generated = await generateRoadmap(cleanTopic, userId);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "خطا در ساخت رودمپ" }, { status: 500 });
  }

  const roadmap = await prisma.roadmap.create({
    data: {
      userId,
      topic: cleanTopic,
      title: generated.title,
      note: generated.note,
      stations: generated.stations as any,
      tips: generated.tips as any,
      proTips: generated.pro as any,
      books: generated.books as any,
      mistakes: generated.mistakes as any,
      level: generated.level ?? null,
      totalWeeks: generated.totalWeeks ?? null,
      generatedByAi: true,
    },
  });

  return NextResponse.json({ ok: true, roadmap });
}
