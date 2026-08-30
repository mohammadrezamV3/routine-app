import { prisma } from "@/lib/prisma";

// منطقِ «ارتقا به مکس» — وقتی کاربر از قبل پلنِ ورزش یا ترید فعال داره و
// می‌خواد مکس بخره: (۱) کلِ قیمتی که برای پلنِ فعلی پرداخت کرده از قیمتِ
// مکس کم می‌شه، (۲) پلنِ مکسِ جدید دقیقاً تا زمانِ انقضای پلنِ فعلی فعاله —
// مگراینکه مدتِ خریداری‌شده‌ی مکس زودتر از اون تموم بشه (اون‌وقت همون مدتِ
// خریداری‌شده حساب می‌شه). این فایل تنها منبعِ این فرمول‌هاست — هم
// پیش‌نمایشِ قیمت (api/plans) و هم چک‌اوتِ واقعی از همین استفاده می‌کنن تا
// هیچ‌وقت از هم جدا نیفتن.
export const UPGRADE_SOURCE_PLAN_KEYS = ["exercise", "trade"] as const;
export const UPGRADE_TARGET_PLAN_KEY = "max";

export type UpgradeSource = {
  subscriptionId: string;
  fromPlanKey: string;
  creditAmount: number; // ریال — مجموعِ مبلغِ واقعاً پرداخت‌شده برای پلنِ فعلی
  currentPeriodEnd: Date;
};

export async function findUpgradeSource(userId: string): Promise<UpgradeSource | null> {
  const sub = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ["ACTIVE", "TRIAL"] },
      currentPeriodEnd: { gt: new Date() },
      plan: { key: { in: [...UPGRADE_SOURCE_PLAN_KEYS] }, market: "IRAN" },
    },
    orderBy: { currentPeriodEnd: "desc" },
    include: { payments: true, plan: { select: { key: true } } },
  });
  if (!sub) return null;
  // عمداً اگه creditAmount صفر باشه (مثلاً پلنِ فعلی با کدِ تخفیفِ ۱۰۰٪
  // رایگان به‌دست اومده) هم null برنمی‌گردونیم — چون سقفِ مدت (بندِ ۲ در
  // توضیحِ بالا) مستقل از مبلغِ اعتباره و باید همچنان اعمال بشه؛ فقط
  // اعتبارِ قیمتی صفر می‌شه.
  const creditAmount = sub.payments.reduce((sum, p) => sum + p.amount, 0);
  return { subscriptionId: sub.id, fromPlanKey: sub.plan.key, creditAmount, currentPeriodEnd: sub.currentPeriodEnd };
}

// قیمتِ نهایی برای یک مدتِ مشخص (بعدِ کسرِ اعتبار) + تاریخِ واقعیِ انقضا
// (سقف‌خورده یا نه). `capped:true` یعنی پلنِ مکس زودتر از مدتِ خریداری‌شده،
// هم‌زمان با پلنِ فعلی تموم می‌شه.
export function computeUpgradePricing(baseAmount: number, source: UpgradeSource, months: number) {
  const amount = Math.max(0, baseAmount - source.creditAmount);
  const candidateEnd = new Date();
  candidateEnd.setMonth(candidateEnd.getMonth() + months);
  const capped = source.currentPeriodEnd.getTime() < candidateEnd.getTime();
  const periodEnd = capped ? source.currentPeriodEnd : candidateEnd;
  return { amount, periodEnd, capped };
}
