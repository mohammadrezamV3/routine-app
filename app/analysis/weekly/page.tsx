import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { ModuleKey } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isFeatureEnabled } from "@/lib/featureFlagsServer";
import { getWeeklyAnalysis } from "@/lib/weeklyAnalysis/service";
import type { WeeklyAnalysis } from "@/lib/weeklyAnalysis/types";
import { WeeklyAnalysisClient } from "@/components/WeeklyAnalysisClient";

// صفحه‌ی فقط‌ورودیه، پس ایندکس نمی‌شه (هم‌الگوی /dashboard و بقیه‌ی صفحه‌های حساب).
export const metadata: Metadata = {
  title: "آنالیز هفتگی",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const MAX_OFFSET_BACK = -52; // هم‌سقف GET /api/analysis/weekly

/**
 * سرعت: گیت (سشن + فلگ + دسترسی ماژول) و داده‌ی هفته‌ی اول همین‌جا سمت سرور
 * ساخته و همراه HTML فرستاده می‌شن؛ قبلا کلاینت اول باندل رو لود می‌کرد، بعد
 * /api/features، /api/account و آخر /api/analysis/weekly — سه رفت‌وبرگشت
 * پشت‌سرهم قبل از دیدن هر عدد. اگه چیزی نشد (دسترسی نداره، خطا)، داده‌ی
 * اولیه null می‌ره و کلاینت با گیت‌های خودش و fetch معمولی ادامه می‌ده؛ پس
 * این‌جا فقط «شتاب» اضافه شده و هیچ تصمیم امنیتی تازه‌ای نیست (روت API
 * همچنان requireModule + featureBlocked داره).
 */
export default async function WeeklyAnalysisPage({ searchParams }: { searchParams?: { offset?: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; isSuperAdmin?: boolean } | undefined;
  const userId = user?.id;
  if (!userId) return <WeeklyAnalysisClient gate="guest" initial={null} />;

  let initial: WeeklyAnalysis | null = null;
  try {
    const raw = Number(searchParams?.offset);
    const offset = Number.isInteger(raw) && raw <= 0 && raw >= MAX_OFFSET_BACK ? raw : 0;

    const [db, enabled] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          timezone: true,
          isBlocked: true,
          isSuperAdmin: true,
          moduleAccess: { where: { module: ModuleKey.AI_INSIGHT }, select: { active: true, expiresAt: true } },
        },
      }),
      isFeatureEnabled("weeklyAnalysis", userId),
    ]);
    const access = db?.moduleAccess[0];
    const hasModule = !!db?.isSuperAdmin || (!!access && access.active && (!access.expiresAt || access.expiresAt.getTime() > Date.now()));

    if (db && !db.isBlocked && enabled && hasModule) {
      initial = await getWeeklyAnalysis(userId, { timezone: db.timezone || "Asia/Tehran", offset, isSuperAdmin: !!db.isSuperAdmin });
    }
  } catch (e) {
    // خطای سرور نباید صفحه رو بخوابونه — کلاینت خودش از API می‌گیره
    console.error("[weekly-analysis] ssr", e);
  }
  return <WeeklyAnalysisClient gate="on" initial={initial} />;
}
