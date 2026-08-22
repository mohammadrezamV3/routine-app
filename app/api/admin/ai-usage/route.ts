import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { rangeFromSearchParams, getAiUsageAnalytics } from "@/lib/adminAnalytics";
import { getAiCostRate } from "@/lib/appSettings";

export async function GET(req: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const range = rangeFromSearchParams(req.nextUrl.searchParams);
  const [usage, costRate] = await Promise.all([getAiUsageAnalytics(range), getAiCostRate()]);
  return NextResponse.json({ usage, costRate, range });
}
