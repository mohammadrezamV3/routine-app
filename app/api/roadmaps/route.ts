import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { generateRoadmap, RoadmapSchedule } from "@/lib/aiClient";
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

/**
 * برنامه‌ی زمانی از کلاینت می‌آید، پس *همین‌جا* اعتبارسنجی می‌شود و نه فقط
 * در فرم: کلاینت قابلِ دور زدن است، و این مقدار هم به پرامپتِ مدل می‌رود هم
 * در دیتابیس می‌نشیند.
 */
function parseSchedule(v: unknown): RoadmapSchedule | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const rawDays = Array.isArray(o.jsDays) ? o.jsDays : [];
  const jsDays = Array.from(
    new Set(rawDays.filter((d): d is number => typeof d === "number" && Number.isInteger(d) && d >= 0 && d <= 6))
  ).sort((a, b) => a - b);
  if (!jsDays.length) return null;

  const minutes = Number(o.minutesPerDay);
  if (!Number.isFinite(minutes) || minutes < 10 || minutes > 480) return null;

  const startTime = typeof o.startTime === "string" ? o.startTime.trim() : "";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) return null;

  return { jsDays, minutesPerDay: Math.round(minutes), startTime };
}

export async function POST(req: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await req.json();
  const { topic, schedule } = body as { topic: string; schedule?: unknown };
  if (!topic || !topic.trim()) {
    return NextResponse.json({ error: "موضوع الزامی است" }, { status: 400 });
  }
  const cleanTopic = clampText(topic.trim(), 120);

  const cleanSchedule = parseSchedule(schedule);
  if (schedule && !cleanSchedule) {
    return NextResponse.json({ error: "برنامه‌ی زمانی معتبر نیست" }, { status: 400 });
  }

  let generated;
  try {
    generated = await generateRoadmap(cleanTopic, userId, cleanSchedule ?? undefined);
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
      schedule: (cleanSchedule as any) ?? undefined,
      generatedByAi: true,
    },
  });

  return NextResponse.json({ ok: true, roadmap });
}
