import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { requireAdmin } from "@/lib/requireAdmin";
import { parseAdminRange } from "@/lib/adminRangeParams";
import { getProductAnalytics } from "@/lib/adminAnalytics";
import { tr } from "@/lib/i18n";

const VALID_MODULES: ModuleKey[] = [ModuleKey.ROUTINE, ModuleKey.EXERCISE, ModuleKey.CALORIE, ModuleKey.TRADE, ModuleKey.ROADMAP];

export async function GET(req: NextRequest, { params }: { params: { module: string } }) {
  const guard = await requireAdmin("analytics");
  if (!guard.ok) return guard.response;

  const moduleKey = params.module.toUpperCase() as ModuleKey;
  if (!VALID_MODULES.includes(moduleKey)) {
    return NextResponse.json({ error: tr("ماژول نامعتبر است", "Invalid module") }, { status: 400 });
  }

  const parsed = parseAdminRange(req.nextUrl.searchParams);
  if (!parsed.ok) return parsed.response;
  const range = parsed.range;
  const analytics = await getProductAnalytics(moduleKey, range);
  return NextResponse.json({ analytics, range });
}
