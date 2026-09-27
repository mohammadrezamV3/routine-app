import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { parseAdminRange } from "@/lib/adminRangeParams";
import { getRevenueAnalytics } from "@/lib/adminAnalytics";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin("finance");
  if (!guard.ok) return guard.response;

  const parsed = parseAdminRange(req.nextUrl.searchParams);
  if (!parsed.ok) return parsed.response;
  const range = parsed.range;
  const revenue = await getRevenueAnalytics(range);
  return NextResponse.json({ revenue, range });
}
