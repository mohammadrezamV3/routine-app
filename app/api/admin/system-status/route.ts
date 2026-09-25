import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { getSystemStatus } from "@/lib/adminAnalytics";

export async function GET() {
  const guard = await requireAdmin("system");
  if (!guard.ok) return guard.response;

  const status = await getSystemStatus();
  return NextResponse.json({ status });
}
