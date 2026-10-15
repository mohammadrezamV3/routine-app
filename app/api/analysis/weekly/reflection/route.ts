import { tr } from "@/lib/i18n";
import { featureBlocked } from "@/lib/featureFlagsServer";
import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { checkRateLimit } from "@/lib/rateLimit";
import { clampText } from "@/lib/validate";
import { getWeekRange } from "@/lib/weeklyAnalysis/week";

const MAX_TEXT_LEN = 500;
const MAX_OFFSET_BACK = -52;

// PUT /api/analysis/weekly/reflection { offset, wentWell, improve, mood } —
// upsert؛ متن ریفلکشن هیچ‌وقت به مدل AI فرستاده نمی‌شه (lib/weeklyAnalysis/ai.ts).
export async function PUT(req: NextRequest) {
  try {
    const guard = await requireModule(ModuleKey.AI_INSIGHT);
    if (!guard.ok) return guard.response;
    { const off = await featureBlocked("weeklyAnalysis", guard.userId); if (off) return off; }
    const { userId, isSuperAdmin } = guard;

    if (!isSuperAdmin && !(await checkRateLimit(`weekly-analysis-reflection:${userId}`, 30, 10 * 60 * 1000))) {
      return NextResponse.json({ error: tr("تعداد درخواست بیش از حد مجاز — کمی صبر کن", "Too many requests — wait a moment") }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));

    const offsetRaw = body?.offset;
    let offset = 0;
    if (offsetRaw !== undefined && offsetRaw !== null) {
      const n = Number(offsetRaw);
      if (!Number.isInteger(n) || n > 0 || n < MAX_OFFSET_BACK) {
        return NextResponse.json({ error: tr("offset نامعتبر است", "Invalid offset") }, { status: 400 });
      }
      offset = n;
    }

    const wentWellRaw = typeof body?.wentWell === "string" ? body.wentWell : "";
    const improveRaw = typeof body?.improve === "string" ? body.improve : "";
    const wentWell = clampText(wentWellRaw, MAX_TEXT_LEN);
    const improve = clampText(improveRaw, MAX_TEXT_LEN);

    let mood: number | null = null;
    if (body?.mood !== undefined && body?.mood !== null) {
      const n = Number(body.mood);
      if (!Number.isInteger(n) || n < 1 || n > 5) {
        return NextResponse.json({ error: tr("mood باید عددی بین 1 تا 5 باشد", "mood must be a number between 1 and 5") }, { status: 400 });
      }
      mood = n;
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
    const timezone = user?.timezone || "Asia/Tehran";
    const { weekStart } = getWeekRange(timezone, offset);

    const row = await prisma.weeklyReflection.upsert({
      where: { userId_weekStart: { userId, weekStart } },
      create: { userId, weekStart, wentWell, improve, mood },
      update: { wentWell, improve, mood },
    });

    return NextResponse.json({
      reflection: { wentWell: row.wentWell, improve: row.improve, mood: row.mood, updatedAt: row.updatedAt.toISOString() },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || tr("خطای غیرمنتظره", "Unexpected error") }, { status: 500 });
  }
}
