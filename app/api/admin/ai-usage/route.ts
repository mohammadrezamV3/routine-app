import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { parseAdminRange } from "@/lib/adminRangeParams";
import { getAiUsageAnalytics } from "@/lib/adminAnalytics";
import { getAiCostRate } from "@/lib/appSettings";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin("ai_usage");
  if (!guard.ok) return guard.response;

  const parsed = parseAdminRange(req.nextUrl.searchParams);
  if (!parsed.ok) return parsed.response;
  const range = parsed.range;
  const [usage, costRate] = await Promise.all([getAiUsageAnalytics(range), getAiCostRate()]);
  return NextResponse.json({ usage, costRate, range });
}
