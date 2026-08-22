import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { rangeFromSearchParams, getChurn } from "@/lib/adminAnalytics";

export async function GET(req: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const range = rangeFromSearchParams(req.nextUrl.searchParams);
  const churn = await getChurn(range);
  return NextResponse.json({ churn, range });
}
