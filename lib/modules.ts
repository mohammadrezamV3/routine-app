import { ModuleKey } from "@prisma/client";

// ماژول‌هایی که پلن پایه همیشه شامل می‌شود — همون سه‌تای همیشگی
// (روتین/خواب/کار روزمره). این لیست باید با seed.ts هماهنگ بماند.
// هم ثبت‌نام معمولی هم ثبت‌نام با گوگل از همین لیست استفاده می‌کنن تا
// دوره آزمایشیِ کاربر جدید مستقل از روش ورود، یکسان باشه.
export const BASIC_MODULES: ModuleKey[] = [ModuleKey.ROUTINE, ModuleKey.SLEEP, ModuleKey.TASKS];

// لیبلِ فارسیِ هر ماژول — منبعِ مشترک برای پنلِ کاربری و صفحه‌ی اشتراک، تا
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
