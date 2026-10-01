import { ModuleKey } from "@prisma/client";

// ماژول‌های «روتین من» (روتین/خواب/کار روزمره). این لیست باید با seed.ts
// (پلن basic = «روتین من») هماهنگ بماند.
//
// تصمیم Owner: «روتین من» دیگه برای همیشه رایگان نیست — هر حساب تازه
// ROUTINE_TRIAL_DAYS (۱۴) روز دسترسی آزمایشی می‌گیره و بعدش باید پلن «روتین
// من» (قیمت از پنل ادمین /admin/pricing) یا هر پلن پولی دیگه (که همه شامل این سه‌تان)
// خریده بشه. پس این ماژول‌ها دقیقا مثل بقیه‌ی ماژول‌ها از ردیف ModuleAccess
// تصمیم گرفته می‌شن (requireModule / ModuleGate) و هیچ استثنایی ندارن.
export const BASIC_MODULES: ModuleKey[] = [ModuleKey.ROUTINE, ModuleKey.SLEEP, ModuleKey.TASKS];

export function isBasicModule(module: string): boolean {
  return (BASIC_MODULES as string[]).includes(module);
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
