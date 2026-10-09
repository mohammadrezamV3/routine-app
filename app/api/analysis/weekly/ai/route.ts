import { tr } from "@/lib/i18n";
import { featureBlocked } from "@/lib/featureFlagsServer";
import { NextRequest, NextResponse } from "next/server";
import { AiFeatureKey, ModuleKey } from "@prisma/client";
import { checkAndConsumeAiQuota } from "@/lib/aiQuota";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { checkRateLimit } from "@/lib/rateLimit";
import { computeWeeklyAnalysis } from "@/lib/weeklyAnalysis/compute";
import { getWeekRange } from "@/lib/weeklyAnalysis/week";
import { generateAiCoach, isAiAvailable } from "@/lib/weeklyAnalysis/ai";

// POST /api/analysis/weekly/ai { offset } — ساخت/بازسازی مربی AI برای
// یک هفته‌ی مشخص. واقعا گیت‌وی AI رو صدا می‌زنه (هزینه/زمان داره)، پس
// سخت‌گیرانه‌تر از روت GET اصلی rate-limit می‌شه.
const MAX_OFFSET_BACK = -52;

// گیت‌وی AI ممکنه تا ~۵۵ ثانیه طول بکشه (lib/aiClient.ts → AI_TOTAL_BUDGET_MS)
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const guard = await requireModule(ModuleKey.AI_INSIGHT);
    if (!guard.ok) return guard.response;
    { const off = await featureBlocked("weeklyAnalysis", guard.userId); if (off) return off; }
    const { userId, isSuperAdmin } = guard;

    if (!isAiAvailable()) {
      return NextResponse.json({ error: tr("مربی هوش‌مصنوعی در دسترس نیست", "The AI coach is not available") }, { status: 503 });
    }

    if (!isSuperAdmin && !(await checkRateLimit(`weekly-analysis-ai:${userId}`, 6, 60 * 60 * 1000))) {
      return NextResponse.json({ error: tr("تعداد ساخت مربی AI امروز/این‌ساعت تمام شده — کمی بعد دوباره امتحان کن", "The AI coach build limit for today or this hour has been reached — try again shortly") }, { status: 429 });
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

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
    const timezone = user?.timezone || "Asia/Tehran";

    const analysis = await computeWeeklyAnalysis(userId, { timezone, offset, isSuperAdmin });

    // سهمیه‌ی AI (سقف کل دوره‌ی آزمایشی برای حساب تازه — lib/trial.ts)
    const quota = await checkAndConsumeAiQuota(userId, isSuperAdmin, AiFeatureKey.WEEKLY_COACH_REPORT);
    if (!quota.ok) return NextResponse.json({ error: quota.error, code: quota.code }, { status: 429 });

    let ai;
    try {
      ai = await generateAiCoach(analysis, userId);
    } catch (err: any) {
      await quota.release();
      const msg: string = err?.message || "";
      if (msg.includes("ثانیه پاسخ نداد") || msg.includes("did not respond within")) {
        return NextResponse.json({ error: tr("گیت‌وی هوش‌مصنوعی به‌موقع پاسخ نداد", "The AI gateway did not respond in time") }, { status: 504 });
      }
      return NextResponse.json({ error: msg || tr("ساخت مربی AI شکست خورد", "Building the AI coach failed") }, { status: 502 });
    }
    if (!ai) {
      await quota.release();
      return NextResponse.json({ error: tr("مربی هوش‌مصنوعی در دسترس نیست", "The AI coach is not available") }, { status: 503 });
    }

    const { weekStart } = getWeekRange(timezone, offset);
    await prisma.weeklyAnalysisAi.upsert({
      where: { userId_weekStart: { userId, weekStart } },
      create: { userId, weekStart, data: ai as any, model: ai.model },
      update: { data: ai as any, model: ai.model },
    });

    return NextResponse.json({ ai });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || tr("خطای غیرمنتظره", "Unexpected error") }, { status: 500 });
  }
}
