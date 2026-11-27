// سئوی کتابخانه‌ی عمومی حرکات بدنسازی (/exercises). منطق خالص: اسلاگ پایدار، هاب
// عضله‌ها، حرکات مرتبط و JSON-LD. فقط در کد سرور (صفحه‌های server component) import
// بشه — کل کاتالوگ هیچ‌وقت نباید وارد باندل کلاینت بشه.
import { EXERCISE_CATALOG, getExerciseDifficulty, getExerciseEquipment, MUSCLE_KEYS } from "./exerciseCatalog";
import type { ExerciseCatalogEntry, MuscleKey } from "./exerciseCatalogMeta";
import { EXERCISE_EN, type ExerciseEn } from "./exerciseCatalogData/en";
import { tr } from "./i18n";
import { absoluteUrl } from "./seo";

export type ExerciseSeoItem = { slug: string; entry: ExerciseCatalogEntry };

/** اسلاگ‌هایی که با مسیرهای ثابت زیر /exercises برخورد می‌کنن. */
export const RESERVED_EXERCISE_SLUGS: readonly string[] = ["muscle", "page", "api", "opengraph-image"];

function kebab(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function hash36(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function baseSlug(entry: ExerciseCatalogEntry): string {
  const en = EXERCISE_EN[entry.name]?.name;
  let s = en ? kebab(en) : "";
  if (!s) {
    for (const a of entry.aliases ?? []) {
      s = kebab(a);
      if (s) break;
    }
  }
  return s || `exercise-${hash36(entry.name)}`;
}

let cache: { list: ExerciseSeoItem[]; bySlug: Map<string, ExerciseSeoItem>; byName: Map<string, string> } | null = null;

function build() {
  if (cache) return cache;
  const used = new Set<string>(RESERVED_EXERCISE_SLUGS);
  const list: ExerciseSeoItem[] = [];
  const bySlug = new Map<string, ExerciseSeoItem>();
  const byName = new Map<string, string>();
  for (const entry of EXERCISE_CATALOG) {
    if (byName.has(entry.name)) continue; // اسم فارسی تکراری = همون حرکت
    const base = baseSlug(entry);
    let slug = base;
    for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
    used.add(slug);
    const item = { slug, entry };
    list.push(item);
    bySlug.set(slug, item);
    byName.set(entry.name, slug);
  }
  cache = { list, bySlug, byName };
  return cache;
}

export function exerciseSlug(entry: ExerciseCatalogEntry): string {
  return build().byName.get(entry.name) ?? baseSlug(entry);
}

export function allExerciseSeo(): ExerciseSeoItem[] {
  return build().list;
}

export function exerciseBySlug(slug: string): ExerciseSeoItem | undefined {
  return build().bySlug.get(slug);
}

export function exerciseEn(entry: ExerciseCatalogEntry): ExerciseEn | undefined {
  return EXERCISE_EN[entry.name];
}

/** اسم لاتین نمایشی: ترجمه‌ی کاتالوگ، وگرنه اولین نام مستعار لاتین. */
export function exerciseEnglishName(entry: ExerciseCatalogEntry): string {
  const en = EXERCISE_EN[entry.name]?.name;
  if (en) return en;
  return (entry.aliases ?? []).find((a) => /^[\x20-\x7E]+$/.test(a)) ?? "";
}

// ---------------------------------------------------------------- هاب عضله‌ها

/** هاب‌های ترکیبی: چند عضله در یک صفحه (اسلاگ قابل برخورد با اسلاگ حرکت‌ها نیست چون زیر /muscle/ هستن). */
export type MergedHubKey = "legs" | "arms";
export type HubKey = MuscleKey | MergedHubKey;
export const MERGED_HUBS: Record<MergedHubKey, MuscleKey[]> = {
  legs: ["quads", "hamstrings", "glutes", "calves"],
  arms: ["biceps", "triceps", "forearms"],
};
export function isMergedHub(k: HubKey): k is MergedHubKey {
  return k === "legs" || k === "arms";
}

type MuscleSeoDef = { fa: string; en: string; hubFa: string; hubEn: string; introFa: string; introEn: string };

const MERGED_DEFS: Record<MergedHubKey, MuscleSeoDef> = {
  legs: {
    fa: "پا", en: "Legs", hubFa: "حرکات بدنسازی پا", hubEn: "Leg exercises",
    introFa: "تمرین پا چهار گروه اصلی رو شامل می‌شه: جلوران، پشت ران، سرینی و ساق. اسکوات، پرس پا، لانج، ددلیفت رومانیایی، هیپ‌تراست و ساق ایستاده از رایج‌ترین حرکات بدنسازی پا هستن. حرکات هر گروه رو جدا با روش اجرا ببین.",
    introEn: "Leg training covers four main groups: quads, hamstrings, glutes and calves. Squats, leg presses, lunges, Romanian deadlifts, hip thrusts and standing calf raises are among the most common leg exercises. See each group's exercises with instructions.",
  },
  arms: {
    fa: "بازو", en: "Arms", hubFa: "حرکات بدنسازی بازو", hubEn: "Arm exercises",
    introFa: "تمرین بازو سه گروه رو شامل می‌شه: جلوبازو، پشت‌بازو و ساعد. جلوبازو با حرکات خم‌کردن آرنج و پشت‌بازو با حرکات صاف‌کردن آرنج کار می‌کنه و ساعد قدرت گرفتن رو بالا می‌بره. حرکات هر گروه رو با روش اجرا ببین.",
    introEn: "Arm training covers three groups: biceps, triceps and forearms. The biceps work by bending the elbow, the triceps by straightening it, and the forearms build grip strength. See each group's exercises with instructions.",
  },
};

const MUSCLE_DEFS: Record<MuscleKey, MuscleSeoDef> = {
  chest: {
    fa: "سینه", en: "Chest", hubFa: "حرکات بدنسازی سینه", hubEn: "Chest exercises",
    introFa: "عضلات سینه در پرس‌ها، فلای‌ها و شنا کار می‌کنن. با زاویه‌های مختلف (تخت، شیب‌دار مثبت و منفی) بخش‌های بالا، میانه و پایین سینه رو متفاوت درگیر می‌کنی. در این فهرست حرکات سینه با هالتر، دمبل، سیم‌کش، دستگاه و وزن بدن رو با روش اجرای قدم‌به‌قدم می‌بینی.",
    introEn: "The chest muscles work in presses, flys and push-ups. Different angles (flat, incline, decline) load the upper, middle and lower chest differently. This list covers chest exercises with barbell, dumbbell, cable, machine and bodyweight, each with step-by-step instructions.",
  },
  back: {
    fa: "پشت", en: "Back", hubFa: "حرکات بدنسازی پشت", hubEn: "Back exercises",
    introFa: "عضلات پشت شامل لت‌ها، ذوزنقه‌ی میانی و عضلات راست‌کننده‌ی ستون فقرات می‌شن و در حرکات کششی مثل بارفیکس، پول‌داون و روئینگ کار می‌کنن. حرکات کشش عمودی بیشتر پهنای پشت و حرکات کشش افقی بیشتر ضخامت پشت رو هدف می‌گیرن. روش اجرای هر حرکت پشت رو اینجا ببین.",
    introEn: "The back includes the lats, mid traps and spinal erectors, and works in pulling movements such as pull-ups, pulldowns and rows. Vertical pulls target back width while horizontal pulls target thickness. See how to perform each back exercise here.",
  },
  traps: {
    fa: "ذوزنقه", en: "Traps", hubFa: "حرکات بدنسازی ذوزنقه", hubEn: "Trap exercises",
    introFa: "عضله‌ی ذوزنقه از پایین جمجمه تا میانه‌ی پشت کشیده شده و در بالا کشیدن شانه‌ها و جمع‌کردن کتف‌ها نقش داره. شراگ‌ها و کشش‌های نزدیک به بدن رایج‌ترین حرکات ذوزنقه‌ان. فهرست حرکات این عضله با توضیح اجرا رو ببین.",
    introEn: "The trapezius runs from the base of the skull to the middle of the back and helps lift the shoulders and pull the shoulder blades together. Shrugs and close pulls are the most common trap exercises. Browse them here with execution notes.",
  },
  shoulders: {
    fa: "سرشانه", en: "Shoulders", hubFa: "حرکات بدنسازی سرشانه", hubEn: "Shoulder exercises",
    introFa: "سرشانه سه بخش جلو، میانی و پشتی داره. پرس‌های بالای سر بیشتر بخش جلو، نشرها بخش میانی و حرکات فیس‌پول و نشر خم بخش پشتی رو هدف می‌گیرن. تمرین سرشانه با دمبل، هالتر، سیم‌کش و دستگاه رو با روش اجرا در این فهرست پیدا می‌کنی.",
    introEn: "The shoulders have front, side and rear parts. Overhead presses mainly hit the front, lateral raises the side, and face pulls and bent-over raises the rear. Find shoulder exercises with dumbbells, barbells, cables and machines here, with instructions.",
  },
  biceps: {
    fa: "جلوبازو", en: "Biceps", hubFa: "حرکات بدنسازی جلوبازو", hubEn: "Biceps exercises",
    introFa: "جلوبازو در خم‌کردن آرنج و چرخاندن ساعد کار می‌کنه. حرکات جلوبازو با هالتر، دمبل، سیم‌کش و دستگاه با گرفتن‌های مختلف انجام می‌شن و هر کدوم تاکید کمی متفاوتی دارن. این‌جا روش اجرای همه‌ی حرکات جلوبازو رو می‌بینی.",
    introEn: "The biceps bend the elbow and rotate the forearm. Biceps exercises with barbells, dumbbells, cables and machines use different grips, each with a slightly different emphasis. See how to perform every biceps exercise here.",
  },
  triceps: {
    fa: "پشت‌بازو", en: "Triceps", hubFa: "حرکات بدنسازی پشت‌بازو", hubEn: "Triceps exercises",
    introFa: "پشت‌بازو سه سر داره و بخش بزرگ حجم بازو رو می‌سازه. صاف‌کردن آرنج در حرکاتی مثل پرس‌بسته، دیپ، پشت‌بازوی سیم‌کش و پشت‌بازوی خوابیده اون رو درگیر می‌کنه. فهرست کامل حرکات پشت‌بازو رو با روش اجرا ببین.",
    introEn: "The triceps have three heads and make up most of the upper arm's size. Straightening the elbow in close-grip presses, dips, cable pushdowns and lying extensions works them. See the full list of triceps exercises with instructions.",
  },
  forearms: {
    fa: "ساعد", en: "Forearms", hubFa: "حرکات بدنسازی ساعد", hubEn: "Forearm exercises",
    introFa: "عضلات ساعد قدرت گرفتن و مچ دست رو تعیین می‌کنن و تقریبا در همه‌ی حرکات کششی کار می‌کنن. حرکات مچ و گرفتن مستقیم ساعد رو هدف می‌گیرن. روش اجرای این حرکات رو در ادامه ببین.",
    introEn: "The forearm muscles determine grip strength and wrist control and work in almost every pulling movement. Wrist and grip exercises target them directly. See how to perform them below.",
  },
  abs: {
    fa: "شکم", en: "Abs", hubFa: "حرکات بدنسازی شکم", hubEn: "Abs exercises",
    introFa: "عضلات شکم ستون فقرات رو پایدار نگه می‌دارن و در خم‌کردن و ثابت‌نگه‌داشتن تنه کار می‌کنن. حرکات شکم از کرانچ و بالا آوردن پا تا پلانک و چرخ شکم رو شامل می‌شن. فهرست کامل تمرین شکم با روش اجرا این‌جاست.",
    introEn: "The abdominal muscles stabilise the spine and work in flexing and bracing the torso. Abs exercises range from crunches and leg raises to planks and ab wheel rollouts. The full list with instructions is here.",
  },
  obliques: {
    fa: "پهلو", en: "Obliques", hubFa: "حرکات بدنسازی پهلو", hubEn: "Oblique exercises",
    introFa: "عضلات مایل شکم (پهلو) در چرخش و خم‌شدن به طرفین تنه کار می‌کنن و به پایداری میانه‌ی بدن کمک می‌کنن. حرکات پهلو با چرخش، خم‌شدن جانبی و پلانک جانبی انجام می‌شن. روش اجرا رو در ادامه ببین.",
    introEn: "The obliques work in rotating and side-bending the torso and help stabilise the midsection. Oblique exercises use twisting, side bends and side planks. See how to perform them below.",
  },
  glutes: {
    fa: "سرینی", en: "Glutes", hubFa: "حرکات بدنسازی سرینی", hubEn: "Glute exercises",
    introFa: "عضلات سرینی بزرگ‌ترین عضلات پایین‌تنه‌ان و در بلند شدن از حالت نشسته، قدم برداشتن و پرش نقش اصلی دارن. هیپ‌تراست، اسکوات، لانج و ددلیفت رومانیایی از حرکات رایج تمرین سرینی‌اند. روش اجرای همه‌شون این‌جاست.",
    introEn: "The glutes are the largest lower-body muscles and play the main role in standing up, stepping and jumping. Hip thrusts, squats, lunges and Romanian deadlifts are common glute exercises. Instructions for all of them are here.",
  },
  quads: {
    fa: "جلوران", en: "Quads", hubFa: "حرکات بدنسازی پا (جلوران)", hubEn: "Leg exercises (quads)",
    introFa: "چهارسر ران عضله‌ی جلوی ران و بخش اصلی تمرین پاست. اسکوات، پرس پا، لانج و جلو پا دستگاه رایج‌ترین حرکات بدنسازی پا برای جلوران‌ان. فهرست حرکات پا برای جلوران رو با روش اجرا ببین.",
    introEn: "The quadriceps are the front-thigh muscles and the core of leg training. Squats, leg presses, lunges and leg extensions are the most common leg exercises for the quads. See the list with instructions.",
  },
  hamstrings: {
    fa: "پشت ران", en: "Hamstrings", hubFa: "حرکات بدنسازی پا (پشت ران)", hubEn: "Leg exercises (hamstrings)",
    introFa: "عضلات پشت ران در خم‌کردن زانو و باز کردن لگن کار می‌کنن. ددلیفت رومانیایی، لگ کرل و گود مورنینگ از حرکات اصلی پشت ران در تمرین پا هستن. روش اجرای حرکات پشت ران این‌جاست.",
    introEn: "The hamstrings work in bending the knee and extending the hip. Romanian deadlifts, leg curls and good mornings are main hamstring exercises in leg training. See how to perform them here.",
  },
  calves: {
    fa: "ساق پا", en: "Calves", hubFa: "حرکات بدنسازی ساق پا", hubEn: "Calf exercises",
    introFa: "ساق پا در بالا آمدن روی پنجه کار می‌کنه و در راه‌رفتن، دویدن و پرش نقش داره. ساق ایستاده و نشسته دو حرکت پایه‌ی این عضله‌ان. فهرست حرکات ساق با روش اجرا در ادامه اومده.",
    introEn: "The calves work when rising onto the toes and play a role in walking, running and jumping. Standing and seated calf raises are the two basic exercises for this muscle. The list with instructions follows.",
  },
  cardio: {
    fa: "هوازی", en: "Cardio", hubFa: "حرکات هوازی و کاردیو", hubEn: "Cardio exercises",
    introFa: "حرکات هوازی ضربان قلب رو بالا می‌برن و برای استقامت و سوزاندن کالری استفاده می‌شن. از دویدن و طناب تا روئینگ و دوچرخه رو در این فهرست می‌بینی. روش اجرای هر حرکت رو بخون.",
    introEn: "Cardio exercises raise your heart rate and are used for endurance and burning calories. From running and jump rope to rowing and cycling, you will find them in this list. Read how to perform each one.",
  },
  fullbody: {
    fa: "تمام بدن", en: "Full body", hubFa: "حرکات تمام بدن", hubEn: "Full-body exercises",
    introFa: "حرکات تمام بدن چند گروه عضلانی رو هم‌زمان درگیر می‌کنن و برای تمرین‌های فشرده و کم‌زمان مناسب‌ان. روش اجرای این حرکات چندمفصلی رو در این فهرست ببین.",
    introEn: "Full-body exercises train several muscle groups at once and suit short, intense workouts. See how to perform these compound movements in this list.",
  },
  flexibility: {
    fa: "انعطاف‌پذیری", en: "Flexibility", hubFa: "حرکات کششی و انعطاف‌پذیری", hubEn: "Stretching and flexibility exercises",
    introFa: "حرکات کششی و تحرک‌پذیری دامنه‌ی حرکتی مفاصل رو بهتر می‌کنن و برای گرم‌کردن و سرد‌کردن بدن استفاده می‌شن. روش اجرای این حرکات رو در ادامه ببین.",
    introEn: "Stretching and mobility exercises improve joint range of motion and are used for warming up and cooling down. See how to perform them below.",
  },
};

export type MuscleHub = { key: HubKey; slug: string; count: number; primaryCount: number };

const defOf = (k: HubKey): MuscleSeoDef => (isMergedHub(k) ? MERGED_DEFS[k] : MUSCLE_DEFS[k]);

export function muscleLabelSeo(k: HubKey): string {
  const d = defOf(k);
  return tr(d.fa, d.en);
}
export function muscleHubTitle(k: HubKey): string {
  const d = defOf(k);
  return tr(d.hubFa, d.hubEn);
}
export function muscleIntro(k: HubKey): string {
  const d = defOf(k);
  return tr(d.introFa, d.introEn);
}

/** حرکاتی که عضله‌ی اصلیشون این کلید (یا یکی از عضله‌های هاب ترکیبی) باشه، بعد حرکاتی که فقط کمکی دارنش. */
export function exercisesForMuscle(key: HubKey): { primary: ExerciseSeoItem[]; secondary: ExerciseSeoItem[] } {
  const set = new Set<MuscleKey>(isMergedHub(key) ? MERGED_HUBS[key] : [key]);
  const primary: ExerciseSeoItem[] = [];
  const secondary: ExerciseSeoItem[] = [];
  for (const it of allExerciseSeo()) {
    const ks = it.entry.muscleKeys;
    if (set.has(ks[0])) primary.push(it);
    else if (ks.some((k) => set.has(k))) secondary.push(it);
  }
  return { primary, secondary };
}

/** هاب‌های ترکیبی اول، بعد یک هاب برای هر عضله‌ای که حرکت داره. اسلاگ = خود کلید. */
export function muscleHubs(): MuscleHub[] {
  const hubs: MuscleHub[] = [];
  for (const key of [...(Object.keys(MERGED_HUBS) as MergedHubKey[]), ...MUSCLE_KEYS] as HubKey[]) {
    const { primary, secondary } = exercisesForMuscle(key);
    if (!primary.length) continue;
    hubs.push({ key, slug: key, count: primary.length + secondary.length, primaryCount: primary.length });
  }
  return hubs;
}

export function muscleBySlug(slug: string): HubKey | undefined {
  return muscleHubs().find((h) => h.slug === slug)?.key;
}

/** حرکات مرتبط: هم‌عضله‌ی اصلی، بعد هم‌الگوی حرکتی؛ از جای خود حرکت می‌چرخه تا گراف لینک‌ها یک‌دست پخش بشه. */
export function relatedExercises(entry: ExerciseCatalogEntry, n: number): ExerciseSeoItem[] {
  const all = allExerciseSeo();
  const idx = all.findIndex((i) => i.entry.name === entry.name);
  const rotated = idx < 0 ? all : [...all.slice(idx + 1), ...all.slice(0, idx)];
  const primary = entry.muscleKeys[0];
  const out: ExerciseSeoItem[] = [];
  const take = (pred: (e: ExerciseCatalogEntry) => boolean) => {
    for (const it of rotated) {
      if (out.length >= n) return;
      if (it.entry.name === entry.name || out.includes(it)) continue;
      if (pred(it.entry)) out.push(it);
    }
  };
  take((e) => e.muscleKeys[0] === primary && e.pattern === entry.pattern);
  take((e) => e.muscleKeys[0] === primary);
  take((e) => e.pattern === entry.pattern);
  return out;
}

/** همه‌ی مسیرهای عمومی کتابخانه — برای sitemap. */
export function EXERCISE_SEO_PATHS(): string[] {
  return [
    "/exercises",
    ...muscleHubs().map((h) => `/exercises/muscle/${h.slug}`),
    ...allExerciseSeo().map((i) => `/exercises/${i.slug}`),
  ];
}

export const POPULAR_EXERCISE_NAMES = [
  "اسکوات هالتر", "پرس سینه هالتر", "ددلیفت", "بارفیکس", "پرس سرشانه دمبل", "جلوبازو هالتر",
  "پلانک", "هیپ تراست", "لانج با دمبل", "شنا سوئدی",
];

// ------------------------------------------------------------------ متن‌ها

export function difficultyText(level: number): string {
  const fa = ["", "خیلی آسان", "آسان", "متوسط", "سخت", "خیلی سخت"][level] ?? "متوسط";
  const en = ["", "Very easy", "Easy", "Moderate", "Hard", "Very hard"][level] ?? "Moderate";
  return tr(fa, en);
}

export function exerciseFacts(entry: ExerciseCatalogEntry) {
  return { level: getExerciseDifficulty(entry), equipment: getExerciseEquipment(entry) };
}

type JsonLd = Record<string, unknown>;

/** HowTo (schema.org) برای یک حرکت. */
export function howToJsonLd({
  name, description, steps, path,
}: { name: string; description: string; steps: string[]; path: string }): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    url: absoluteUrl(path),
    step: steps.map((text, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: text.length > 80 ? `${text.slice(0, 77).trimEnd()}...` : text,
      text,
    })),
  };
}
