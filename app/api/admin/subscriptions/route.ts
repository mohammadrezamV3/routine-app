import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { rangeFromSearchParams, getPlanBreakdown, getRenewalsAndUpgrades } from "@/lib/adminAnalytics";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin("subscriptions");
  if (!guard.ok) return guard.response;

  const range = rangeFromSearchParams(req.nextUrl.searchParams);
  const [planBreakdown, renewalsUpgrades] = await Promise.all([getPlanBreakdown(range), getRenewalsAndUpgrades(range)]);
  return NextResponse.json({ planBreakdown, renewalsUpgrades, range });
}
