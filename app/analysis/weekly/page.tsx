import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { ModuleKey } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isFeatureEnabled } from "@/lib/featureFlagsServer";
import { buildLiveWeek } from "@/lib/weeklyLetter/live";
import { resolveWeekOffset } from "@/lib/weeklyLetter/weekParam";
import { getWeekRange, safeTimezone } from "@/lib/weeklyAnalysis/week";
import type { LiveWeekPayload } from "@/lib/weeklyLetter/types";
import { WeeklyLetterReader } from "@/components/WeeklyLetterReader";

// صفحه‌ی فقط‌ورودیه، پس ایندکس نمی‌شه (هم‌الگوی /dashboard و بقیه‌ی صفحه‌های حساب).
export const metadata: Metadata = {
  title: "آنالیز هفتگی",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type SP = { week?: string; offset?: string; story?: string };

/**
 * آنالیز هفتگی = خواننده‌ی زنده: هفته با ?week=YYYY-MM-DD (شنبه) انتخاب می‌شه،
 * ?offset=N قدیمی هم کار می‌کنه، بدون پارامتر = هفته‌ی جاری.
 * گیت (سشن + فلگ + دسترسی ماژول) و داده‌ی هفته‌ی اول همین‌جا سمت سرور ساخته و
 * همراه HTML فرستاده می‌شن تا اولین رندر محتوا داشته باشه. اگه چیزی نشد
 * (دسترسی نداره، خطا)، initial=null می‌ره و کلاینت با گیت‌های خودش و fetch
 * ادامه می‌ده؛ پس این‌جا فقط «شتاب» اضافه شده و تصمیم امنیتی تازه‌ای نیست
 * (روت API همچنان requireModule + featureBlocked داره).
 */
export default async function WeeklyAnalysisPage({ searchParams }: { searchParams?: SP }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; isSuperAdmin?: boolean } | undefined;
  const userId = user?.id;
  const query = { week: searchParams?.week ?? null, offset: searchParams?.offset ?? null };
  if (!userId) return <WeeklyLetterReader gate="guest" initial={null} query={query} currentWeek={null} />;

  let initial: LiveWeekPayload | null = null;
  let currentWeek: string | null = null;
  try {
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
    if (db) {
      const tz = safeTimezone(db.timezone);
      currentWeek = getWeekRange(tz, 0).weekStartIso;
      const access = db.moduleAccess[0];
      const hasModule = !!db.isSuperAdmin || (!!access && access.active && (!access.expiresAt || access.expiresAt.getTime() > Date.now()));
      if (!db.isBlocked && enabled && hasModule) {
        const { offset } = resolveWeekOffset(tz, query);
        initial = await buildLiveWeek(userId, { timezone: tz, isSuperAdmin: !!db.isSuperAdmin, offset });
      }
    }
  } catch (e) {
    // خطای سرور نباید صفحه رو بخوابونه — کلاینت خودش از API می‌گیره
    console.error("[weekly-analysis] ssr", e);
  }
  return <WeeklyLetterReader gate="on" initial={initial} query={query} currentWeek={currentWeek} />;
}
