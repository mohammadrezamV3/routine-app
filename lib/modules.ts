import { ModuleKey } from "@prisma/client";

// ماژول‌هایی که پلن پایه همیشه شامل می‌شود — همون سه‌تای همیشگی
// (روتین/خواب/کار روزمره). این لیست باید با seed.ts هماهنگ بماند.
// این سه برای همه‌ی کاربرانِ واردشده *همیشه* رایگان‌اند و انقضا ندارند:
// هم ثبت‌نام معمولی هم ثبت‌نام با گوگل از طریق provisionTrialAccess
// (lib/trialAccess.ts) ردیفِ بی‌انقضا می‌سازن، و خودِ منطقِ دسترسی
// (requireModule، /api/account، /api/bootstrap) هم مستقل از ردیف‌های
// ModuleAccess اون‌ها رو باز حساب می‌کنه — تا ردیفِ کهنه/منقضیِ قدیمی یا
// خریدِ یک پلن (که ردیفِ پلن رو با انقضای دوره می‌سازه) هیچ‌وقت ببندشون.
// استثنا: دستیارِ «نومو» (/api/routine/assistant) برای بی‌اشتراک فقط سهمیه‌ی پیامِ رایگان دارد.
export const BASIC_MODULES: ModuleKey[] = [ModuleKey.ROUTINE, ModuleKey.SLEEP, ModuleKey.TASKS];

export function isBasicModule(module: string): boolean {
  return (BASIC_MODULES as string[]).includes(module);
}

/**
 * لیستِ دسترسی‌ها برای کلاینت/محاسبه — ماژول‌های پایه همیشه فعال و بی‌انقضا،
 * صرف‌نظر از ردیفِ ذخیره‌شده (یا نبودنش).
 */
export function withBasicModules<M extends string>(
  rows: { module: M; active: boolean; expiresAt: Date | string | null }[],
): { module: M | ModuleKey; active: boolean; expiresAt: Date | string | null }[] {
  return [
    ...rows.filter((r) => !isBasicModule(r.module)),
    ...BASIC_MODULES.map((module) => ({ module, active: true, expiresAt: null })),
  ];
}

// لیبل فارسی هر ماژول — منبع مشترک برای پنل کاربری و صفحه‌ی اشتراک، تا
// این اسم‌ها جای مختلف تکراری/ناهماهنگ تعریف نشن
export const MODULE_LABELS_FA: Record<ModuleKey, string> = {
  ROUTINE: "روتین روزانه",
  SLEEP: "خواب",
  TASKS: "کارهای روزمره",
  EXERCISE: "برنامه تمرینی",
  CALORIE: "کالری‌شمار",
  TRADE: "ژورنال ترید",
  ROADMAP: "رودمپ آموزشی هوشمند",
  AI_INSIGHT: "تحلیل هوشمند (AI Insight)",
};
