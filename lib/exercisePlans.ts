import { CAL_WEEK_ORDER, FA_WEEKDAY } from "./jalali";
import { EXERCISE_CATALOG, MuscleKey } from "./exerciseCatalog";
import { stripSetSuffix } from "./exerciseSets";

export type ExerciseDay = { day: string; focus: string; items: string[] };
export type ExerciseGoal = "strength" | "hypertrophy" | "cut" | "endurance";
export type ExerciseLevel = "beginner" | "intermediate" | "advanced";

export const LEVEL_LABELS: Record<ExerciseLevel, string> = {
  beginner: "مبتدی",
  intermediate: "متوسط",
  advanced: "پیشرفته",
};

export const GOAL_LABELS: Record<ExerciseGoal, string> = {
  strength: "قدرت / لیفتینگ",
  hypertrophy: "حجم",
  cut: "کات (کاهش چربی)",
  endurance: "استقامت",
};

// گزینه‌های هدفِ نمایش‌داده‌شده به کاربر توی فرمِ ساخت با AI — بیشتر از
// چهارتای اصلیِ بالا (که فقط برای قالبِ ایستای fallback لازمه). هر گزینه
// به یکی از همون چهارتا برای fallback/محاسبه‌ی حداقلِ روزها نگاشت می‌شه؛
// وقتی AI در دسترسه، از خودِ برچسبِ فارسی برای پرامپت استفاده می‌شه، نه از
// این نگاشت.
export type ExerciseGoalOption =
  | ExerciseGoal
  | "general_fitness"
  | "athletic_performance"
  | "toning"
  | "mobility";

export const GOAL_OPTION_LABELS: Record<ExerciseGoalOption, string> = {
  strength: "قدرت / لیفتینگ",
  hypertrophy: "حجم عضلانی",
  cut: "کات (کاهش چربی)",
  endurance: "استقامت",
  general_fitness: "تناسب‌اندام عمومی",
  athletic_performance: "عملکرد و چابکی ورزشی",
  toning: "فرم‌دهی بدن",
  mobility: "انعطاف‌پذیری و تحرک‌پذیری",
};

export const GOAL_FALLBACK_MAP: Record<ExerciseGoalOption, ExerciseGoal> = {
  strength: "strength",
  hypertrophy: "hypertrophy",
  cut: "cut",
  endurance: "endurance",
  general_fitness: "hypertrophy",
  athletic_performance: "strength",
  toning: "cut",
  mobility: "endurance",
};

// ============================================================
// منطق برنامه‌ریزی بر اساس هدف + سطح — نه یک قالب ثابت برای همه.
// دامنه تکرار/حجم هرکدوم از این چهار مسیر از اصول شناخته‌شده تمرین مقاومتی
// می‌آد (NSCA/ACSM 2026): قدرت ۳-۶ تکرار با بار سنگین، حجم ۸-۱۲ تکرار با
// حجم هفتگی بالاتر (~۱۰ ست به‌ازای هر گروه عضلانی) و فرکانس ~۲ بار در هفته
// برای هر گروه عضلانی، کات = مقاومتی متوسط‌تکرار برای حفظ عضله + کاردیو
// اضافه برای کسری کالری، استقامت = عمدتاً هوازی پیوسته + تناوبی محدود.
// ============================================================

const LIMITATION_SWAP: Record<string, string> = {
  "برپی ۴×۱۰": "کوهنورد آهسته ۴×۱۰",
  "برپی ۴×۱۵": "کوهنورد آهسته ۴×۱۵",
  "اسکوات جامپ ۳×۱۲": "اسکوات آهسته ۳×۱۲",
  "طناب زدن ۵ دقیقه": "پیاده‌روی تند ۱۰ دقیقه",
  "تناوبی دویدن ۸×۳۰ ثانیه": "پیاده‌روی تند تناوبی ۸×۳۰ ثانیه",
  "پرش جعبه ۴×۸": "بالا‌رفتن پله آهسته ۴×۸",
};

/** برای «محدودیت جسمی دارم» — حرکات پرفشار/پرضربه رو با معادل ملایم‌تر عوض می‌کنه */
function applyLimitation(days: ExerciseDay[], hasLimitation: boolean): ExerciseDay[] {
  if (!hasLimitation) return days;
  return days.map((d) => ({ ...d, items: d.items.map((it) => LIMITATION_SWAP[it] || it) }));
}

const STRENGTH: Record<ExerciseLevel, ExerciseDay[]> = {
  // مبتدی: یادگیری الگوی حرکات پایه با بار متوسط قبل از رفتن سراغ بار سنگین
  beginner: [
    { day: "شنبه", focus: "بدن کامل — الگوی اسکوات/پرس", items: ["اسکوات گابلت ۴×۶", "پرس سینه با دمبل ۴×۶", "پلانک ۳×۳۰ ثانیه"] },
    { day: "دوشنبه", focus: "بدن کامل — الگوی هینج/کشش", items: ["ددلیفت رومانیایی سبک ۴×۶", "زیربغل با کش یا دمبل ۴×۸", "کول‌آپ کمکی ۳×۶"] },
    { day: "چهارشنبه", focus: "بدن کامل — ترکیبی", items: ["لانج با دمبل ۳×۸ هر پا", "پرس سرشانه با دمبل ۴×۶", "بلند کردن ددلیفت تک‌پا ۳×۸"] },
  ],
  // متوسط: تقسیم بالاتنه/پایین‌تنه، هر گروه عضلانی ۲ بار در هفته
  intermediate: [
    { day: "شنبه", focus: "پایین‌تنه — اسکوات", items: ["اسکوات هالتر ۵×۵", "لانج بلغاری ۳×۸ هر پا", "ساق پا ایستاده ۴×۱۰"] },
    { day: "یکشنبه", focus: "بالاتنه — پرس", items: ["پرس سینه هالتر ۵×۵", "پرس سرشانه هالتر ۴×۶", "دیپ ۳×۸"] },
    { day: "سه‌شنبه", focus: "پایین‌تنه — هینج", items: ["ددلیفت ۴×۵", "هیپ تراست ۴×۸", "پلانک جانبی ۳×۳۰ ثانیه هر طرف"] },
    { day: "پنجشنبه", focus: "بالاتنه — کشش", items: ["بارفیکس یا کول‌آپ ۴×۶", "زیربغل هالتر خم ۴×۶", "جلوبازو هالتر ۳×۸"] },
  ],
  // پیشرفته: تقسیم کلاسیک قدرتی روی ۴ لیفت اصلی — بین جلسات سنگین فاصله کافی برای ریکاوری
  advanced: [
    { day: "شنبه", focus: "اسکوات سنگین", items: ["اسکوات هالتر ۵×۳", "اسکوات پا جلو ۳×۶", "پلانک بارگذاری‌شده ۳×۴۵ ثانیه"] },
    { day: "یکشنبه", focus: "پرس سینه سنگین", items: ["پرس سینه هالتر ۵×۳", "پرس شیب‌دار دمبل ۳×۶", "دیپ وزنه‌دار ۳×۶"] },
    { day: "سه‌شنبه", focus: "ددلیفت سنگین", items: ["ددلیفت ۵×۳", "هیپ تراست هالتر ۳×۶", "زیربغل تی-بار ۳×۸"] },
    { day: "پنجشنبه", focus: "پرس سرشانه سنگین", items: ["پرس سرشانه هالتر ۵×۳", "بارفیکس وزنه‌دار ۴×۵", "جلوبازو هالتر ۳×۸"] },
  ],
};

const HYPERTROPHY: Record<ExerciseLevel, ExerciseDay[]> = {
  // مبتدی: بدن‌کامل ۳ بار در هفته — بیشترین فایده حجمی برای تازه‌کار با کمترین پیچیدگی
  beginner: [
    { day: "شنبه", focus: "بدن کامل A", items: ["اسکوات گابلت ۳×۱۰", "شنا سوئدی ۳×۱۰", "زیربغل با کش ۳×۱۲", "پلانک ۳×۳۰ ثانیه"] },
    { day: "دوشنبه", focus: "بدن کامل B", items: ["لانج دمبل ۳×۱۰ هر پا", "پرس سرشانه دمبل ۳×۱۰", "کول‌آپ کمکی ۳×۸", "کرانچ ۳×۱۵"] },
    { day: "چهارشنبه", focus: "بدن کامل C", items: ["ددلیفت رومانیایی سبک ۳×۱۰", "پرس شیب‌دار دمبل ۳×۱۰", "زیربغل تک‌دست دمبل ۳×۱۰ هر طرف"] },
  ],
  // متوسط: بالاتنه/پایین‌تنه ۲ بار در هفته — هر گروه عضلانی با فرکانس ۲x
  intermediate: [
    { day: "شنبه", focus: "بالاتنه A", items: ["پرس سینه هالتر ۴×۱۰", "زیربغل هالتر خم ۴×۱۰", "پرس سرشانه دمبل ۳×۱۲", "جلوبازو دمبل ۳×۱۲"] },
    { day: "یکشنبه", focus: "پایین‌تنه A", items: ["اسکوات هالتر ۴×۱۰", "لانج بلغاری ۳×۱۲ هر پا", "ساق پا ۴×۱۵"] },
    { day: "سه‌شنبه", focus: "بالاتنه B", items: ["پرس شیب‌دار دمبل ۴×۱۰", "بارفیکس یا کول‌آپ ۴×۸", "نشر جانبی دمبل ۳×۱۲", "پشت‌بازو سیمکش ۳×۱۲"] },
    { day: "پنجشنبه", focus: "پایین‌تنه B", items: ["ددلیفت رومانیایی ۴×۱۰", "پرس پا ۴×۱۲", "هیپ تراست ۳×۱۲", "پلانک ۳×۴۵ ثانیه"] },
  ],
  // پیشرفته: Push/Pull/Legs + یک دور دوم فشرده برای بالاتنه/پایین‌تنه — هر گروه عضلانی ~۲x در هفته با حجم بالا
  advanced: [
    { day: "شنبه", focus: "Push (سینه/شانه/پشت‌بازو)", items: ["پرس سینه هالتر ۴×۱۰", "پرس شیب‌دار دمبل ۳×۱۲", "پرس سرشانه ۳×۱۰", "پشت‌بازو سیمکش ۳×۱۲"] },
    { day: "یکشنبه", focus: "Pull (پشت/جلوبازو)", items: ["بارفیکس ۴×۸", "زیربغل هالتر خم ۴×۱۰", "زیربغل سیمکش ۳×۱۲", "جلوبازو دمبل ۳×۱۲"] },
    { day: "دوشنبه", focus: "Legs (کامل)", items: ["اسکوات هالتر ۴×۱۰", "ددلیفت رومانیایی ۳×۱۰", "پرس پا ۳×۱۲", "ساق پا ۴×۱۵"] },
    { day: "چهارشنبه", focus: "بالاتنه (دور دوم)", items: ["پرس سینه دمبل ۳×۱۲", "زیربغل تک‌دست ۳×۱۲ هر طرف", "نشر جانبی ۳×۱۵"] },
    { day: "پنجشنبه", focus: "پایین‌تنه (دور دوم)", items: ["لانج بلغاری ۳×۱۲ هر پا", "هیپ تراست ۴×۱۲", "پلانک ۳×۴۵ ثانیه"] },
  ],
};

const CUT: Record<ExerciseLevel, ExerciseDay[]> = {
  // مبتدی: مقاومتی سبک با استراحت کم + یک روز کاردیوی پیوسته
  beginner: [
    { day: "شنبه", focus: "بدن کامل — سرکیت", items: ["اسکوات وزن بدن ۳×۱۵", "شنا سوئدی روی زانو ۳×۱۰", "زیربغل با کش ۳×۱۵", "پلانک ۳×۳۰ ثانیه"] },
    { day: "دوشنبه", focus: "کاردیوی پیوسته", items: ["پیاده‌روی تند یا دوی سبک ۲۵ دقیقه"] },
    { day: "چهارشنبه", focus: "بدن کامل — سرکیت", items: ["لانج ۳×۱۲ هر پا", "پرس سرشانه دمبل سبک ۳×۱۵", "کرانچ ۳×۲۰"] },
  ],
  // متوسط: مقاومتی تقسیم‌شده + کاردیوی تناوبی
  intermediate: [
    { day: "شنبه", focus: "بالاتنه — سرکیت", items: ["پرس سینه دمبل ۴×۱۲", "زیربغل با کش ۴×۱۵", "شنا سوئدی ۳×۱۵"] },
    { day: "یکشنبه", focus: "کاردیوی تناوبی (HIIT)", items: ["تناوبی دویدن ۸×۳۰ ثانیه", "طناب زدن ۵ دقیقه"] },
    { day: "سه‌شنبه", focus: "پایین‌تنه — سرکیت", items: ["اسکوات ۴×۱۵", "لانج ۳×۱۲ هر پا", "پرش جعبه ۴×۸"] },
    { day: "پنجشنبه", focus: "کاردیوی تمپو", items: ["دویدن تمپو ۳۰ دقیقه"] },
  ],
  // پیشرفته: سرکیت‌های پرفشار روی همه گروه‌های عضلانی + کاردیوی جدی برای بیشینه کسری کالری
  advanced: [
    { day: "شنبه", focus: "Push — سرکیت", items: ["پرس سینه دمبل ۴×۱۲", "پرس سرشانه ۴×۱۲", "دیپ ۳×۱۵"] },
    { day: "یکشنبه", focus: "کاردیوی تناوبی (HIIT)", items: ["تناوبی دویدن ۱۰×۳۰ ثانیه", "برپی ۴×۱۵"] },
    { day: "دوشنبه", focus: "Pull — سرکیت", items: ["زیربغل هالتر ۴×۱۲", "بارفیکس ۳×۸", "جلوبازو ۳×۱۵"] },
    { day: "چهارشنبه", focus: "Legs — سرکیت", items: ["اسکوات ۴×۱۵", "لانج ۳×۱۲ هر پا", "هیپ تراست ۳×۱۵"] },
    { day: "پنجشنبه", focus: "کاردیوی طولانی", items: ["دویدن یا دوچرخه پیوسته ۴۰ دقیقه"] },
  ],
};

const ENDURANCE: Record<ExerciseLevel, ExerciseDay[]> = {
  // مبتدی: پیوسته و کوتاه، پیشروی تدریجی + یک جلسه تقویتی سبک
  beginner: [
    { day: "شنبه", focus: "کاردیوی پیوسته", items: ["پیاده‌روی تند یا دوی سبک ۲۰ دقیقه"] },
    { day: "دوشنبه", focus: "تقویتی سبک", items: ["اسکوات وزن بدن ۳×۱۲", "پلانک ۳×۲۰ ثانیه", "کشش کامل بدن ۱۰ دقیقه"] },
    { day: "چهارشنبه", focus: "کاردیوی پیوسته", items: ["پیاده‌روی تند یا دوی سبک ۲۵ دقیقه"] },
  ],
  // متوسط: پیوسته + یک جلسه تمپو/تناوبی + تقویتی
  intermediate: [
    { day: "شنبه", focus: "کاردیوی پیوسته", items: ["دویدن آرام ۳۰ دقیقه"] },
    { day: "یکشنبه", focus: "تمپو / تناوبی", items: ["تناوبی دویدن ۶×۱ دقیقه تند / ۲ دقیقه آرام"] },
    { day: "سه‌شنبه", focus: "تقویتی سبک", items: ["اسکوات ۳×۱۵", "لانج ۳×۱۲ هر پا", "پلانک ۳×۴۰ ثانیه"] },
    { day: "پنجشنبه", focus: "کاردیوی طولانی", items: ["دویدن یا دوچرخه آرام ۴۰ دقیقه"] },
  ],
  // پیشرفته: حجم هفتگی بالاتر با تناوبی جدی‌تر + تقویتی برای جلوگیری از آسیب
  advanced: [
    { day: "شنبه", focus: "کاردیوی پیوسته", items: ["دویدن آرام ۴۵ دقیقه"] },
    { day: "یکشنبه", focus: "تناوبی", items: ["تناوبی دویدن ۸×۲ دقیقه تند / ۱ دقیقه آرام"] },
    { day: "دوشنبه", focus: "تقویتی", items: ["اسکوات ۳×۱۵", "ددلیفت رومانیایی سبک ۳×۱۲", "پلانک ۳×۵۰ ثانیه"] },
    { day: "چهارشنبه", focus: "تمپو", items: ["دویدن تمپو ۳۵ دقیقه"] },
    { day: "پنجشنبه", focus: "کاردیوی طولانی", items: ["دویدن یا دوچرخه پیوسته ۶۰ دقیقه"] },
  ],
};

const PLAN_MATRIX: Record<ExerciseGoal, Record<ExerciseLevel, ExerciseDay[]>> = {
  strength: STRENGTH,
  hypertrophy: HYPERTROPHY,
  cut: CUT,
  endurance: ENDURANCE,
};

/** تعدادِ حداقلِ روزهایی که این ترکیبِ هدف/سطح برای اجرا لازم داره (طولِ قالبش) */
export function getRequiredDaysCount(goal: ExerciseGoal, level: ExerciseLevel): number {
  return (PLAN_MATRIX[goal]?.[level] || PLAN_MATRIX.hypertrophy.beginner).length;
}

function sortDaysCalendarOrder(days: string[]): string[] {
  return [...days].sort(
    (a, b) => CAL_WEEK_ORDER.indexOf(FA_WEEKDAY.indexOf(a)) - CAL_WEEK_ORDER.indexOf(FA_WEEKDAY.indexOf(b))
  );
}

export function getExercisePlan(
  goal: ExerciseGoal,
  level: ExerciseLevel,
  hasPhysicalLimitation = false,
  gymDays?: string[]
): ExerciseDay[] {
  const template = PLAN_MATRIX[goal]?.[level] || PLAN_MATRIX.hypertrophy.beginner;
  // قالب‌ها روزهای هاردکد شده دارن (مثلاً «شنبه، دوشنبه، چهارشنبه») که به
  // انتخابِ واقعیِ کاربر توی فرم هیچ ربطی نداشت — این باعث می‌شد مثلاً انتخابِ
  // «جمعه» توی فرم، هیچ اثری روی روزهای برنامه‌ی نهایی نذاره. حالا اسمِ روزِ
  // هر اسلاتِ قالب با روزِ واقعیِ انتخاب‌شده‌ی کاربر (به‌ترتیبِ هفته) جایگزین می‌شه.
  if (!gymDays || gymDays.length === 0) return applyLimitation(template, hasPhysicalLimitation);
  const sortedGymDays = sortDaysCalendarOrder(gymDays);
  const days = template.map((d, i) => ({ ...d, day: sortedGymDays[i] ?? d.day }));
  return applyLimitation(days, hasPhysicalLimitation);
}

// جایگزینی حرکت وقتی «این تجهیزات رو ندارم» — fallback بدون هوش مصنوعی (وقتی کلید
// API نیست یا تماس شکست خورد)؛ فقط یک عوضِ کلیدواژه‌ایِ تقریبیه، نه معادل تخصصی دقیق.
const EQUIPMENT_KEYWORD_SWAP: [RegExp, string][] = [
  [/دستگاه اسمیت/, "اسکوات با دمبل"],
  [/دستگاه پرس سینه/, "پرس سینه با دمبل"],
  [/دستگاه پرس پا/, "اسکوات وزن بدن"],
  [/دستگاه زیربغل|لت زیربغل/, "زیربغل با کش تمرینی"],
  [/سیم‌کش|سیمکش/, "کش تمرینی"],
  [/هالتر/, "دمبل"],
  [/دمبل/, "کش تمرینی یا وزن بدن"],
  [/بارفیکس/, "کول‌آپ کمکی یا کش تمرینی"],
];

export function getFallbackSubstitute(item: string): string | null {
  for (const [pattern, replacement] of EQUIPMENT_KEYWORD_SWAP) {
    if (pattern.test(item)) return item.replace(pattern, replacement);
  }
  return null;
}

// سه حرکتِ جایگزینِ آماده (بدونِ هوش‌مصنوعی) — از کاتالوگِ حرکات
// (lib/exerciseCatalog.ts) حرکاتی با همون الگوی حرکتی (اولویت) یا هم‌پوشانیِ
// گروهِ عضلانی رو پیدا می‌کنه، سه‌تای برتر رو با همون پسوندِ ست/تکرار یا
// زمانِ حرکتِ اصلی برمی‌گردونه — کاربر خودش انتخاب می‌کنه، نه سوییچِ خودکار.
const UPPER_KEYS: MuscleKey[] = ["chest", "back", "traps", "shoulders", "biceps", "triceps", "forearms"];
const LOWER_KEYS: MuscleKey[] = ["glutes", "quads", "hamstrings", "calves"];
const CORE_KEYS: MuscleKey[] = ["abs", "obliques"];

/** «تمرکزِ امروز» رو خودِ سیستم از روی حرکاتِ اضافه‌شده تشخیص می‌ده (نه اینکه
 * کاربر تایپ کنه) — بر اساسِ گروهِ عضلانیِ غالب در حرکاتِ همون روز. */
export function computeDayFocus(items: string[]): string {
  const cats = new Set<"upper" | "lower" | "core" | "cardio" | "flex" | "full">();
  for (const item of items) {
    const entry = EXERCISE_CATALOG.find((e) => e.name === stripSetSuffix(item));
    if (!entry) continue;
    if (entry.muscleKeys.includes("fullbody")) cats.add("full");
    if (entry.muscleKeys.some((k) => UPPER_KEYS.includes(k))) cats.add("upper");
    if (entry.muscleKeys.some((k) => LOWER_KEYS.includes(k))) cats.add("lower");
    if (entry.muscleKeys.some((k) => CORE_KEYS.includes(k))) cats.add("core");
    if (entry.muscleKeys.includes("cardio")) cats.add("cardio");
    if (entry.muscleKeys.includes("flexibility")) cats.add("flex");
  }
  if (cats.size === 0) return "برنامه‌ی شخصی";
  if (cats.has("full") || (cats.has("upper") && cats.has("lower")) || cats.size >= 3) return "بدن کامل";
  if (cats.size === 1) {
    const [only] = cats;
    return only === "upper" ? "بالاتنه"
      : only === "lower" ? "پایین‌تنه"
      : only === "core" ? "شکم و مرکز بدن"
      : only === "cardio" ? "کاردیو"
      : "انعطاف‌پذیری";
  }
  return "ترکیبی";
}

// excludeNames: اسمِ (بدونِ پسوندِ ست/تکرار) بقیه‌ی حرکاتِ همون روز — وگرنه
// پیشنهاد ممکنه دقیقاً یکی از حرکاتِ از‌قبل‌توی‌برنامه رو برگردونه؛ جایگزینی
// با اون فقط یه هم‌نامِ تکراری می‌سازه (حرکتِ قدیمی درست حذف می‌شه ولی یه
// کپیِ دیگه از یه حرکتِ دیگه‌ی برنامه به‌جاش میاد)، نه یه جایگزینِ واقعاً جدید.
export function getCatalogSubstitutes(item: string, max = 3, excludeNames: string[] = []): string[] {
  const baseName = stripSetSuffix(item);
  const suffix = item.startsWith(baseName) ? item.slice(baseName.length) : "";
  const source = EXERCISE_CATALOG.find((e) => e.name === baseName);
  if (!source) return [];

  const excluded = new Set([baseName, ...excludeNames]);
  return EXERCISE_CATALOG
    .filter((e) => !excluded.has(e.name))
    .map((e) => {
      const sharedMuscles = e.muscleKeys.filter((k) => source.muscleKeys.includes(k)).length;
      const score = (e.pattern === source.pattern ? 3 : 0) + sharedMuscles;
      return { name: e.name, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((x) => x.name + suffix);
}
