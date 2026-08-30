import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { requireModule } from "@/lib/moduleAccess";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { getOrGenerateWeeklyReport } from "@/lib/weeklyReport/snapshot";

// POST /api/reports/weekly/refresh  { offset }
// تولیدِ دستیِ دوباره — چون هر بار (اگه داده کافی باشه) واقعاً AI صدا
// می‌زنه، Rate Limit داره تا کاربر نتونه با کلیکِ مکرر هزینه بسازه (بندِ ۹۰).
export async function POST(req: NextRequest) {
  const guard = await requireModule(ModuleKey.AI_INSIGHT);
  if (!guard.ok) return guard.response;

  if (!guard.isSuperAdmin && !checkRateLimit(`weekly-report-refresh:${guard.userId}`, 5, 24 * 60 * 60 * 1000)) {
    return NextResponse.json({ error: "تعداد تلاش‌های تولیدِ دوباره‌ی گزارش امروز تمام شده — فردا دوباره امتحان کن" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const rawOffset = Number(body?.offset ?? 0);
  const offset = Number.isInteger(rawOffset) ? rawOffset : 0;
  if (offset > 0) return NextResponse.json({ error: "هفته‌ی آینده قابل‌انتخاب نیست" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: guard.userId }, select: { timezone: true } });
  const timezone = user?.timezone || "Asia/Tehran";

  const report = await getOrGenerateWeeklyReport(guard.userId, timezone, guard.isSuperAdmin, offset, true);
  return NextResponse.json({ report });
}
