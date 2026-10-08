/**
 * قرارداد مشترک محتوای بلاگ. بلاک‌ها عمدا داده‌اند نه HTML خام: هم
 * `dangerouslySetInnerHTML` لازم نمی‌شود، هم سلسله‌مراتب تیترها (یک H1، بعد
 * H2/H3) ساختاری می‌ماند و فهرست مطالب از روی همین H2ها ساخته می‌شود.
 */

export type BlogCategoryKey = "routine" | "habits" | "planning" | "sleep" | "fitness" | "nutrition" | "trading";

export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  /** فهرست مرحله‌ای (شماره‌دار) */
  | { type: "ol"; items: string[] }
  /** نکته‌ی برجسته وسط متن */
  | { type: "tip"; title?: string; text: string }
  /** جدول ساده؛ همه‌ی ردیف‌ها هم‌طول head */
  | { type: "table"; head: string[]; rows: string[][] }
  /** دعوت به یک صفحه‌ی داخلی (ابزار یا بخش آریون) وسط مقاله */
  | { type: "cta"; text: string; href: string; label: string };

export type BlogFaq = { q: string; a: string };

export type BlogPost = {
  slug: string;
  title: string;
  /** عنوان تب مرورگر/نتیجه‌ی گوگل — اگر نبود از `title` ساخته می‌شود */
  metaTitle?: string;
  description: string;
  category: BlogCategoryKey;
  /** کلیدواژه‌های اصلی مقاله (برای metadata و schema) */
  keywords?: string[];
  /** تاریخ ISO — واقعی است (تاریخ نوشته‌شدن)، نه تاریخ ساختگی «تازه» */
  published: string;
  updated?: string;
  /** خلاصه‌ی یک‌خطی برای فهرست بلاگ */
  excerpt: string;
  readingMinutes: number;
  /** سه تا پنج جمله‌ی کوتاه «خلاصه در یک نگاه» بالای مقاله */
  takeaways?: string[];
  blocks: BlogBlock[];
  /** پرسش‌های پرتکرار ته مقاله — همین‌ها FAQPage schema می‌شوند */
  faq?: BlogFaq[];
  /** لینک‌های داخلی انتهای مقاله */
  related: { href: string; label: string }[];
};
