import { prisma } from "@/lib/prisma";
import { AiFeatureKey } from "@prisma/client";
import { getAppSetting } from "@/lib/appSettings";
import {
  TRIAL_AI_FEATURES, TRIAL_AI_LIMITS_SETTING_KEY, TRIAL_MS,
  normalizeTrialAiLimits, type TrialAiFeature, type TrialAiLimits,
} from "@/lib/trial";

// سقف مصرف ماهانه‌ی هر فیچر AI به‌ازای هر پلن — عدد از پیش خود کاربر
// (تصمیم محصولی، نه یه rate-limit فنی حدسی): پلن بدنسازی ۳ بار ساخت
// برنامه‌ی تمرینی در ماه، پلن مکس ۵ بار. اگه پلنی/فیچری این‌جا نیومده
// (مثلا پلن پایه که اصلا به این ماژول‌ها دسترسی نداره)، یعنی سقفی روش
// اعمال نمی‌شه — نه این‌که نامحدوده به‌عنوان تصمیم، بلکه چون دسترسی از
// اول با requireModule گیت شده.
const AI_FEATURE_MONTHLY_LIMITS: Partial<Record<string, Partial<Record<AiFeatureKey, number>>>> = {
  exercise: { EXERCISE_PLAN_GENERATION: 3 },
  max: { EXERCISE_PLAN_GENERATION: 5 },
};

function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * سقف‌های تریال: پیش‌فرض‌های lib/trial.ts، قابلِ تغییر از پنلِ ادمین
 * (AppSetting با کلیدِ TRIAL_AI_LIMITS_SETTING_KEY).
 */
export async function getTrialAiLimits(): Promise<TrialAiLimits> {
  return normalizeTrialAiLimits(await getAppSetting<unknown>(TRIAL_AI_LIMITS_SETTING_KEY, null));
}

/**
 * شمارنده‌ی تریال روی همان جدولِ AiMonthlyQuota می‌نشیند، با «ماه»ِ ثابتِ
 * "trial" — یک دوره‌ی آزمایشی فقط یک بار پیش می‌آید، پس یک ردیف به‌ازای
 * هر فیچر کافی است و کلیدِ یکتای (userId, feature, yearMonth) همان اتمی‌بودنِ
 * upsert را این‌جا هم می‌دهد.
 */
const TRIAL_BUCKET = "trial";

export type QuotaCheckResult =
  | { ok: true; release: () => Promise<void> }
  | { ok: false; limit: number; error: string; code: "monthly_limit" | "trial_ai_limit" };

const NOOP_RELEASE = async () => {};

/**
 * چک و مصرف سهمیه‌ی یک فیچر AI برای یک کاربر — قبل از فراخوانی
 * واقعی AI صدا زده می‌شه (نه بعدش)، چون هدف کنترل هزینه‌ست. اگه خود
 * فراخوانی شکست خورد و کاربر هیچ خروجی‌ای نگرفت، روت می‌تونه با
 * `release()` همون یک واحد رو پس بده (مهم برای سقف‌های کوچیکِ تریال).
 *
 *   • سوپریوزر → بدون سقف
 *   • اشتراکِ فعال (ACTIVE/TRIAL و منقضی‌نشده) → سقفِ ماهانه‌ی پلن، اگه تعریف شده
 *   • بدون اشتراک و حسابِ کمتر از TRIAL_DAYS روزه → سقفِ *کلِ* دوره‌ی آزمایشی
 *   • بقیه (مثلا ModuleAccess دستیِ ادمین) → بدون سقف
 *
 * این یه محدودیت محصولیه، نه مرز امنیتی — دسترسی رو خودِ requireModule می‌سنجه.
 */
export async function checkAndConsumeAiQuota(
  userId: string,
  isSuperAdmin: boolean,
  feature: AiFeatureKey
): Promise<QuotaCheckResult> {
  if (isSuperAdmin) return { ok: true, release: NOOP_RELEASE };

  const sub = await prisma.subscription.findFirst({
    where: { userId, status: { in: ["ACTIVE", "TRIAL"] }, currentPeriodEnd: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { plan: { select: { key: true } } },
  });

  let limit: number | undefined;
  let bucket: string;
  let isTrial = false;
  if (sub) {
    limit = AI_FEATURE_MONTHLY_LIMITS[sub.plan.key]?.[feature];
    bucket = currentYearMonth();
  } else {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } });
    isTrial = !!user && Date.now() - user.createdAt.getTime() < TRIAL_MS;
    if (isTrial && (TRIAL_AI_FEATURES as string[]).includes(feature)) {
      limit = (await getTrialAiLimits())[feature as TrialAiFeature];
    }
    bucket = TRIAL_BUCKET;
  }
  if (limit === undefined) return { ok: true, release: NOOP_RELEASE };

  const denied = (): QuotaCheckResult =>
    isTrial
      ? {
          ok: false,
          limit: limit!,
          code: "trial_ai_limit",
          error:
            limit! > 0
              ? `سهمیه‌ی هوش مصنوعیِ دوره‌ی آزمایشی برای این بخش (${limit} بار) تموم شد. برای استفاده‌ی بیشتر، از صفحه‌ی «اشتراک» یکی از پلن‌ها رو فعال کن.`
              : "این امکانِ هوش مصنوعی توی دوره‌ی آزمایشی فعال نیست. برای استفاده، از صفحه‌ی «اشتراک» یکی از پلن‌ها رو فعال کن.",
        }
      : {
          ok: false,
          limit: limit!,
          code: "monthly_limit",
          error: `این ماه سقف استفاده از این امکان (${limit} بار) رو پر کردی — اول ماه بعد دوباره فعال می‌شه.`,
        };

  if (limit <= 0) return denied();

  // upsert با increment توی یک عملیات اتمیک — از race شرط
  // خواندن-بعد-نوشتن جلوگیری می‌کنه؛ اگه از سقف رد شد، همون increment
  // اضافه رو جبران (decrement) می‌کنیم و رد می‌شیم.
  const quota = await prisma.aiMonthlyQuota.upsert({
    where: { userId_feature_yearMonth: { userId, feature, yearMonth: bucket } },
    create: { userId, feature, yearMonth: bucket, usedCount: 1, limitCount: limit },
    update: { usedCount: { increment: 1 }, limitCount: limit },
  });

  const release = async () => {
    await prisma.aiMonthlyQuota
      .updateMany({ where: { id: quota.id, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } })
      .catch(() => {});
  };

  if (quota.usedCount > limit) {
    await release();
    return denied();
  }

  return { ok: true, release };
}
