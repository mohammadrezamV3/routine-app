import type { Metadata } from "next";
import { tr } from "@/lib/i18n";
import { redirect } from "next/navigation";
import { getSessionFast } from "@/lib/serverSession";
import { prisma } from "@/lib/prisma";
import { isFeatureEnabled, serverHomePath } from "@/lib/featureFlagsServer";
import { buildDashboard, dashboardKey, dayInTimezone } from "@/lib/dashboardServer";
import { DashboardClient, type DashboardGate } from "@/components/DashboardClient";

// صفحه‌ی فقط‌ورودیه، پس ایندکس نمی‌شه (هم‌الگوی /admin و بقیه‌ی صفحه‌های حساب).
export function generateMetadata(): Metadata {
  return {
    title: tr("داشبورد", "Dashboard"),
    robots: { index: false, follow: false },
  };
}
export const dynamic = "force-dynamic";

/**
 * سرعت: گیت (سشن + فلگ) و داده کامل داشبورد همین‌جا سمت سرور ساخته و
 * همراه خود HTML فرستاده می‌شن. قبلا کلاینت اول باندل رو لود می‌کرد، بعد
 * /api/features، بعد /api/dashboard — سه رفت‌وبرگشت پشت‌سرهم قبل از دیدن هر
 * عدد. حالا صفحه با داده‌ی کامل رندر می‌شه و کلاینت فقط تازه‌سازی‌های بعدی رو می‌زنه.
 * «امروز» از منطقه‌ی زمانی حساب کاربر حساب می‌شه؛ اگه با مرورگر فرق کنه،
 * کلاینت خودش یک بار با تاریخ مرورگر دوباره می‌گیره.
 */
export default async function DashboardPage() {
  const session = await getSessionFast();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return <DashboardClient gate="guest" initial={null} />;

  // فلگ برای این کاربر خاموشه (ادمین عمدا خاموشش کرده) → صفحه‌ی اصلی قبلی، نه
  // صفحه‌ی قفل؛ چون /dashboard حالا مقصد پیش‌فرض بعد از ورود و fallback
  // lib/homePath.ts هم هست، کاربر هیچ‌وقت نباید این‌جا پشت قفل بمونه.
  // روتین هم خاموش باشه → پنل کاربری (serverHomePath)
  // منطقه‌ی زمانی با گیت فلگ مستقله → هم‌زمان (یک رفت‌وبرگشت دیتابیس کمتر)
  const tzPromise = prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } }).catch(() => null);
  if (!(await isFeatureEnabled("dashboard", userId))) redirect(await serverHomePath(userId));

  let initial: { key: string; data: Awaited<ReturnType<typeof buildDashboard>> } | null = null;
  let gate: DashboardGate = "on";
  try {
    const u = await tzPromise;
    const day = dayInTimezone(u?.timezone);
    const data = await buildDashboard(userId, day);
    if (data === "blocked" || data === "notfound") gate = "off";
    else initial = { key: dashboardKey(day), data };
  } catch (e) {
    // خطای سرور نباید صفحه رو بخوابونه — کلاینت خودش از /api/dashboard می‌گیره
    console.error("[dashboard] ssr", e);
  }
  return <DashboardClient gate={gate} initial={initial && typeof initial.data === "object" ? { key: initial.key, data: initial.data } : null} />;
}
