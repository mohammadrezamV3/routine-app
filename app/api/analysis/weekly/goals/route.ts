import { tr } from "@/lib/i18n";
import { featureBlocked } from "@/lib/featureFlagsServer";
import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { checkRateLimit } from "@/lib/rateLimit";
import { clampText } from "@/lib/validate";
import { getWeekRange } from "@/lib/weeklyAnalysis/week";
import { ANALYSIS_DOMAINS, AnalysisDomain } from "@/lib/weeklyAnalysis/types";

const MAX_TITLE_LEN = 80;
const MAX_GOALS_PER_WEEK = 3;

function isValidDomain(v: unknown): v is AnalysisDomain {
  return typeof v === "string" && (ANALYSIS_DOMAINS as string[]).includes(v);
}

// POST /api/analysis/weekly/goals { domain, title, target } — همیشه برای
// هفته‌ی *بعد* هفته‌ی جاری واقعی ساخته می‌شه (نه بر اساس offset ورودی —
// اهداف فقط رو به جلو معنا دارن).
export async function POST(req: NextRequest) {
  try {
    const guard = await requireModule(ModuleKey.AI_INSIGHT);
    if (!guard.ok) return guard.response;
    { const off = await featureBlocked("weeklyAnalysis", guard.userId); if (off) return off; }
    const { userId, isSuperAdmin } = guard;

    if (!isSuperAdmin && !(await checkRateLimit(`weekly-analysis-goal-create:${userId}`, 20, 10 * 60 * 1000))) {
      return NextResponse.json({ error: tr("تعداد درخواست بیش از حد مجاز — کمی صبر کن", "Too many requests — wait a moment") }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));

    const titleRaw = typeof body?.title === "string" ? body.title.trim() : "";
    if (!titleRaw) {
      return NextResponse.json({ error: tr("عنوان هدف الزامی است", "Goal title is required") }, { status: 400 });
    }
    const title = clampText(titleRaw, MAX_TITLE_LEN);

    let domain: AnalysisDomain | null = null;
    if (body?.domain !== undefined && body?.domain !== null) {
      if (!isValidDomain(body.domain)) {
        return NextResponse.json({ error: tr("دامنه نامعتبر است", "Invalid domain") }, { status: 400 });
      }
      domain = body.domain;
    }

    let target: number | null = null;
    if (body?.target !== undefined && body?.target !== null) {
      const n = Number(body.target);
      if (!Number.isInteger(n) || n < 0 || n > 100) {
        return NextResponse.json({ error: tr("target باید عددی بین 0 تا 100 باشد", "target must be a number between 0 and 100") }, { status: 400 });
      }
      target = n;
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
    const timezone = user?.timezone || "Asia/Tehran";
    const { weekStart } = getWeekRange(timezone, 1);

    const existingCount = await prisma.weeklyAnalysisGoal.count({ where: { userId, weekStart } });
    if (existingCount >= MAX_GOALS_PER_WEEK) {
      return NextResponse.json({ error: tr(`حداکثر ${MAX_GOALS_PER_WEEK} هدف برای یک هفته مجاز است`, `Up to ${MAX_GOALS_PER_WEEK} goals are allowed per week`) }, { status: 400 });
    }

    const goal = await prisma.weeklyAnalysisGoal.create({
      data: { userId, weekStart, domain, title, target, status: "ACTIVE" },
    });

    return NextResponse.json({
      goal: {
        id: goal.id,
        weekStart: goal.weekStart.toISOString().slice(0, 10),
        domain: goal.domain,
        title: goal.title,
        target: goal.target,
        status: goal.status,
        achievedScore: goal.achievedScore,
        createdAt: goal.createdAt.toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || tr("خطای غیرمنتظره", "Unexpected error") }, { status: 500 });
  }
}

// DELETE /api/analysis/weekly/goals?id=... — where:{id,userId} تا کاربری
// نتونه هدف کاربر دیگه رو با حدس‌زدن id پاک کنه (IDOR).
export async function DELETE(req: NextRequest) {
  try {
    const guard = await requireModule(ModuleKey.AI_INSIGHT);
    if (!guard.ok) return guard.response;
    { const off = await featureBlocked("weeklyAnalysis", guard.userId); if (off) return off; }
    const { userId } = guard;

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: tr("id الزامی است", "id is required") }, { status: 400 });
    }

    const { count } = await prisma.weeklyAnalysisGoal.deleteMany({ where: { id, userId } });
    if (count === 0) {
      return NextResponse.json({ error: tr("هدف پیدا نشد", "Goal not found") }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || tr("خطای غیرمنتظره", "Unexpected error") }, { status: 500 });
  }
}
