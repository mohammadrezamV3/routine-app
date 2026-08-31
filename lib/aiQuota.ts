import { prisma } from "@/lib/prisma";
import { AiFeatureKey } from "@prisma/client";

// سقفِ مصرفِ ماهانه‌ی هر فیچرِ AI به‌ازای هر پلن — عدد از پیشِ خودِ کاربر
// (تصمیمِ محصولی، نه یه rate-limitِ فنیِ حدسی): پلنِ بدنسازی ۳ بار ساختِ
// برنامه‌ی تمرینی در ماه، پلنِ مکس ۵ بار. اگه پلنی/فیچری این‌جا نیومده
// (مثلاً پلنِ پایه که اصلاً به این ماژول‌ها دسترسی نداره)، یعنی سقفی روش
// اعمال نمی‌شه — نه این‌که نامحدوده به‌عنوانِ تصمیم، بلکه چون دسترسی از
// اول با requireModule گیت شده.
const AI_FEATURE_MONTHLY_LIMITS: Partial<Record<string, Partial<Record<AiFeatureKey, number>>>> = {
  exercise: { EXERCISE_PLAN_GENERATION: 3 },
  max: { EXERCISE_PLAN_GENERATION: 5 },
};

function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export type QuotaCheckResult = { ok: true } | { ok: false; limit: number; error: string };

/**
 * چک و مصرفِ سهمیه‌ی ماهانه‌ی یک فیچرِ AI برایِ یک کاربر — قبل از فراخوانیِ
 * واقعیِ AI صدا زده می‌شه (نه بعدش)، چون هدف کنترلِ هزینه‌ست: حتی اگه خودِ
 * AI بعداً fail کنه و به قالبِ ایستا fallback بشه، تلاش (و هزینه‌ش) انجام
 * شده. سوپریوزر و کاربرِ بدونِ پلنِ فعالِ شناخته‌شده (edge case — مثلاً
 * ModuleAccess دستیِ ادمین بدونِ Subscription) رد می‌شن، بدونِ سقف — این
 * یه محدودیتِ محصولیه، نه مرزِ امنیتی (خودِ requireModule اون کارو می‌کنه).
 */
export async function checkAndConsumeAiQuota(
  userId: string,
  isSuperAdmin: boolean,
  feature: AiFeatureKey
): Promise<QuotaCheckResult> {
  if (isSuperAdmin) return { ok: true };

  const sub = await prisma.subscription.findFirst({
    where: { userId, status: { in: ["ACTIVE", "TRIAL"] } },
    orderBy: { createdAt: "desc" },
    select: { plan: { select: { key: true } } },
  });
  const limit = sub ? AI_FEATURE_MONTHLY_LIMITS[sub.plan.key]?.[feature] : undefined;
  if (limit === undefined) return { ok: true };

  const yearMonth = currentYearMonth();
  // upsert با increment توی یک عملیاتِ اتمیک — از race شرطِ
  // خواندن-بعد-نوشتن جلوگیری می‌کنه؛ اگه از سقف رد شد، همون incrementِ
  // اضافه رو جبران (decrement) می‌کنیم و رد می‌شیم.
  const quota = await prisma.aiMonthlyQuota.upsert({
    where: { userId_feature_yearMonth: { userId, feature, yearMonth } },
    create: { userId, feature, yearMonth, usedCount: 1, limitCount: limit },
    update: { usedCount: { increment: 1 }, limitCount: limit },
  });

  if (quota.usedCount > limit) {
    await prisma.aiMonthlyQuota.update({ where: { id: quota.id }, data: { usedCount: { decrement: 1 } } }).catch(() => {});
    return { ok: false, limit, error: `این ماه سقفِ استفاده از این امکان (${limit} بار) رو پر کردی — اولِ ماهِ بعد دوباره فعال می‌شه.` };
  }

  return { ok: true };
}
