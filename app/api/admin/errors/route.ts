import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { getErrorLogs } from "@/lib/adminAnalytics";

const VALID_SEVERITIES = ["WARNING", "ERROR", "CRITICAL"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const sp = req.nextUrl.searchParams;
  const severityParam = sp.get("severity");
  const severity = severityParam && (VALID_SEVERITIES as readonly string[]).includes(severityParam) ? (severityParam as (typeof VALID_SEVERITIES)[number]) : undefined;

  const result = await getErrorLogs({ severity, page: Number(sp.get("page")) || 1, pageSize: Number(sp.get("pageSize")) || 30 });
  return NextResponse.json(result);
}
