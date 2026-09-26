import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { checkRateLimit } from "@/lib/rateLimit";
import { computeWeeklyAnalysis } from "@/lib/weeklyAnalysis/compute";
import { getWeekRange } from "@/lib/weeklyAnalysis/week";
import { generateAiCoach, isAiAvailable } from "@/lib/weeklyAnalysis/ai";

// POST /api/analysis/weekly/ai { offset } — ساخت/بازسازیِ مربیِ AI برایِ
// یک هفته‌ی مشخص. واقعا گیت‌وی AI رو صدا می‌زنه (هزینه/زمان داره)، پس
// سخت‌گیرانه‌تر از روتِ GET اصلی rate-limit می‌شه.
const MAX_OFFSET_BACK = -52;

// گیت‌وی AI ممکنه تا ~۵۵ ثانیه طول بکشه (lib/aiClient.ts → AI_TOTAL_BUDGET_MS)
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const guard = await requireModule(ModuleKey.AI_INSIGHT);
    if (!guard.ok) return guard.response;
    const { userId, isSuperAdmin } = guard;

    if (!isAiAvailable()) {
      return NextResponse.json({ error: "مربیِ هوش‌مصنوعی در دسترس نیست" }, { status: 503 });
    }

    if (!isSuperAdmin && !(await checkRateLimit(`weekly-analysis-ai:${userId}`, 6, 60 * 60 * 1000))) {
      return NextResponse.json({ error: "تعداد ساخت مربیِ AI امروز/این‌ساعت تمام شده — کمی بعد دوباره امتحان کن" }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const offsetRaw = body?.offset;
    let offset = 0;
    if (offsetRaw !== undefined && offsetRaw !== null) {
      const n = Number(offsetRaw);
      if (!Number.isInteger(n) || n > 0 || n < MAX_OFFSET_BACK) {
        return NextResponse.json({ error: "offset نامعتبر است" }, { status: 400 });
      }
      offset = n;
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
    const timezone = user?.timezone || "Asia/Tehran";

    const analysis = await computeWeeklyAnalysis(userId, { timezone, offset, isSuperAdmin });

    let ai;
    try {
      ai = await generateAiCoach(analysis, userId);
    } catch (err: any) {
      const msg: string = err?.message || "";
      if (msg.includes("ثانیه پاسخ نداد")) {
        return NextResponse.json({ error: "گیت‌وی هوش‌مصنوعی به‌موقع پاسخ نداد" }, { status: 504 });
      }
      return NextResponse.json({ error: msg || "ساخت مربیِ AI شکست خورد" }, { status: 502 });
    }
    if (!ai) {
      return NextResponse.json({ error: "مربیِ هوش‌مصنوعی در دسترس نیست" }, { status: 503 });
    }

    const { weekStart } = getWeekRange(timezone, offset);
    await prisma.weeklyAnalysisAi.upsert({
      where: { userId_weekStart: { userId, weekStart } },
      create: { userId, weekStart, data: ai as any, model: ai.model },
      update: { data: ai as any, model: ai.model },
    });

    return NextResponse.json({ ai });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "خطای غیرمنتظره" }, { status: 500 });
  }
}
