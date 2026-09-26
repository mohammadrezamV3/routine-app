import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { rangeFromSearchParams, getFunnel } from "@/lib/adminAnalytics";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin("analytics");
  if (!guard.ok) return guard.response;

  const range = rangeFromSearchParams(req.nextUrl.searchParams);
  const steps = await getFunnel(range);
  return NextResponse.json({ steps, range });
}
