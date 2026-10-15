// تایپ‌ها و منطق سبک کاتالوگ حرکات — بدون خود دیتا. کامپوننت‌هایی که فقط
// تایپ یا میزان سختی/تجهیزات لازم دارن از این فایل وارد کنن تا کل دیتای
// کاتالوگ (چند صد حرکت، `lib/exerciseCatalogData/*`) توی باندلشون نشینه.

import { normalizeFa } from "./utils";
import { tr } from "./i18n";

export type MuscleKey =
  | "chest" | "back" | "traps" | "shoulders" | "biceps" | "triceps" | "forearms"
  | "abs" | "obliques" | "glutes" | "quads" | "hamstrings" | "calves"
  | "cardio" | "fullbody" | "flexibility";

export type MovementPattern =
  | "squat" | "hinge" | "lunge" | "pressHorizontal" | "pressVertical"
  | "pullHorizontal" | "pullVertical" | "curl" | "extension" | "raise" | "fly"
  | "core" | "calf" | "cardio" | "explosive" | "flexibility";

export type ExerciseEquipment =
  | "barbell" | "dumbbell" | "cable" | "machine" | "smith" | "kettlebell"
  | "band" | "suspension" | "bodyweight" | "other";

export type ExerciseCatalogEntry = {
  name: string;
  muscleGroup: string;
  /** عضله‌ی اصلی اول، بعد عضلات کمکی. */
  muscleKeys: MuscleKey[];
  pattern: MovementPattern;
  howTo: string[];
  benefits: string;
  /** اسم‌های دیگه (انگلیسی یا فارسی رایج) — برای جستجو و تطبیق اسم حرکت‌های AI. */
  aliases?: string[];
  /** فقط وقتی تشخیص خودکار از روی اسم (`getExerciseEquipment`) اشتباه می‌شه. */
  equipment?: ExerciseEquipment;
  /** فقط وقتی سختی خودکار (`getExerciseDifficulty`) برای این حرکت درست درنمیاد (1 تا 5). */
  level?: number;
};

export const MUSCLE_KEYS: MuscleKey[] = [
  "chest", "back", "traps", "shoulders", "biceps", "triceps", "forearms",
  "abs", "obliques", "glutes", "quads", "hamstrings", "calves",
  "cardio", "fullbody", "flexibility",
];

export const MOVEMENT_PATTERNS: MovementPattern[] = [
  "squat", "hinge", "lunge", "pressHorizontal", "pressVertical",
  "pullHorizontal", "pullVertical", "curl", "extension", "raise", "fly",
  "core", "calf", "cardio", "explosive", "flexibility",
];

export const EQUIPMENT_LABEL: Record<ExerciseEquipment, string> = {
  get barbell() { return tr("هالتر", "Barbell"); },
  get dumbbell() { return tr("دمبل", "Dumbbell"); },
  get cable() { return tr("سیم‌کش", "Cable"); },
  get machine() { return tr("دستگاه", "Machine"); },
  get smith() { return tr("اسمیت", "Smith machine"); },
  get kettlebell() { return tr("کتل‌بل", "Kettlebell"); },
  get band() { return tr("کش", "Band"); },
  get suspension() { return "TRX"; },
  get bodyweight() { return tr("وزن بدن", "Bodyweight"); },
  get other() { return tr("سایر", "Other"); },
};

// میزان سختی (1 تا 5) بر اساس الگوی حرکتی حساب می‌شه — نه فیلد دستی روی
// تک‌تک حرکات، چون کاتالوگ صدها ورودی داره. حرکات چندمفصلی سنگین (هینج،
// کشش عمودی، انفجاری) پایه‌ی بالاتر می‌گیرن؛ کلیدواژه‌های اسم حرکت
// (هالتر=سنگین‌تر/تکنیکی‌تر، دستگاه/سیم‌کش/وزن‌بدن=مسیر کنترل‌شده‌تر یا
// ساده‌تر، تک‌پا/تک‌دست=تعادل اضافه) این پایه رو تنظیم می‌کنن. هر حرکتی که
// این قاعده براش درست درنمیاد `level` دستی داره.
const PATTERN_DIFFICULTY: Record<MovementPattern, number> = {
  squat: 3, hinge: 4, lunge: 3, pressHorizontal: 3, pressVertical: 3,
  pullHorizontal: 3, pullVertical: 4, curl: 2, extension: 2, raise: 2, fly: 2,
  core: 2, calf: 1, cardio: 2, explosive: 4, flexibility: 1,
};

export function getExerciseDifficulty(entry: ExerciseCatalogEntry): number {
  if (entry.level) return Math.max(1, Math.min(5, entry.level));
  let score = PATTERN_DIFFICULTY[entry.pattern] ?? 3;
  const n = entry.name;
  if (n.includes("هالتر") || n.includes("وزنه‌دار")) score += 1;
  if (n.includes("دستگاه") || n.includes("سیم‌کش") || n.includes("سیمکش")) score -= 1;
  if (n.includes("وزن بدن") || n.includes("با کش")) score -= 1;
  if (n.includes("تک‌پا") || n.includes("تک‌دست") || n.includes("بلغاری") || n.includes("معلق")) score += 1;
  return Math.max(1, Math.min(5, score));
}

// تجهیزات از روی اسم حرکت تشخیص داده می‌شه (اسم‌ها همیشه ابزار رو می‌گن)؛
// ترتیب مهمه: «پرس پا اسمیت» اسمیته نه دستگاه، «کتل‌بل» قبل از «کش».
const EQUIPMENT_RULES: [ExerciseEquipment, RegExp][] = [
  ["smith", /اسمیت/],
  ["suspension", /TRX|حلقه ژیمناستیک/],
  ["kettlebell", /کتل‌بل/],
  ["cable", /سیم‌کش|سیمکش|کراس‌اور|پول‌داون|فیس‌پول/],
  ["band", /با کش|کش مقاومتی|مینی‌بند/],
  ["dumbbell", /دمبل/],
  ["machine", /دستگاه|پک دک|هاک اسکوات|پرس پا|لگ کرل|لگ اکستنشن|اسکی ارگ|الپتیکال|تردمیل|دوچرخه ثابت|روئینگ|پله‌نوردی|ایربایک/],
  ["barbell", /هالتر|تی-بار|لندماین|ددلیفت|اسنچ|کلین|جرک|گود مورنینگ|رک پول/],
];

export function getExerciseEquipment(entry: ExerciseCatalogEntry): ExerciseEquipment {
  if (entry.equipment) return entry.equipment;
  for (const [eq, re] of EQUIPMENT_RULES) if (re.test(entry.name)) return eq;
  return entry.pattern === "flexibility" && /فوم|توپ/.test(entry.name) ? "other" : "bodyweight";
}

/** کلید مقایسه‌ی اسم‌ها: یکسان‌سازی ی/ک، حذف فاصله/نیم‌فاصله/خط تیره/پرانتز و حروف کوچک. */
export function exerciseNameKey(name: string): string {
  return normalizeFa(name).replace(/[\s\-–_()«»"'.،,/]+/g, "");
}

/** متن جستجوی یک حرکت: اسم + اسم‌های دیگه + گروه عضلانی، نرمال‌شده. */
export function exerciseSearchText(entry: ExerciseCatalogEntry): string {
  return normalizeFa([entry.name, ...(entry.aliases ?? []), entry.muscleGroup].join(" | "));
}

/** هر کلمه‌ی عبارت جستجو باید جایی در متن جستجوی حرکت باشه (ترتیب مهم نیست). */
export function matchesExerciseQuery(searchText: string, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  return normalizedQuery.split(/\s+/).every((w) => searchText.includes(w));
}
