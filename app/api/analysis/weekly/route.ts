import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { checkRateLimit } from "@/lib/rateLimit";
import { getWeeklyAnalysis } from "@/lib/weeklyAnalysis/service";

// GET /api/analysis/weekly?offset=0 — محاسبه‌ی زنده‌ی آنالیز هفتگی (بدون
// فراخوانیِ AI، سریع). offset: ۰ = هفته‌ی جاری، منفی = هفته‌های قبل.
// حداکثر ۵۲ هفته به عقب (یک سال) — بازه‌ی بی‌نهایت یعنی اسکنِ بی‌سقفِ
// جدول‌های کاربر برای هر هفته‌ی دلخواه.
const MAX_OFFSET_BACK = -52;

export async function GET(req: NextRequest) {
  try {
    const guard = await requireModule(ModuleKey.AI_INSIGHT);
    if (!guard.ok) return guard.response;
    const { userId, isSuperAdmin } = guard;

    // سوپریوزر از سقفِ نرخ معافه (هم‌الگویِ بقیه‌ی روت‌های پولی/AI) — چون
    // خودش تیمِ محصوله و باید بتونه پشتِ‌سرهم تست کنه.
    if (!isSuperAdmin && !(await checkRateLimit(`weekly-analysis:${userId}`, 60, 10 * 60 * 1000))) {
      return NextResponse.json({ error: "تعداد درخواست بیش از حد مجاز — کمی صبر کن" }, { status: 429 });
    }

    const offsetRaw = req.nextUrl.searchParams.get("offset");
    let offset = 0;
    if (offsetRaw !== null) {
      const n = Number(offsetRaw);
      if (!Number.isInteger(n) || n > 0 || n < MAX_OFFSET_BACK) {
        return NextResponse.json({ error: "offset نامعتبر است" }, { status: 400 });
      }
      offset = n;
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
    const timezone = user?.timezone || "Asia/Tehran";

    const analysis = await getWeeklyAnalysis(userId, { timezone, offset, isSuperAdmin });
    return NextResponse.json({ analysis });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "خطای غیرمنتظره" }, { status: 500 });
  }
}
