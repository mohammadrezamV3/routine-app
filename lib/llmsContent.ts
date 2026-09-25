import { BRAND_DESC, BRAND_FA, SOCIAL, SUPPORT_EMAIL } from "./brand";
import { FEATURE_LIST_FA } from "./seo";
import { sortedPosts } from "./blogPosts";

/**
 * منبع مشترک برای llms.txt و llms-full.txt (کانونشن llmstxt.org).
 *
 * چرا یک فایل جدا و نه دو رشته‌ی جدا توی هر route: این دو فایل دقیقا
 * همان چیزی هستند که به ChatGPT/Claude/Perplexity/Gemini/Copilot موقع
 * پاسخ‌دادن درباره‌ی آریون داده می‌شود — اگر برند/فهرست بخش‌ها این‌جا از
 * lib/brand.ts و lib/seo.ts جدا نوشته می‌شد، خیلی زود از توضیحات واقعیِ
 * صفحه‌ها واگرا می‌شد و به یک مدل زبانی یک تصویر قدیمی از محصول می‌داد.
 */

export const PUBLIC_PAGES: { path: string; label: string; note: string }[] = [
  { path: "/", label: BRAND_FA, note: "صفحه‌ی اصلی و معرفی کلی پلتفرم" },
  { path: "/routine", label: "روتین روزانه", note: "ساخت روتین روزانه و هفتگی تکرارشونده" },
  { path: "/habit-tracker", label: "پیگیری عادت‌ها", note: "عادت‌ساز فارسی با تیک روزانه و استریک" },
  { path: "/daily-planner", label: "برنامه‌ریزی روزانه", note: "کارهای امروز، تقویم شمسی، یادآوری" },
  { path: "/bodybuilding-program", label: "برنامه‌ی بدنسازی هوشمند", note: "برنامه‌ی تمرینی ساخته‌شده با هوش‌مصنوعی" },
  { path: "/calorie-counter", label: "کالری‌شمار فارسی", note: "محاسبه‌ی نیاز روزانه و اسکن هوشمند غذا" },
  { path: "/trading-journal", label: "ژورنال معاملاتی", note: "ثبت معاملات، آمار عملکرد، چک‌لیست ورود" },
  { path: "/ai-planner", label: "برنامه‌ریز هوشمند", note: "پیشنهادهای برنامه‌ریزی با کمک هوش‌مصنوعی" },
  { path: "/economic-calendar", label: "تقویم اقتصادی", note: "رویدادهای مهم اقتصادی برای معامله‌گران" },
  { path: "/forex-sessions", label: "ساعت جلسه‌های بازار فارکس", note: "زمان باز/بسته‌شدن بازارهای فارکس" },
  { path: "/learning-roadmap", label: "رودمپ یادگیری هوش‌مصنوعی", note: "به‌زودی برای عموم — فعلا در دسترس نیست" },
  { path: "/blog", label: "مقاله‌ها", note: "راهنماهای کاربردی درباره‌ی روتین، عادت و ترید" },
  { path: "/faq", label: "سوالات متداول", note: "پاسخ سوال‌های رایج درباره‌ی همه‌ی بخش‌ها" },
  { path: "/about", label: "درباره آریون", note: "معرفی تیم، تماس و شبکه‌های اجتماعی" },
];

export const FACTS_FA = {
  what: `${BRAND_FA} یک اپلیکیشن وب فارسی (PWA) برای مدیریت زندگی روزمره است.`,
  who: "برای کاربران فارسی‌زبانی که می‌خواهند روتین روزانه، ورزش و تغذیه، یا ژورنال معاملات ترید خود را در یک حساب واحد پیگیری کنند.",
  pricing: "بخش‌های روتین، کارهای روزانه و خواب همیشه رایگان‌اند. بخش‌های ورزش/تغذیه، ژورنال ترید و رودمپ یادگیری اشتراکی‌اند و با یک دوره‌ی آزمایشی رایگان شروع می‌شوند.",
  platforms: "وب‌اپ با پشتیبانی PWA — قابل نصب روی اندروید و iOS از طریق مرورگر (بدون نیاز به فروشگاه اپ).",
  language: "فارسی، با تقویم شمسی (جلالی)، جهت راست‌به‌چپ.",
  contact: SUPPORT_EMAIL,
  socials: [SOCIAL.telegram.url, SOCIAL.instagram.url],
} as const;

export const DESCRIPTION_FA = BRAND_DESC;
export const FEATURES_FA = FEATURE_LIST_FA;

export function llmsFaqs(): { q: string; a: string }[] {
  return sortedPosts().slice(0, 8).map((p) => ({ q: p.title, a: p.description }));
}
