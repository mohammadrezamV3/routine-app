import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { parseAdminRange } from "@/lib/adminRangeParams";
import { getOverviewKpis, getUserGrowthSeries, getPlanBreakdown } from "@/lib/adminAnalytics";
import { buildOverview } from "@/lib/adminOverviewServer";
import { parseDashRange } from "@/lib/adminOverview";
import { hasPermission } from "@/lib/adminPermissions";
import { tr } from "@/lib/i18n";

// GET /api/admin/overview?range=today|7d|30d|90d
// داشبورد /admin: هر ادمینی می‌تونه صداش کنه ولی هر بخش فقط با دسترسی
// مربوطه پر می‌شه (users.view، finance، subscriptions، analytics، support،
// mentors، chat، system). فیلدهای قدیمی (kpis قدیمی/growthSeries/planBreakdown)
// فقط با دسترسی analytics و فقط وقتی پارامتر legacy=1 باشه میان.
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const sp = req.nextUrl.searchParams;
  if (sp.get("legacy") === "1") {
    if (!hasPermission(guard, "analytics")) return NextResponse.json({ error: tr("به این بخش دسترسی نداری", "You don't have access to this section") }, { status: 403 });
    const parsed = parseAdminRange(sp);
    if (!parsed.ok) return parsed.response;
    const [kpis, growthSeries, planBreakdown] = await Promise.all([
      getOverviewKpis(parsed.range),
      getUserGrowthSeries(parsed.range),
      getPlanBreakdown(parsed.range),
    ]);
    return NextResponse.json({ kpis, growthSeries, planBreakdown });
  }

  const dashboard = await buildOverview(guard, parseDashRange(sp.get("range")));
  return NextResponse.json({ dashboard });
}
