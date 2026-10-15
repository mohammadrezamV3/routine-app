import type { ExerciseEn } from "./types";
import { LEGACY_EN } from "./legacy";
import { LEGS_EN } from "./legs";
import { POWER_EN } from "./power";
import { MOBILITY_EN } from "./mobility";
import { ARMS_EN } from "./arms";
import { CORE_EN } from "./core";
import { BACK_EN } from "./back";
import { CHEST_EN } from "./chest";
import { CARDIO_EN } from "./cardio";
import { SHOULDERS_EN } from "./shoulders";
import { EXTRA_EN } from "./extra";

export type { ExerciseEn } from "./types";

/** همه‌ی ترجمه‌های انگلیسی حرکت‌ها، کلید = name فارسی */
export const EXERCISE_EN: Record<string, ExerciseEn> = {
  ...LEGACY_EN, ...LEGS_EN, ...POWER_EN, ...MOBILITY_EN, ...ARMS_EN, ...CORE_EN,
  ...BACK_EN, ...CHEST_EN, ...CARDIO_EN, ...SHOULDERS_EN, ...EXTRA_EN,
};
