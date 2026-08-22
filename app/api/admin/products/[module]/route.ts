import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { rangeFromSearchParams, getProductAnalytics } from "@/lib/adminAnalytics";

const VALID_MODULES: ModuleKey[] = [ModuleKey.ROUTINE, ModuleKey.EXERCISE, ModuleKey.CALORIE, ModuleKey.TRADE, ModuleKey.ROADMAP];

export async function GET(req: NextRequest, { params }: { params: { module: string } }) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const moduleKey = params.module.toUpperCase() as ModuleKey;
  if (!VALID_MODULES.includes(moduleKey)) {
    return NextResponse.json({ error: "ماژول نامعتبر است" }, { status: 400 });
  }

  const range = rangeFromSearchParams(req.nextUrl.searchParams);
  const analytics = await getProductAnalytics(moduleKey, range);
  return NextResponse.json({ analytics, range });
}
