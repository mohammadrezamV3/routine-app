import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { rangeFromSearchParams, getOverviewKpis, getUserGrowthSeries, getPlanBreakdown } from "@/lib/adminAnalytics";

export async function GET(req: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const range = rangeFromSearchParams(req.nextUrl.searchParams);
  const [kpis, growthSeries, planBreakdown] = await Promise.all([
    getOverviewKpis(range),
    getUserGrowthSeries(range),
    getPlanBreakdown(range),
  ]);

  return NextResponse.json({ kpis, growthSeries, planBreakdown });
}
