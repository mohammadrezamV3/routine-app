import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { getCohort } from "@/lib/adminAnalytics";

export async function GET() {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const cohorts = await getCohort(6);
  return NextResponse.json({ cohorts });
}
