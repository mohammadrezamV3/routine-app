import { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BASIC_MODULES } from "@/lib/modules";
import { BASIC_ACCESS_DAYS, TRIAL_MS } from "@/lib/trial";

const DAY_MS = 24 * 60 * 60 * 1000;

/** همه‌ی ماژول‌ها در دوره‌ی آزمایشی — مستقیم از enum، تا ماژولِ تازه جا نماند */
export const TRIAL_MODULES: ModuleKey[] = Object.values(ModuleKey);

/**
 * دسترسیِ دوره‌ی آزمایشیِ حسابِ تازه — تنها جایی که ساخته می‌شود، تا
 * ثبت‌نامِ معمولی (app/api/auth/signup) و ورودِ اول با گوگل (lib/auth.ts)
 * هیچ‌وقت از هم جدا نشوند.
 *
 *  • ماژول‌های پایه → همان انقضای قبلی (BASIC_ACCESS_DAYS)
 *  • بقیه‌ی ماژول‌ها → یک هفته (TRIAL_DAYS)، بعدش عادی منقضی می‌شوند
 *
 * سقفِ مصرفِ AI در همین هفته در lib/aiQuota.ts اعمال می‌شود.
 */
export async function provisionTrialAccess(userId: string, now: Date = new Date()) {
  const basicUntil = new Date(now.getTime() + BASIC_ACCESS_DAYS * DAY_MS);
  const trialUntil = new Date(now.getTime() + TRIAL_MS);
  await prisma.moduleAccess.createMany({
    data: TRIAL_MODULES.map((module) => ({
      userId,
      module,
      active: true,
      expiresAt: BASIC_MODULES.includes(module) ? basicUntil : trialUntil,
    })),
    skipDuplicates: true,
  });
}
