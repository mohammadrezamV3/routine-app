import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { parseAdminRange } from "@/lib/adminRangeParams";
import { getPlanBreakdown, getRenewalsAndUpgrades } from "@/lib/adminAnalytics";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin("subscriptions");
  if (!guard.ok) return guard.response;

  const parsed = parseAdminRange(req.nextUrl.searchParams);
  if (!parsed.ok) return parsed.response;
  const range = parsed.range;
  const [planBreakdown, renewalsUpgrades] = await Promise.all([getPlanBreakdown(range), getRenewalsAndUpgrades(range)]);
  return NextResponse.json({ planBreakdown, renewalsUpgrades, range });
}
