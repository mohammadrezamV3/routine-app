import type { Metadata } from "next";
import { BlogList } from "@/components/BlogList";
import { BRAND_FA, brandName } from "@/lib/brand";
import { tr } from "@/lib/i18n";
import { sortedPosts } from "@/lib/blogPosts";
import { blogCanonicalUrl, blogIndexCanonical, blogIntro, blogMetadata, filterPostsForSection } from "@/lib/sectionBlog";
import { getHostSection, getSection } from "@/lib/sectionServer";
import { SECTION_META } from "@/lib/sections";
import { breadcrumbJsonLd } from "@/lib/seo";

function titles(section: ReturnType<typeof getSection>) {
  const brand = brandName();
  if (section) {
    const label = SECTION_META[section].label;
    return {
      meta: tr(`مقاله‌های ${BRAND_FA} ${label}`, `${brand} ${label} articles`),
      heading: tr(`مقاله‌های ${BRAND_FA} ${label}`, `${brand} ${label} articles`),
    };
  }
  return {
    meta: tr(`مقاله‌های برنامه ریزی روزانه، بدنسازی و فارکس | ${BRAND_FA}`, `${brand} articles on daily planning, workouts and forex`),
    heading: tr("مقاله‌های آریون درباره نظم، روتین، سلامت و ترید", `${brand} articles on discipline, routines, health and trading`),
  };
}

const BLOG_KW = {
  routine: () => tr(
    "مقاله روتین روزانه|روتین روزانه|برنامه ریزی روزانه|ساخت عادت|ترک عادت بد|روتین صبحگاهی|روتین شبانه|مدیریت زمان|تکنیک پومودورو|برنامه درسی روزانه|چرخه خواب|ساعت خواب مناسب|زود بیدار شدن|اهمال کاری|ماتریس آیزنهاور|برنامه هفتگی",
    "daily routine articles|daily planning|build a habit|break a bad habit|morning routine|time management|pomodoro technique|study schedule|sleep cycles|wake up early|procrastination|weekly planning",
  ),
  workout: () => tr(
    "مقاله بدنسازی|برنامه بدنسازی|برنامه بدنسازی مبتدی|برنامه بدنسازی 3 روزه|برنامه بدنسازی 4 روزه|برنامه بدنسازی 5 روزه|برنامه بدنسازی بانوان|برنامه تمرینی در خانه|محاسبه کالری روزانه|کسری کالری|چقدر پروتئین بخورم|رژیم لاغری|رژیم حجم|کاردیو برای چربی سوزی|شاخص توده بدنی|حرکات سینه",
    "bodybuilding articles|bodybuilding program|beginner gym program|home workout|calorie calculation|calorie deficit|how much protein|weight loss plan|bulking diet|cardio for fat loss|BMI|chest exercises",
  ),
  trade: () => tr(
    "مقاله فارکس|آموزش فارکس|فارکس برای مبتدیان|ژورنال ترید|ژورنال معاملاتی|مدیریت سرمایه در فارکس|حجم لات|پیپ چیست|حد ضرر و حد سود|ریسک به ریوارد|ساعت بازار فارکس به وقت ایران|تقویم اقتصادی فارکس|روانشناسی ترید|معامله طلا|اسپرد چیست|لوریج و مارجین|نون فارم",
    "forex articles|learn forex|forex for beginners|trading journal|money management forex|lot size|what is a pip|stop loss take profit|risk reward ratio|forex market hours|economic calendar|trading psychology|gold trading",
  ),
  all: () => tr(
    "مقاله روتین روزانه|برنامه ریزی روزانه|ساخت عادت|برنامه بدنسازی|محاسبه کالری|آموزش فارکس|ژورنال ترید|ساعت بازار فارکس|مدیریت زمان|چرخه خواب|رژیم لاغری|مدیریت سرمایه در فارکس|مقاله های آریون|روتین صبحگاهی|حجم لات|برنامه بدنسازی مبتدی",
    "routine articles|daily planning|habit building|bodybuilding program|calorie calculation|learn forex|trading journal|forex market hours|time management|sleep cycles|weight loss plan|money management forex",
  ),
};

function blogKeywords(section: ReturnType<typeof getSection>): string[] {
  return BLOG_KW[section ?? "all"]().split("|");
}

export function generateMetadata(): Metadata {
  // متن از بخش موثر؛ canonical و فید از میزبان
  const section = getSection();
  const host = getHostSection();
  return blogMetadata({
    title: titles(section).meta,
    description: blogIntro(section),
    canonical: blogIndexCanonical(host),
    section: host,
    keywords: blogKeywords(section),
  });
}

export default function BlogIndexPage() {
  const section = getSection();
  const posts = filterPostsForSection(sortedPosts(), section);
  const brand = brandName();
  const origin = blogIndexCanonical(getHostSection()).replace(/\/blog$/, "");
  const introText = blogIntro(section);
  const t = titles(section);
  const crumb = (path: string) => `${origin}${path === "/" ? "" : path}`;

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { name: brand, path: "/" },
      { name: tr("مقاله‌ها", "Articles"), path: "/blog" },
    ].map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: crumb(it.path) })),
  };

  // ItemList فهرست مقاله‌ها را توصیف می‌کند — دقیقا همان چیزی که روی صفحه
  // دیده می‌شود، به همان ترتیب. آدرس هر مقاله canonical خودشه.
  const listJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: posts.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: blogCanonicalUrl(`/blog/${p.slug}`, p.category),
      name: p.title,
    })),
  };

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: section ? t.meta : tr(`مقاله‌های ${BRAND_FA}`, `${brand} articles`),
    description: introText,
    url: blogIndexCanonical(getHostSection()),
    inLanguage: "fa-IR",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(section ? [breadcrumb, collectionJsonLd, listJsonLd] : [breadcrumbJsonLd([{ name: brand, path: "/" }, { name: tr("مقاله‌ها", "Articles"), path: "/blog" }]), collectionJsonLd, listJsonLd]) }}
      />
      <BlogList posts={posts} intro={introText} heading={t.heading} section={section} />
    </>
  );
}
