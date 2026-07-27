import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateRoadmap } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/rateLimit";
import { clampText } from "@/lib/validate";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const roadmaps = await prisma.roadmap.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, topic: true, title: true, note: true, createdAt: true },
  });
  return NextResponse.json({ roadmaps });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const { topic } = body as { topic: string };
  if (!topic || !topic.trim()) {
    return NextResponse.json({ error: "موضوع الزامی است" }, { status: 400 });
  }
  const cleanTopic = clampText(topic.trim(), 120);

  // چون هر درخواست یعنی یک فراخوانی واقعی و پولی به Claude API، محدودش
  // می‌کنیم به ۱۰ رودمپ در ساعت به‌ازای هر کاربر — جلوگیری از سوءاستفاده/هزینه کنترل‌نشده.
  if (!checkRateLimit(`roadmap-gen:${userId}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "سقف ساخت رودمپ در این ساعت پر شده — بعداً امتحان کن" }, { status: 429 });
  }

  let generated;
  try {
    generated = await generateRoadmap(cleanTopic);
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
      generatedByAi: true,
    },
  });

  return NextResponse.json({ ok: true, roadmap });
}
