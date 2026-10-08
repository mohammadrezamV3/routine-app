import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { parseAdminRange } from "@/lib/adminRangeParams";
import { getChurn } from "@/lib/adminAnalytics";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin("analytics");
  if (!guard.ok) return guard.response;

  const parsed = parseAdminRange(req.nextUrl.searchParams);
  if (!parsed.ok) return parsed.response;
  const range = parsed.range;
  const churn = await getChurn(range);
  return NextResponse.json({ churn, range });
}
