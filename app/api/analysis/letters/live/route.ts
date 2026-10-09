import { tr } from "@/lib/i18n";
import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { checkRateLimit } from "@/lib/rateLimit";
import { featureBlocked } from "@/lib/featureFlagsServer";
import { buildLiveWeek } from "@/lib/weeklyLetter/live";
import { MAX_WEEKS_BACK, offsetOfLegacyParam, offsetOfWeekParam } from "@/lib/weeklyLetter/weekParam";

// GET /api/analysis/letters/live?week=YYYY-MM-DD  (یا ?offset=-1؛ بدون پارامتر = هفته‌ی جاری)
// → LiveWeekPayload { letter, analysis, issue, prev, next, weekStart, offset, isCurrent }
// همیشه زنده از getWeeklyAnalysis ساخته می‌شه (هفته‌ی جاری و هفته‌های بدون شماره هم)؛
// بدون فراخوانی AI. سقف: 52 هفته‌ی گذشته، آینده نامعتبره.
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const guard = await requireModule(ModuleKey.AI_INSIGHT);
    if (!guard.ok) return guard.response;
    { const off = await featureBlocked("weeklyAnalysis", guard.userId); if (off) return off; }
    const { userId, isSuperAdmin } = guard;
    if (!isSuperAdmin && !(await checkRateLimit(`weekly-live:${userId}`, 120, 10 * 60 * 1000))) {
      return NextResponse.json({ error: tr("تعداد درخواست بیش از حد مجاز — کمی صبر کن", "Too many requests — wait a moment") }, { status: 429 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
    const timezone = user?.timezone || "Asia/Tehran";

    const sp = req.nextUrl.searchParams;
    const weekRaw = sp.get("week");
    let offset = 0;
    if (weekRaw) {
      const o = offsetOfWeekParam(timezone, weekRaw);
      if (o === null) return NextResponse.json({ error: tr(`هفته نامعتبر است (حداکثر ${MAX_WEEKS_BACK} هفته‌ی گذشته)`, `Invalid week (up to ${MAX_WEEKS_BACK} past weeks)`) }, { status: 400 });
      offset = o;
    } else if (sp.get("offset") !== null) {
      const o = offsetOfLegacyParam(sp.get("offset"));
      if (o === null) return NextResponse.json({ error: tr("offset نامعتبر است", "Invalid offset") }, { status: 400 });
      offset = o;
    }

    const payload = await buildLiveWeek(userId, { timezone, isSuperAdmin, offset });
    return NextResponse.json(payload);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || tr("خطای غیرمنتظره", "Unexpected error") }, { status: 500 });
  }
}
