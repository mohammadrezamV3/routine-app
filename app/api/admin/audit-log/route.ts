import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { getAuditLog } from "@/lib/adminAnalytics";

export async function GET(req: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const sp = req.nextUrl.searchParams;
  const result = await getAuditLog({ page: Number(sp.get("page")) || 1, pageSize: Number(sp.get("pageSize")) || 30 });
  return NextResponse.json(result);
}
