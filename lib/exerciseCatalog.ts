// کاتالوگ حرکات بدنسازی — برای بخش «مشاهده حرکات»، فرم ساخت دستی برنامه،
// ویرایشگر برنامه‌ی منتور، پنل عکس حرکات ادمین و تطبیق اسم حرکات AI.
//
// دیتا در `lib/exerciseCatalogData/*` به تفکیک گروه عضلانی جدا شده و تایپ‌ها
// و منطق سبک (سختی، تجهیزات، جستجو) در `lib/exerciseCatalogMeta.ts`ن. هر
// کامپوننت کلاینتی که فقط تایپ یا سختی لازم داره از meta وارد کنه؛ این فایل
// کل دیتا رو با خودش میاره و فقط باید در کد سرور یا با dynamic import لود بشه.

import type { ExerciseCatalogEntry } from "./exerciseCatalogMeta";
import { LEGACY_EXERCISES } from "./exerciseCatalogData/legacy";
import { LEGACY_ALIASES, LEGACY_EQUIPMENT } from "./exerciseCatalogData/legacyAliases";
import { LEG_EXERCISES } from "./exerciseCatalogData/legs";
import { CHEST_EXERCISES } from "./exerciseCatalogData/chest";
import { BACK_EXERCISES } from "./exerciseCatalogData/back";
import { SHOULDER_EXERCISES } from "./exerciseCatalogData/shoulders";
import { ARM_EXERCISES } from "./exerciseCatalogData/arms";
import { CORE_EXERCISES } from "./exerciseCatalogData/core";
import { CARDIO_EXERCISES } from "./exerciseCatalogData/cardio";
import { MOBILITY_EXERCISES } from "./exerciseCatalogData/mobility";
import { POWER_EXERCISES } from "./exerciseCatalogData/power";
import { EXTRA_EXERCISES } from "./exerciseCatalogData/extra";

export * from "./exerciseCatalogMeta";

// حرکات اولیه اول می‌مونن (ترتیب آشنای لیست برای کاربرهای قدیمی) و فقط
// اسم‌های دیگه و تجهیزاتشون از legacyAliases اضافه می‌شه — خود اسم دست نمی‌خوره.
const LEGACY_WITH_ALIASES: ExerciseCatalogEntry[] = LEGACY_EXERCISES.map((e) => {
  const aliases = LEGACY_ALIASES[e.name];
  const equipment = LEGACY_EQUIPMENT[e.name];
  if (!aliases && !equipment) return e;
  return {
    ...e,
    ...(aliases ? { aliases: [...(e.aliases ?? []), ...aliases] } : {}),
    ...(equipment ? { equipment } : {}),
  };
});

export const EXERCISE_CATALOG: ExerciseCatalogEntry[] = [
  ...LEGACY_WITH_ALIASES,
  ...LEG_EXERCISES,
  ...CHEST_EXERCISES,
  ...BACK_EXERCISES,
  ...SHOULDER_EXERCISES,
  ...ARM_EXERCISES,
  ...CORE_EXERCISES,
  ...CARDIO_EXERCISES,
  ...MOBILITY_EXERCISES,
  ...POWER_EXERCISES,
  ...EXTRA_EXERCISES,
];
