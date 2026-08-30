import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { requireModule } from "@/lib/moduleAccess";
import { prisma } from "@/lib/prisma";
import { getUserWeekRange } from "@/lib/weeklyReport/weekRange";
import { Domain, DOMAINS, DOMAIN_MODULE, computeSingleDomainMetric, resolveActiveModules } from "@/lib/weeklyReport/metrics";
import { getOrGenerateWeeklyReport } from "@/lib/weeklyReport/snapshot";

// GET /api/reports/weekly/:domain?offset=0 — جزئیاتِ خامِ یک دامنه (برای
// صفحه‌ی جزئیات)، به‌همراه مقایسه‌ی از‌قبل‌محاسبه‌شده‌ی همون هفته از Snapshot.
export async function GET(req: NextRequest, { params }: { params: { domain: string } }) {
  const guard = await requireModule(ModuleKey.AI_INSIGHT);
  if (!guard.ok) return guard.response;

  const domain = params.domain as Domain;
  if (!DOMAINS.includes(domain)) {
    return NextResponse.json({ error: "دامنه‌ی نامعتبر" }, { status: 400 });
  }

  const rawOffset = Number(req.nextUrl.searchParams.get("offset") || "0");
  const offset = Number.isInteger(rawOffset) ? rawOffset : 0;
  if (offset > 0) return NextResponse.json({ error: "هفته‌ی آینده قابل‌انتخاب نیست" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: guard.userId }, select: { timezone: true } });
  const timezone = user?.timezone || "Asia/Tehran";

  const [report, moduleAccess] = await Promise.all([
    getOrGenerateWeeklyReport(guard.userId, timezone, guard.isSuperAdmin, offset),
    prisma.moduleAccess.findMany({ where: { userId: guard.userId }, select: { module: true, active: true, expiresAt: true } }),
  ]);

  const activeModules = resolveActiveModules(guard.isSuperAdmin, moduleAccess);
  const week = getUserWeekRange(timezone, new Date(), offset);
  const metric = await computeSingleDomainMetric(domain, guard.userId, week, activeModules);

  return NextResponse.json({
    domain,
    weekStart: report.weekStart,
    weekEnd: report.weekEnd,
    active: activeModules.has(DOMAIN_MODULE[domain]),
    metric,
    comparison: report.comparison[domain],
  });
}
