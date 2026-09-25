import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { requireModule } from "@/lib/moduleAccess";
import { getWeeklyReportForUser } from "@/lib/mobileSocialWeekly";

// GET /api/reports/weekly?offset=0  → offset=0 هفته‌ی جاری، -1 هفته‌ی قبل، ...
// هفته‌ی آینده (offset>0) مجاز نیست.
// سقفِ نرخ (این روت واقعا AI صدا می‌زند) و ترجمه‌ی خطای AI به JSON در
// lib/mobileSocialWeekly.ts است — مشترک با /api/mobile/social/weekly-report.
export async function GET(req: NextRequest) {
  const guard = await requireModule(ModuleKey.AI_INSIGHT);
  if (!guard.ok) return guard.response;

  const r = await getWeeklyReportForUser(guard.userId, guard.isSuperAdmin, req.nextUrl.searchParams.get("offset") || "0");
  const body = r.body as { error?: string; report?: unknown };
  return NextResponse.json(body.error ? { error: body.error } : { report: body.report }, { status: r.status });
}
