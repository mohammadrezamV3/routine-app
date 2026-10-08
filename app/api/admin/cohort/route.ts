import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { getCohort } from "@/lib/adminAnalytics";

export async function GET() {
  const guard = await requireAdmin("analytics");
  if (!guard.ok) return guard.response;

  const cohorts = await getCohort(6);
  return NextResponse.json({ cohorts });
}
