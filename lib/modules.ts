import { ModuleKey } from "@prisma/client";
import { tr } from "./i18n";

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
// getter: زبان موقع خواندن (رندر) انتخاب می‌شه، نه موقع بارگذاری ماژول
export const MODULE_LABELS_FA: Record<ModuleKey, string> = {
  get ROUTINE() { return tr("روتین روزانه", "Daily routine"); },
  get SLEEP() { return tr("خواب", "Sleep"); },
  get TASKS() { return tr("کارهای روزمره", "Daily tasks"); },
  get EXERCISE() { return tr("برنامه تمرینی", "Workout plan"); },
  get CALORIE() { return tr("کالری‌شمار", "Calorie tracker"); },
  get TRADE() { return tr("ژورنال ترید", "Trading journal"); },
  get ROADMAP() { return tr("رودمپ آموزشی هوشمند", "Smart learning roadmap"); },
  get AI_INSIGHT() { return tr("تحلیل هوشمند (AI Insight)", "Smart analysis (AI Insight)"); },
};
