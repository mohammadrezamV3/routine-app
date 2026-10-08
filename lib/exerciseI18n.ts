// نمایش انگلیسی حرکات و روزهای بدنسازی (docs/i18n.md). داده‌ی ذخیره‌شده‌ی کاربر
// (اسم حرکت در پلن، کلید عکس) همیشه فارسی می‌مونه؛ فقط موقع نمایش ترجمه می‌شه.
import { isEn, tr } from "./i18n";
import { dayNameDisplay } from "./exerciseDay";
import { EXERCISE_EN } from "./exerciseCatalogData/en";
import { findCatalogEntry } from "./exerciseCatalogUtils";
import { stripSetSuffix } from "./exerciseSets";
import type { ExerciseCatalogEntry } from "./exerciseCatalogMeta";

const ASCII_ALIAS = /^[\x20-\x7E]+$/;

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export { dayNameDisplay };

/** اسم نمایشی یک حرکت بدون پسوند ست/تکرار: فارسی در حالت فارسی؛ در انگلیسی اول دیکشنری، بعد اولین نام مستعار ASCII. */
function baseNameDisplay(nameFa: string): string {
  if (!isEn()) return nameFa;
  const en = EXERCISE_EN[nameFa]?.name;
  if (en) return en;
  const entry = findCatalogEntry(nameFa);
  if (entry) {
    const viaEntry = EXERCISE_EN[entry.name]?.name;
    if (viaEntry) return viaEntry;
    const alias = (entry.aliases ?? []).find((a) => ASCII_ALIAS.test(a));
    if (alias) return capitalize(alias);
  }
  return nameFa;
}

// ترجمه‌ی پسوند ست/تکرار/زمان («4×6 هر پا»، «30 ثانیه»، «6×1 دقیقه تند / 2 دقیقه آرام»)
function suffixDisplay(suffix: string): string {
  return suffix
    .replace(/دقیقه/g, "min")
    .replace(/ثانیه/g, "sec")
    .replace(/هر\s*پا/g, "per leg")
    .replace(/هر\s*طرف/g, "per side")
    .replace(/تند/g, "fast")
    .replace(/آرام/g, "easy");
}

// حرکت‌های قالب آماده که در کاتالوگ نیستن
const TEMPLATE_ITEM_EN: Record<string, string> = {
  "کوهنورد آهسته": "Slow mountain climbers",
  "اسکوات آهسته": "Slow squat",
  "پیاده‌روی تند": "Brisk walk",
  "پیاده‌روی تند تناوبی": "Interval brisk walk",
  "بالا‌رفتن پله آهسته": "Slow step-ups",
  "پیاده‌روی تند یا دوی سبک": "Brisk walk or light jog",
  "کشش کامل بدن": "Full-body stretching",
  "دویدن آرام": "Easy run",
  "دویدن تمپو": "Tempo run",
  "دویدن یا دوچرخه پیوسته": "Steady run or bike",
  "دویدن یا دوچرخه آرام": "Easy run or bike",
  "تناوبی دویدن": "Interval run",
  "طناب زدن": "Jump rope",
};

/**
 * نمایش یک آیتم برنامه (مثلا «اسکوات هالتر 5×5 هر پا») به زبان جاری.
 * اسم فارسی ذخیره‌شده عوض نمی‌شه؛ فقط خروجی نمایشی.
 */
export function exerciseDisplayName(item: string): string {
  if (!isEn()) return item;
  const base = stripSetSuffix(item);
  const suffix = item.startsWith(base) ? item.slice(base.length) : "";
  let name = baseNameDisplay(base);
  if (name === base) name = TEMPLATE_ITEM_EN[base] ?? base;
  return name + suffixDisplay(suffix);
}

/** نسخه‌ی محلی‌شده‌ی یک ورودی کاتالوگ (اسم، گروه عضلانی، طرز انجام، فایده) برای نمایش. */
export function localizeExercise(entry: ExerciseCatalogEntry): {
  name: string;
  muscleGroup: string;
  howTo: string[];
  benefits: string;
} {
  if (!isEn()) return { name: entry.name, muscleGroup: entry.muscleGroup, howTo: entry.howTo, benefits: entry.benefits };
  const en = EXERCISE_EN[entry.name];
  const alias = (entry.aliases ?? []).find((a) => ASCII_ALIAS.test(a));
  return {
    name: en?.name ?? (alias ? capitalize(alias) : entry.name),
    muscleGroup: en?.muscleGroup ?? entry.muscleGroup,
    howTo: en && en.howTo.length ? en.howTo : entry.howTo,
    benefits: en?.benefits ?? entry.benefits,
  };
}

// تمرکز روز در قالب‌های آماده و computeDayFocus (ذخیره‌شده فارسی می‌مونه)
const FOCUS_EN: Record<string, string> = {
  "برنامه‌ی شخصی": "Custom plan",
  "بدن کامل": "Full body",
  "بالاتنه": "Upper body",
  "پایین‌تنه": "Lower body",
  "شکم و مرکز بدن": "Abs and core",
  "کاردیو": "Cardio",
  "انعطاف‌پذیری": "Flexibility",
  "ترکیبی": "Mixed",
  "بدن کامل — الگوی اسکوات/پرس": "Full body: squat/press pattern",
  "بدن کامل — الگوی هینج/کشش": "Full body: hinge/pull pattern",
  "بدن کامل — ترکیبی": "Full body: mixed",
  "پایین‌تنه — اسکوات": "Lower body: squat",
  "بالاتنه — پرس": "Upper body: press",
  "پایین‌تنه — هینج": "Lower body: hinge",
  "بالاتنه — کشش": "Upper body: pull",
  "اسکوات سنگین": "Heavy squat",
  "پرس سینه سنگین": "Heavy bench press",
  "ددلیفت سنگین": "Heavy deadlift",
  "پرس سرشانه سنگین": "Heavy overhead press",
  "بدن کامل A": "Full body A",
  "بدن کامل B": "Full body B",
  "بدن کامل C": "Full body C",
  "بالاتنه A": "Upper body A",
  "پایین‌تنه A": "Lower body A",
  "بالاتنه B": "Upper body B",
  "پایین‌تنه B": "Lower body B",
  "Push (سینه/شانه/پشت‌بازو)": "Push (chest/shoulders/triceps)",
  "Pull (پشت/جلوبازو)": "Pull (back/biceps)",
  "Legs (کامل)": "Legs (full)",
  "بالاتنه (دور دوم)": "Upper body (round 2)",
  "پایین‌تنه (دور دوم)": "Lower body (round 2)",
  "بدن کامل — سرکیت": "Full body: circuit",
  "کاردیوی پیوسته": "Steady cardio",
  "بالاتنه — سرکیت": "Upper body: circuit",
  "کاردیوی تناوبی (HIIT)": "Interval cardio (HIIT)",
  "پایین‌تنه — سرکیت": "Lower body: circuit",
  "کاردیوی تمپو": "Tempo cardio",
  "Push — سرکیت": "Push: circuit",
  "Pull — سرکیت": "Pull: circuit",
  "Legs — سرکیت": "Legs: circuit",
  "کاردیوی طولانی": "Long cardio",
  "تقویتی سبک": "Light strength",
  "تمپو / تناوبی": "Tempo / intervals",
  "تناوبی": "Intervals",
  "تقویتی": "Strength",
  "تمپو": "Tempo",
};

/** تمرکز روز (focus) برای نمایش؛ متن آزاد/ناشناخته دست‌نخورده می‌مونه. */
export function focusDisplay(focusFa: string): string {
  if (!isEn()) return focusFa;
  return FOCUS_EN[focusFa] ?? focusFa;
}

/** برچسب کوتاه «ست/تکرار» و … که چند جا لازمه */
export const setsLabel = (n: number) => tr(`${n} ست`, n === 1 ? "1 set" : `${n} sets`);
