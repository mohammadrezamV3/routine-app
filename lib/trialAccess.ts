import { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BASIC_MODULES } from "@/lib/modules";
import { ROUTINE_TRIAL_MS, TRIAL_MODULE_KEYS, TRIAL_MS } from "@/lib/trial";

/** ماژول‌های دوره‌ی آزمایشی (بدنسازی/کالری/ترید) — رودمپ و AI_INSIGHT عمداً نیستند */
export const TRIAL_MODULES: ModuleKey[] = TRIAL_MODULE_KEYS.map((k) => ModuleKey[k]);

/**
 * دسترسیِ حسابِ تازه — تنها جایی که ساخته می‌شود، تا ثبت‌نامِ معمولی
 * (app/api/auth/signup) و ورودِ اول با گوگل (lib/auth.ts) هیچ‌وقت از هم
 * جدا نشوند.
 *
 *  • ماژول‌های «روتین من» → ROUTINE_TRIAL_DAYS (۱۴) روز، بعد باید پلن خریده بشه
 *  • ماژول‌های تریال → TRIAL_DAYS روز، بعدش عادی منقضی می‌شوند
 *
 * سقفِ مصرفِ AI در همین دوره در lib/aiQuota.ts اعمال می‌شود.
 */
export async function provisionTrialAccess(userId: string, now: Date = new Date()) {
  const trialUntil = new Date(now.getTime() + TRIAL_MS);
  const routineUntil = new Date(now.getTime() + ROUTINE_TRIAL_MS);
  await prisma.moduleAccess.createMany({
    data: [
      ...BASIC_MODULES.map((module) => ({ userId, module, active: true, expiresAt: routineUntil })),
      ...TRIAL_MODULES.map((module) => ({ userId, module, active: true, expiresAt: trialUntil })),
    ],
    skipDuplicates: true,
  });
}

/**
 * آیا کاربر الان در دوره‌ی آزمایشی است؟ = اشتراکِ فعال ندارد و حسابش کمتر از
 * TRIAL_DAYS روز عمر دارد. همان تعریفی که lib/aiQuota.ts برای سقفِ تریال دارد.
 */
export async function isInTrial(userId: string, hasActiveSubscription: boolean): Promise<boolean> {
  if (hasActiveSubscription) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } });
  return !!user && Date.now() - user.createdAt.getTime() < TRIAL_MS;
}
