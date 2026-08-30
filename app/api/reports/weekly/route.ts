import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { requireModule } from "@/lib/moduleAccess";
import { prisma } from "@/lib/prisma";
import { getOrGenerateWeeklyReport } from "@/lib/weeklyReport/snapshot";

// GET /api/reports/weekly?offset=0  → offset=0 هفته‌ی جاری، -1 هفته‌ی قبل، ...
// هفته‌ی آینده (offset>0) مجاز نیست.
export async function GET(req: NextRequest) {
  const guard = await requireModule(ModuleKey.AI_INSIGHT);
  if (!guard.ok) return guard.response;

  const rawOffset = Number(req.nextUrl.searchParams.get("offset") || "0");
  const offset = Number.isInteger(rawOffset) ? rawOffset : 0;
  if (offset > 0) return NextResponse.json({ error: "هفته‌ی آینده قابل‌انتخاب نیست" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: guard.userId }, select: { timezone: true } });
  const timezone = user?.timezone || "Asia/Tehran";

  const report = await getOrGenerateWeeklyReport(guard.userId, timezone, guard.isSuperAdmin, offset);
  return NextResponse.json({ report });
}
