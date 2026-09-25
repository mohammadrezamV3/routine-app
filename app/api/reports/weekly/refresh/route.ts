import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { requireModule } from "@/lib/moduleAccess";
import { refreshWeeklyReportForUser } from "@/lib/mobileSocialWeekly";

// POST /api/reports/weekly/refresh  { offset }
// تولید دستی دوباره — چون هر بار (اگه داده کافی باشه) واقعا AI صدا
// می‌زنه، Rate Limit داره تا کاربر نتونه با کلیک مکرر هزینه بسازه (بند ۹۰).
// (lib/mobileSocialWeekly.ts — مشترک با موبایل)
export async function POST(req: NextRequest) {
  const guard = await requireModule(ModuleKey.AI_INSIGHT);
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => ({}));
  const r = await refreshWeeklyReportForUser(guard.userId, guard.isSuperAdmin, body?.offset ?? 0, false);
  const out = r.body as { error?: string; report?: unknown };
  return NextResponse.json(out.error ? { error: out.error } : { report: out.report }, { status: r.status });
}
