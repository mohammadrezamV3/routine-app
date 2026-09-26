import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { rangeFromSearchParams, getRevenueAnalytics } from "@/lib/adminAnalytics";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin("finance");
  if (!guard.ok) return guard.response;

  const range = rangeFromSearchParams(req.nextUrl.searchParams);
  const revenue = await getRevenueAnalytics(range);
  return NextResponse.json({ revenue, range });
}
