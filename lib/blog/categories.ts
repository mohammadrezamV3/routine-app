import type { BlogCategoryKey } from "./types";

/** دسته‌های بلاگ — هر دسته یک صفحه‌ی قابل‌ایندکس `/blog/category/[key]` دارد */
export const BLOG_CATEGORIES: Record<BlogCategoryKey, { label: string; title: string; intro: string }> = {
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

export const BLOG_CATEGORY_KEYS = Object.keys(BLOG_CATEGORIES) as BlogCategoryKey[];

export function isBlogCategory(v: string): v is BlogCategoryKey {
  return Object.prototype.hasOwnProperty.call(BLOG_CATEGORIES, v);
}
