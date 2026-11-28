import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { requireModule } from "@/lib/moduleAccess";
import { featureBlocked } from "@/lib/featureFlagsServer";
import { buildCalorie, buildExercise, resolveDay } from "@/lib/dashboardServer";

export const dynamic = "force-dynamic";

/**
 * GET /api/workout/heat?kind=exercise|calorie&date&tz
 * داده‌ی نقشه‌ی ثبات ۹۰ روزه‌ی صفحه‌های /exercise و /calorie (همان محاسبه‌ی
 * داشبورد بخش ورزش؛ فقط داشبورد خودش از GET /api/dashboard می‌خونه).
 * گیت: ماژول پولی + فلگ همون بخش، سمت سرور.
 */
export async function GET(req: NextRequest) {
  const kind = req.nextUrl.searchParams.get("kind") === "calorie" ? "calorie" : "exercise";
  const guard = await requireModule(kind === "calorie" ? ModuleKey.CALORIE : ModuleKey.EXERCISE);
  if (!guard.ok) return guard.response;
  const blocked = await featureBlocked(kind, guard.userId);
  if (blocked) return blocked;

  const day = resolveDay(req.nextUrl.searchParams.get("date"), req.nextUrl.searchParams.get("tz"));
  const ctx = { userId: guard.userId, date: day.date, tz: day.tz };
  if (kind === "calorie") {
    const c = await buildCalorie(ctx);
    return NextResponse.json({ kind, heat: c.heat ?? [], hasTarget: !!c.target }, { headers: { "Cache-Control": "private, no-store" } });
  }
  const e = await buildExercise(ctx);
  return NextResponse.json({ kind, heat: e.heat ?? [], streak: e.streak, hasPlan: e.hasPlan }, { headers: { "Cache-Control": "private, no-store" } });
}
