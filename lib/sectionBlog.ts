// بلاگ روی زیردامنه‌ی هر بخش: فقط دسته‌های همون بخش (SECTION_META[section].blogCategories).
// خالص و بدون import سروری. دامنه‌ی اصلی (section = null) همه‌ی دسته‌ها رو داره، مثل قبل.
// صاحب هر دسته = اولین بخشی که اون دسته رو در blogCategories داره (مثلا «خواب» مال routine)؛
// canonical مقاله و دسته همیشه روی میزبان صاحبشه؛ مقاله‌ی دسته‌ی بخش دیگه در همین دامنه نمایش داده می‌شه.
import type { Metadata } from "next";
import { BLOG_CATEGORY_KEYS } from "@/lib/blog/categories";
import type { BlogCategoryKey, BlogPost } from "@/lib/blog/types";
import { OG_BASE } from "@/lib/brand";
import { tr } from "@/lib/i18n";
import { BLOG_POSTS } from "@/lib/blogPosts";
import { SECTION_KEYS, SECTION_META, isSectionHostingEnabled, pathAllowedIn, sectionOrigin, type SectionKey } from "@/lib/sections";
import { SITE_URL } from "@/lib/seo";

/** صاحب دسته‌ی بلاگ (برای canonical و ریدایرکت)، یا null اگه هیچ بخشی نداره */
export function blogCategoryOwner(cat: BlogCategoryKey): SectionKey | null {
  return SECTION_KEYS.find((k) => SECTION_META[k].blogCategories.includes(cat)) ?? null;
}

/** آیا این دسته روی این میزبان نمایش داده می‌شه؟ (دامنه‌ی اصلی = همه) */
export function blogCategoryVisible(section: SectionKey | null, cat: BlogCategoryKey): boolean {
  return !section || SECTION_META[section].blogCategories.includes(cat);
}

export function visibleBlogCategories(section: SectionKey | null): BlogCategoryKey[] {
  return BLOG_CATEGORY_KEYS.filter((k) => blogCategoryVisible(section, k));
}

export function filterPostsForSection<T extends Pick<BlogPost, "category">>(posts: T[], section: SectionKey | null): T[] {
  return section ? posts.filter((p) => blogCategoryVisible(section, p.category)) : posts;
}

/**
 * آیا لینک داخلی (داخل متن مقاله، لینک‌های مرتبط) روی این میزبان مجازه؟
 * لینک به مقاله/دسته‌ی بخش دیگه یا مسیر مال بخش دیگه (مثلا /calorie-counter روی routine) نمایش داده نمی‌شه.
 */
export function blogHrefAllowed(section: SectionKey | null, href: string): boolean {
  if (!section) return true;
  const cat = /^\/blog\/category\/([^/?#]+)/.exec(href);
  if (cat) return (BLOG_CATEGORY_KEYS as string[]).includes(cat[1]) && blogCategoryVisible(section, cat[1] as BlogCategoryKey);
  const post = /^\/blog\/([^/?#]+)/.exec(href);
  if (post && post[1] !== "feed.xml") {
    const found = BLOG_POSTS.find((p) => p.slug === post[1]);
    return !!found && blogCategoryVisible(section, found.category);
  }
  return pathAllowedIn(section, href.split(/[?#]/)[0]);
}

/** origin یک میزبان (بخش یا دامنه‌ی اصلی)؛ بدون زیردامنه‌ها همیشه دامنه‌ی اصلی */
export function hostOrigin(section: SectionKey | null): string {
  return (section && sectionOrigin(section, SITE_URL)) || SITE_URL;
}

/** آدرس مطلق canonical: روی میزبان صاحب دسته (وقتی زیردامنه‌ها روشنن)، وگرنه دامنه‌ی اصلی مثل قبل */
export function blogCanonicalUrl(path: string, cat?: BlogCategoryKey): string {
  const clean = path === "/" ? "" : `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;
  if (!isSectionHostingEnabled() || !cat) return `${SITE_URL}${clean}`;
  return `${hostOrigin(blogCategoryOwner(cat))}${clean}`;
}

/** canonical صفحه‌ی فهرست بلاگ: خود میزبان */
export function blogIndexCanonical(section: SectionKey | null): string {
  return `${hostOrigin(isSectionHostingEnabled() ? section : null)}/blog`;
}

/**
 * بخشی که یک مقاله/دسته با اون نمایش داده می‌شه. دامنه هیچ‌وقت عوض نمی‌شه (PWA): اگه دسته مال بخش
 * موثر نیست همین‌جا و با بخش صاحب دسته نمایش داده می‌شه (فهرست، مرتبط‌ها و لینک‌ها مال همون بخش)؛
 * canonical همچنان روی میزبان صاحب دسته می‌مونه (blogCanonicalUrl).
 */
export function blogViewSection(section: SectionKey | null, cat: BlogCategoryKey): SectionKey | null {
  if (!section || blogCategoryVisible(section, cat)) return section;
  return blogCategoryOwner(cat);
}

/** متادیتای صفحه‌های بلاگ با canonical و فید RSS درست هر میزبان */
export function blogMetadata({
  title, description, canonical, section, ogTitle, ownOgImage,
}: {
  title: string;
  description: string;
  canonical: string;
  section: SectionKey | null;
  ogTitle?: string;
  ownOgImage?: boolean;
}): Metadata {
  const feed = `${hostOrigin(isSectionHostingEnabled() ? section : null)}/blog/feed.xml`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical, languages: { "fa-IR": canonical, "x-default": canonical }, types: { "application/rss+xml": feed } },
    openGraph: { ...OG_BASE, ...(ownOgImage ? { images: undefined } : {}), url: canonical, title: ogTitle || title, description },
    twitter: { card: "summary_large_image", title: ogTitle || title, description, ...(ownOgImage ? {} : { images: ["/og.png"] }) },
  };
}

/** متن مقدمه، عنوان و فید بلاگ برای هر میزبان */
export function blogIntro(section: SectionKey | null): string {
  if (section === "routine") {
    return tr(
      "راهنماهای کاربردی درباره‌ی روتین روزانه، عادت‌سازی، برنامه‌ریزی و خواب. هر مقاله به یک سوال مشخص جواب می‌دهد، نه بیشتر.",
      "Practical guides on daily routines, habit building, planning and sleep. Each article answers one specific question, no more.",
    );
  }
  if (section === "workout") {
    return tr(
      "راهنماهای کاربردی درباره‌ی بدنسازی، تغذیه، کالری و خواب. هر مقاله به یک سوال مشخص جواب می‌دهد، نه بیشتر.",
      "Practical guides on workouts, nutrition, calories and sleep. Each article answers one specific question, no more.",
    );
  }
  if (section === "trade") {
    return tr(
      "راهنماهای کاربردی درباره‌ی ژورنال معاملاتی، مدیریت سرمایه، حجم لات، تقویم اقتصادی و سشن‌های فارکس. هر مقاله به یک سوال مشخص جواب می‌دهد، نه بیشتر.",
      "Practical guides on the trading journal, money management, lot size, the economic calendar and forex sessions. Each article answers one specific question, no more.",
    );
  }
  return tr(
    "راهنماهای کاربردی درباره‌ی روتین روزانه، عادت‌سازی، برنامه‌ریزی، خواب، بدنسازی، کالری و ژورنال " +
      "معاملاتی. هر مقاله به یک سوال مشخص جواب می‌دهد، نه بیشتر.",
    "Practical guides on daily routines, habit building, planning, sleep, workouts, calories and the trading " +
      "journal. Each article answers one specific question, no more.",
  );
}

export function blogSignupLine(section: SectionKey | null): string {
  if (section === "routine") return tr("روتین، خواب و رودمپ در یک اپ.", "Routine, sleep and roadmaps in one app.");
  if (section === "workout") return tr("برنامه تمرینی، کالری و خواب در یک اپ.", "Workout plan, calories and sleep in one app.");
  if (section === "trade") return tr("ژورنال ترید، تقویم اقتصادی و متاتریدر در یک اپ.", "Trading journal, economic calendar and MetaTrader in one app.");
  return tr("روتین، خواب، تمرین و ژورنال ترید در یک اپ.", "Routine, sleep, training and a trading journal in one app.");
}

export function blogSignupCta(section: SectionKey | null): string {
  if (section === "workout" || section === "trade") return tr("امتحان رایگان 3 روزه", "Try it free for 3 days");
  return tr("امتحان رایگان 14 روزه", "Try it free for 14 days");
}
