import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { generateRoadmap } from "@/lib/aiClient";
import { parseAnswers, parseProfile } from "@/lib/roadmapInput";
import { checkRateLimit } from "@/lib/rateLimit";

// تولید رودمپ تا ۵۵ ثانیه طول می‌کشه (AI_TOTAL_BUDGET_MS) — بدون این،
// روی هاست‌هایی که فانکشن سرورلس رو خودکار قطع می‌کنن (مثل Vercel، سقف
// پیش‌فرض ۱۰-۱۵ ثانیه‌ست)، دقیقاً وسط تولید قطع می‌شه و کلاینت به‌جای
// جواب سرور یه قطعیِ خامِ اتصال می‌بینه («ارتباط برقرار نشد»).
export const maxDuration = 60;

const LIMIT = 6;
const WINDOW_MS = 30 * 60_000;

export async function GET() {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const roadmaps = await prisma.roadmap.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, topic: true, title: true, note: true, createdAt: true,
      totalWeeks: true, level: true, progress: true, stations: true,
    },
  });

  // درصدِ پیشرفت همین‌جا حساب می‌شود نه در کلاینت: لیست فقط همین یک عدد را
  // لازم دارد، و فرستادنِ کلِ stations (که چند کیلوبایت JSON است) فقط
  // برای شمردنِ مرحله‌ها اتلافِ پهنای باند است.
  const list = roadmaps.map((r) => {
    const stations = Array.isArray(r.stations) ? (r.stations as any[]) : [];
    const progress = (r.progress as Record<string, boolean> | null) || {};
    const total = stations.length;
    const done = stations.filter((_, i) => progress[String(i)]).length;
    return {
      id: r.id,
      topic: r.topic,
      title: r.title,
      note: r.note,
      createdAt: r.createdAt,
      totalWeeks: r.totalWeeks,
      level: r.level,
      stationCount: total,
      doneCount: done,
      pct: total ? Math.round((done / total) * 100) : 0,
    };
  });

  return NextResponse.json({ roadmaps: list });
}

/**
 * مرحله‌ی ۲: ساختِ خودِ مسیر با جوابِ سوال‌های مرحله‌ی ۱.
 *
 * سوال/جواب‌ها هم کنارِ مسیر ذخیره می‌شوند — هم برای نمایش («این مسیر بر
 * چه اساسی ساخته شد») و هم اگر بعداً بخواهیم مسیر را بازتولید کنیم.
 */
export async function POST(req: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  if (!(await checkRateLimit(`roadmap-create:${userId}`, LIMIT, WINDOW_MS))) {
    return NextResponse.json({ error: "تعداد ساختِ مسیر زیاد شد — کمی بعد دوباره تلاش کن" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = parseProfile(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const profile = parsed.profile;
  const answers = parseAnswers(body?.answers);

  let generated;
  try {
    generated = await generateRoadmap(profile, answers, userId);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "خطا در ساخت رودمپ" }, { status: 500 });
  }

  let roadmap;
  try {
    roadmap = await prisma.roadmap.create({
      data: {
        userId,
        topic: profile.topic,
        goal: profile.goal ?? null,
        title: generated.title,
        note: generated.note,
        outcome: generated.outcome ?? null,
        stations: generated.stations as any,
        tracks: generated.tracks as any,
        certifications: generated.certifications as any,
        projects: generated.projects as any,
        tips: generated.tips as any,
        proTips: generated.pro as any,
        books: generated.books as any,
        mistakes: generated.mistakes as any,
        answers: answers as any,
        level: generated.level ?? profile.level ?? null,
        totalWeeks: generated.totalWeeks ?? null,
        deadlineMonths: profile.deadlineMonths ?? null,
        resourceLang: profile.resourceLang ?? null,
        budget: profile.budget ?? null,
        learnStyle: profile.learnStyle ?? null,
        schedule: (profile.schedule as any) ?? undefined,
        generatedByAi: true,
      },
      select: { id: true, title: true },
    });
  } catch (err) {
    // اگه دیتابیس migrationِ ستون‌های جدید رو نداشته باشه، این کوئری با
    // خطای «column does not exist» شکست می‌خوره — نه یه باگِ منطقی. AI
    // قبلاً صدا زده شده (هزینه متحمل شده)، پس حداقل یه پیامِ روشن بده.
    console.error("roadmap.create failed", err);
    return NextResponse.json(
      { error: "ذخیره‌ی رودمپ در دیتابیس شکست خورد — احتمالاً دیتابیس migration ندارد (prisma migrate deploy لازمه)" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, roadmap });
}
