// داده‌ی سئوی جدول کالری غذاها — خالص (بدون tr و بدون React). متن‌های قابل‌نمایش در صفحه‌ها با tr ساخته می‌شن؛
// این‌جا فقط داده و محاسبه‌ست. منبع کالری: FOOD_SEED (دست نمی‌خوره) و نام انگلیسی: FOOD_NAME_EN.
import { FOOD_SEED } from "@/lib/foodSeed";
import { FOOD_NAME_EN } from "@/lib/foodNamesEn";

export type FoodCategoryKey =
  | "grains"
  | "iranian"
  | "protein"
  | "dairy"
  | "fruit"
  | "vegetables"
  | "legumes"
  | "nuts"
  | "snacks"
  | "sweets"
  | "fastfood"
  | "drinks";

export type FoodSeo = {
  slug: string;
  fa: string;
  en: string;
  kcal: number;
  category: FoodCategoryKey;
};

export type FoodCategory = {
  key: FoodCategoryKey;
  fa: string;
  en: string;
  items: FoodSeo[];
};

// ترتیب = ترتیب نمایش در صفحه‌ی جدول
const CATEGORY_META: { key: FoodCategoryKey; fa: string; en: string }[] = [
  { key: "grains", fa: "نان، برنج، غلات و پاستا", en: "Bread, rice, grains and pasta" },
  { key: "iranian", fa: "غذاهای اصلی ایرانی", en: "Iranian main dishes" },
  { key: "protein", fa: "پروتئین و گوشت", en: "Protein and meat" },
  { key: "dairy", fa: "لبنیات", en: "Dairy" },
  { key: "fruit", fa: "میوه‌ها", en: "Fruit" },
  { key: "vegetables", fa: "سبزیجات", en: "Vegetables" },
  { key: "legumes", fa: "حبوبات و کنسرو", en: "Legumes and canned foods" },
  { key: "nuts", fa: "خشکبار و مغزها", en: "Dried fruit and nuts" },
  { key: "snacks", fa: "تنقلات و خوراکی‌ها", en: "Snacks" },
  { key: "sweets", fa: "روغن، چاشنی و شیرینی", en: "Oils, condiments and sweets" },
  { key: "fastfood", fa: "فست‌فود و غذاهای بین‌المللی", en: "Fast food and international dishes" },
  { key: "drinks", fa: "نوشیدنی‌ها", en: "Drinks" },
];

// نگاشت صریح نام فارسی به دسته؛ هم‌ترتیب با بخش‌های کامنت‌دار lib/foodSeed.ts (کنسرو به حبوبات رفته)
const CATEGORY_OF: Record<FoodCategoryKey, string[]> = {
  grains: [
    "برنج پخته",
    "برنج قهوه‌ای پخته",
    "نان لواش",
    "نان سنگک",
    "نان بربری",
    "نان تافتون",
    "نان باگت",
    "نان تست",
    "نان سبوس‌دار",
    "ماکارونی پخته",
    "اسپاگتی پخته",
    "رشته آش",
    "نودل پخته",
    "جو دوسر خام",
    "جو دوسر پخته (فرنی)",
    "بلغور گندم پخته",
    "کینوا پخته",
    "ذرت پخته",
    "پاپ‌کورن ساده",
    "کورن‌فلکس",
  ],
  dairy: [
    "ماست کم‌چرب",
    "ماست پرچرب",
    "ماست یونانی",
    "ماست موسیر",
    "دوغ",
    "کشک",
    "پنیر لاکتیک",
    "پنیر سفید ایرانی",
    "پنیر پیتزا",
    "پنیر خامه‌ای",
    "پنیر پروسس",
    "کره حیوانی",
    "کره گیاهی",
    "خامه صبحانه",
    "شیر کم‌چرب",
    "شیر پرچرب",
    "شیر کاکائو",
    "بستنی وانیلی",
    "بستنی سنتی",
  ],
  protein: [
    "سینه مرغ گریل",
    "سینه مرغ سوخاری",
    "ران مرغ کبابی",
    "جوجه‌کباب",
    "مرغ سوخاری فست‌فودی",
    "گوشت قرمز کبابی",
    "گوشت چرخ‌کرده کبابی",
    "کباب کوبیده",
    "جگر مرغ سرخ‌شده",
    "جگر گوسفندی کبابی",
    "دل و قلوه کبابی",
    "ماهی سالمون گریل",
    "ماهی قزل‌آلا کبابی",
    "ماهی تیلاپیا گریل",
    "ماهی کنسروی (تن)",
    "میگو گریل",
    "تخم‌مرغ آب‌پز",
    "تخم‌مرغ نیمرو",
    "املت",
    "کالباس مرغ",
    "کالباس گوشت",
    "سوسیس",
    "ژامبون",
  ],
  legumes: [
    "عدس پخته",
    "نخود پخته",
    "لوبیا قرمز پخته",
    "لوبیا چیتی پخته",
    "لوبیا سفید پخته",
    "لپه پخته",
    "ماش پخته",
    "سویا پخته",
    "کنسرو لوبیا",
    "کنسرو ذرت",
  ],
  fruit: [
    "موز",
    "سیب",
    "پرتقال",
    "نارنگی",
    "انگور",
    "هندوانه",
    "خربزه",
    "طالبی",
    "گلابی",
    "هلو",
    "شلیل",
    "آلبالو",
    "گیلاس",
    "انار",
    "خرما",
    "کیوی",
    "آناناس",
    "انبه",
    "توت‌فرنگی",
    "زردآلو",
    "گریپ‌فروت",
    "لیمو ترش",
    "لیموشیرین",
    "نارگیل تازه",
    "هلو کمپوتی",
    "ازگیل",
    "به",
  ],
  vegetables: [
    "خیار",
    "گوجه‌فرنگی",
    "کاهو",
    "فلفل دلمه‌ای",
    "پیاز",
    "سیر",
    "هویج",
    "کدو سبز",
    "بادمجان کبابی",
    "اسفناج پخته",
    "کلم بروکلی بخارپز",
    "کلم سفید",
    "قارچ سرخ‌شده",
    "قارچ خام",
    "ذرت شیرین",
    "لوبیا سبز پخته",
    "سیب‌زمینی پخته",
    "سیب‌زمینی سرخ‌کرده",
    "پوره سیب‌زمینی",
    "چغندر پخته",
    "کرفس",
    "تربچه",
    "کدو حلوایی پخته",
    "سبزیجات بخارپز",
    "سبزی خوردن",
    "ترشی مخلوط",
  ],
  nuts: [
    "بادام",
    "گردو",
    "پسته",
    "فندق",
    "بادام‌زمینی خام",
    "بادام‌زمینی برشته نمکی",
    "بادام هندی برشته",
    "کشمش",
    "انجیر خشک",
    "زردآلو خشک",
    "توت خشک",
    "نارگیل خشک",
    "تخمه آفتابگردان",
    "تخمه هندوانه",
    "تخمه کدو",
    "آجیل خام مخلوط",
    "آجیل شور مخلوط",
    "نخودچی و کشمش",
    "نخود برشته",
  ],
  sweets: [
    "روغن زیتون",
    "روغن آفتابگردان",
    "روغن کنجد",
    "کره بادام‌زمینی",
    "سس مایونز",
    "سس کچاپ",
    "سس باربیکیو",
    "رب گوجه‌فرنگی",
    "رب انار",
    "عسل",
    "مربا",
    "شکر",
    "سرکه",
    "زیتون پرورده",
    "خیارشور",
    "سیر ترشی",
  ],
  drinks: [
    "چای (بدون شکر)",
    "قهوه (بدون شکر)",
    "نوشابه گازدار",
    "نوشابه رژیمی",
    "آب‌میوه صنعتی",
    "آب پرتقال طبیعی",
    "نوشیدنی انرژی‌زا",
    "دلستر",
    "شربت آبلیمو",
    "شربت سکنجبین",
    "شربت خاکشیر",
    "شربت آلبالو",
  ],
  iranian: [
    "چلوکباب کوبیده",
    "زرشک‌پلو با مرغ",
    "قورمه‌سبزی",
    "قیمه",
    "فسنجان",
    "کوکو سبزی",
    "دلمه برگ مو",
    "آش رشته",
    "دیزی",
    "کشک بادمجان",
    "میرزا قاسمی",
    "ته‌چین مرغ",
    "باقالی پلو با گوشت",
    "عدس‌پلو",
    "لوبیا پلو",
    "خورش کرفس",
    "خورش بادمجان",
    "آبگوشت",
    "کله‌جوش",
    "حلیم",
    "کتلت",
    "شامی کباب",
    "کوفته تبریزی",
    "فلافل",
    "ساندویچ کالباس",
    "پیراشکی گوشت",
  ],
  fastfood: [
    "پیتزا مخلوط",
    "پیتزا مارگاریتا",
    "پاستا آلفردو",
    "پاستا بولونیز",
    "سوشی (رول کالیفرنیا)",
    "همبرگر گوشت",
    "چیزبرگر",
    "ساندویچ مرغ",
    "هات‌داگ",
    "تاکو گوشت",
    "بوریتو مرغ",
    "پنکیک",
    "وافل",
    "کروسان",
    "دونات",
    "سالاد سزار با مرغ",
    "سالاد الویه",
    "سالاد فصل",
    "رامن مرغ",
    "پاد تای",
    "کاری مرغ هندی",
    "حمص",
    "فلافل عربی",
    "شاورما مرغ",
    "لازانیا",
    "بستنی مک‌فلوری",
    "سیب‌زمینی سرخ‌کرده فست‌فودی",
    "ناگت مرغ",
    "سوپ جو",
    "سوپ قارچ",
  ],
  snacks: [
    "چیپس سیب‌زمینی",
    "پفک نمکی",
    "چیپس و پنیر",
    "لیز",
    "پسته خندان",
    "کشک و بادمجان اسنکی",
    "بیسکویت ساده",
    "کیک یزدی",
    "کیک کاکائویی بسته‌بندی",
    "کیک رولت",
    "ویفر",
    "شکلات تلخ",
    "شکلات شیری",
    "تافی",
    "آدامس",
    "پاستیل",
    "مارشمالو",
    "نبات",
    "گز اصفهان",
    "سوهان قم",
    "قطاب یزد",
    "کلوچه فومنی",
    "باقلوا",
    "زولبیا",
    "بامیه",
    "حلوا ارده",
    "حلوا شکری",
    "آب‌نبات چوبی",
    "چوب شور",
    "کراکر نمکی",
    "پفیلا",
    "چیز بال",
    "پاپکورن کارامل",
    "کوکی شکلاتی",
    "دونات پودری",
    "کیک اسفنجی خانگی",
  ],
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/%/g, " percent ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** اسلاگ پایدار و یکتا از نام انگلیسی (در برخورد، پسوند عددی به ترتیب فهرست) */
export function foodSlug(item: { fa: string; en?: string }): string {
  return slugify(item.en || FOOD_NAME_EN[item.fa] || "") || "food";
}

function build(): FoodSeo[] {
  const catByName = new Map<string, FoodCategoryKey>();
  for (const key of Object.keys(CATEGORY_OF) as FoodCategoryKey[]) {
    for (const n of CATEGORY_OF[key]) catByName.set(n, key);
  }
  const used = new Set<string>();
  const out: FoodSeo[] = [];
  for (const f of FOOD_SEED) {
    const category = catByName.get(f.name);
    if (!category) continue;
    const en = FOOD_NAME_EN[f.name] || f.name;
    const base = foodSlug({ fa: f.name, en });
    let slug = base;
    for (let i = 2; used.has(slug); i++) slug = `${base}-${i}`;
    used.add(slug);
    out.push({ slug, fa: f.name, en, kcal: f.caloriesPer100g, category });
  }
  return out;
}

let cache: FoodSeo[] | null = null;

export function allFoodSeo(): FoodSeo[] {
  return (cache ??= build());
}

export function foodBySlug(slug: string): FoodSeo | undefined {
  return allFoodSeo().find((f) => f.slug === slug);
}

export function foodCategories(): FoodCategory[] {
  const all = allFoodSeo();
  return CATEGORY_META.map((c) => ({
    ...c,
    items: all
      .filter((f) => f.category === c.key)
      .sort((a, b) => a.fa.localeCompare(b.fa, "fa")),
  })).filter((c) => c.items.length > 0);
}

export function categoryMeta(key: FoodCategoryKey) {
  return CATEGORY_META.find((c) => c.key === key)!;
}

export const PORTION_GRAMS = [50, 100, 150, 200, 250] as const;

export function portionTable(kcalPer100: number): { grams: number; kcal: number }[] {
  return PORTION_GRAMS.map((grams) => ({ grams, kcal: Math.round((kcalPer100 * grams) / 100) }));
}

/** وزن فرض‌شده برای محاسبه‌ی مصرف انرژی (کیلوگرم) */
export const BURN_WEIGHT_KG = 70;
export const MET_WALKING = 3.5;
export const MET_RUNNING = 9.8;
export const MET_CYCLING = 7.5;

/** دقیقه‌ی لازم برای سوزاندن kcal با MET × وزن × ساعت */
export function burnMinutes(kcal: number): { walking: number; running: number; cycling: number } {
  const k = Math.max(0, kcal);
  const m = (met: number) => Math.round((k / (met * BURN_WEIGHT_KG)) * 60);
  return { walking: m(MET_WALKING), running: m(MET_RUNNING), cycling: m(MET_CYCLING) };
}

/** n غذای هم‌دسته با نزدیک‌ترین کالری (پایدار: تساوی با ترتیب فهرست) */
export function similarFoods(item: FoodSeo, n = 6): FoodSeo[] {
  return allFoodSeo()
    .filter((f) => f.category === item.category && f.slug !== item.slug)
    .map((f, i) => ({ f, i, d: Math.abs(f.kcal - item.kcal) }))
    .sort((a, b) => a.d - b.d || a.i - b.i)
    .slice(0, n)
    .map((x) => x.f);
}

/** میانگین کالری هر 100 گرم یک دسته */
export function categoryAverage(key: FoodCategoryKey): number {
  const xs = allFoodSeo().filter((f) => f.category === key);
  return Math.round(xs.reduce((s, f) => s + f.kcal, 0) / Math.max(1, xs.length));
}

export const FOOD_HUB_PATH = "/food-calories";

export function foodPath(slug: string): string {
  return `${FOOD_HUB_PATH}/${slug}`;
}

/** همه‌ی مسیرها برای sitemap: هاب + هر غذا */
export function FOOD_SEO_PATHS(): string[] {
  return [FOOD_HUB_PATH, ...allFoodSeo().map((f) => foodPath(f.slug))];
}
