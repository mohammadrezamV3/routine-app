import { isEn } from "@/lib/i18n";
import type { BlogCategoryKey } from "./types";

type BlogCategoryText = { label: string; title: string; intro: string };

/** دسته‌های بلاگ — هر دسته یک صفحه‌ی قابل‌ایندکس `/blog/category/[key]` دارد */
export const BLOG_CATEGORIES: Record<BlogCategoryKey, BlogCategoryText> = {
  routine: {
    label: "روتین روزانه",
    title: "مقاله‌های روتین روزانه",
    intro: "چطور یک روتین روزانه بسازیم که بعد از هفته‌ی اول هم بماند: روتین صبح، روتین شب و انتخاب ابزار مناسب.",
  },
  habits: {
    label: "عادت‌سازی",
    title: "مقاله‌های عادت‌سازی",
    intro: "ساختن عادت تازه، نگه‌داشتن استریک و برگشتن بعد از روزهایی که زنجیره می‌شکند.",
  },
  planning: {
    label: "برنامه‌ریزی",
    title: "مقاله‌های برنامه‌ریزی و تمرکز",
    intro: "برنامه‌ریزی روزانه، مدیریت زمان، تمرکز و برنامه‌ی درس خواندن؛ از لیست بلند تا روز قابل اجرا.",
  },
  sleep: {
    label: "خواب",
    title: "مقاله‌های خواب",
    intro: "چرخه‌های خواب، ساعت مناسب خوابیدن و بیدار شدن و ساختن یک برنامه‌ی خواب منظم.",
  },
  fitness: {
    label: "بدنسازی",
    title: "مقاله‌های بدنسازی و تمرین",
    intro: "نوشتن برنامه‌ی تمرینی، تقسیم روزهای تمرین و پیشرفت تدریجی برای مبتدی تا متوسط.",
  },
  nutrition: {
    label: "تغذیه و کالری",
    title: "مقاله‌های تغذیه و کالری",
    intro: "محاسبه‌ی کالری روزانه، BMR و TDEE، پروتئین و کسری کالری برای کاهش یا افزایش وزن.",
  },
  trading: {
    label: "ترید و فارکس",
    title: "مقاله‌های ترید و فارکس",
    intro: "ژورنال معاملاتی، مدیریت سرمایه، حجم لات، تقویم اقتصادی و سشن‌های فارکس به وقت ایران.",
  },
};

// نسخه‌ی انگلیسی دسته‌ها (فقط chrome سایت؛ خود مقاله‌ها فارسی می‌مانند).
// ساختار دقیقا با BLOG_CATEGORIES یکی است. ثابت سطح ماژول بدون tr().
const BLOG_CATEGORIES_EN: Record<BlogCategoryKey, BlogCategoryText> = {
  routine: {
    label: "Daily routine",
    title: "Daily routine articles",
    intro: "How to build a daily routine that lasts beyond the first week: a morning routine, an evening routine and choosing the right tools.",
  },
  habits: {
    label: "Habit building",
    title: "Habit-building articles",
    intro: "Building a new habit, keeping your streak going and getting back on track after the days your chain breaks.",
  },
  planning: {
    label: "Planning",
    title: "Planning and focus articles",
    intro: "Daily planning, time management, focus and a study plan; from a long list to a day you can actually carry out.",
  },
  sleep: {
    label: "Sleep",
    title: "Sleep articles",
    intro: "Sleep cycles, the right time to go to bed and wake up, and building a regular sleep plan.",
  },
  fitness: {
    label: "Workouts",
    title: "Workout and training articles",
    intro: "Writing a training plan, splitting training days and steady progress for beginner to intermediate lifters.",
  },
  nutrition: {
    label: "Nutrition and calories",
    title: "Nutrition and calorie articles",
    intro: "Calculating daily calories, BMR and TDEE, and protein and calorie deficits for losing or gaining weight.",
  },
  trading: {
    label: "Trading and forex",
    title: "Trading and forex articles",
    intro: "The trading journal, money management, lot size, the economic calendar and forex sessions in Tehran time.",
  },
};

/** متن دسته به زبان جاری: برای UI سایت (چیپ‌ها، کارت‌ها، کراست و متادیتا) */
export function localizedBlogCategory(key: BlogCategoryKey): BlogCategoryText {
  return isEn() ? BLOG_CATEGORIES_EN[key] : BLOG_CATEGORIES[key];
}

export const BLOG_CATEGORY_KEYS = Object.keys(BLOG_CATEGORIES) as BlogCategoryKey[];

export function isBlogCategory(v: string): v is BlogCategoryKey {
  return Object.prototype.hasOwnProperty.call(BLOG_CATEGORIES, v);
}
