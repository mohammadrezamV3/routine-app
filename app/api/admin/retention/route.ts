import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { getRetention } from "@/lib/adminAnalytics";

const VALID_MODULES: ModuleKey[] = [ModuleKey.ROUTINE, ModuleKey.EXERCISE, ModuleKey.CALORIE, ModuleKey.TRADE, ModuleKey.ROADMAP];

export async function GET(req: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const sp = req.nextUrl.searchParams;
  const moduleParam = sp.get("module");
  const module = moduleParam && VALID_MODULES.includes(moduleParam.toUpperCase() as ModuleKey) ? (moduleParam.toUpperCase() as ModuleKey) : undefined;
  const planKey = sp.get("plan") || undefined;

  const retention = await getRetention({ module, planKey });
  return NextResponse.json({ retention });
}
