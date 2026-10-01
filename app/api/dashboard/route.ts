import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminFlags } from "@/lib/adminFlag";
import { checkRateLimit } from "@/lib/rateLimit";
import { featureBlocked } from "@/lib/featureFlagsServer";
import { buildDashboard, resolveDay } from "@/lib/dashboardServer";

export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard?date=YYYY-MM-DD&tz=<دقیقه شرق UTC>
 *
 * همه‌ی خلاصه‌های داشبورد در یک درخواست (یک چک سشن + کوئری‌های موازی) —
 * همون منطق /api/bootstrap: تعداد درخواست گلوگاهه، نه دیتابیس.
 * پشت فلگ `dashboard` (پیش‌فرض روشن برای همه). هر بخش پولی جدا با دسترسی
 * واقعی دیتابیسی گیت می‌شه و بدون دسترسی null برمی‌گرده (lib/dashboardServer.ts).
 * بار اول همین داده سمت سرور در خود صفحه رندر می‌شه (app/dashboard/page.tsx)؛
 * این روت برای تازه‌سازی‌های بعدیه.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const blocked = await featureBlocked("dashboard", userId);
  if (blocked) return blocked;

  const flags = await getAdminFlags(userId);
  if (!flags?.isSuperAdmin && !(await checkRateLimit(`dashboard:${userId}`, 120, 10 * 60 * 1000))) {
    return NextResponse.json({ error: "درخواست‌ها زیاد شد؛ کمی بعد دوباره امتحان کن" }, { status: 429 });
  }

  const day = resolveDay(req.nextUrl.searchParams.get("date"), req.nextUrl.searchParams.get("tz"));
  const data = await buildDashboard(userId, day);
  if (data === "notfound") return NextResponse.json({ error: "not found" }, { status: 404 });
  if (data === "blocked") return NextResponse.json({ error: "حساب کاربری مسدود شده است" }, { status: 403 });
  return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
}
