import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { getSystemStatus } from "@/lib/adminAnalytics";

export async function GET() {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const status = await getSystemStatus();
  return NextResponse.json({ status });
}
