import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogList } from "@/components/BlogList";
import { BLOG_CATEGORY_KEYS, isBlogCategory, localizedBlogCategory } from "@/lib/blog/categories";
import { brandName } from "@/lib/brand";
import { tr } from "@/lib/i18n";
import { postsInCategory } from "@/lib/blogPosts";
import { blogCanonicalUrl, blogMetadata, blogViewSection, filterPostsForSection, hostOrigin } from "@/lib/sectionBlog";
import { getHostSection, getSection } from "@/lib/sectionServer";
import { breadcrumbJsonLd } from "@/lib/seo";

const CAT_KW: Record<string, () => string> = {
  routine: () => tr(
    "مقاله روتین روزانه|روتین روزانه|ساخت روتین روزانه|روتین صبحگاهی|روتین شبانه|روتین اپ|برنامه روتین روزانه|چطور روتین بسازیم|نظم در زندگی|برنامه روزانه|روتین صبح و شب|زود بیدار شدن",
    "daily routine articles|build a daily routine|morning routine|night routine|routine app|stay organised|daily schedule",
  ),
  habits: () => tr(
    "مقاله عادت سازی|عادت سازی|ساخت عادت جدید|ترک عادت بد|چالش 21 روزه|استریک|هبیت ترکر|عادت های خوب|چطور عادت بسازیم|ردیاب عادت|اهمال کاری|چک لیست عادت",
    "habit building articles|build a habit|break a bad habit|habit streak|habit tracker|21 day challenge",
  ),
  planning: () => tr(
    "مقاله برنامه ریزی|برنامه ریزی روزانه|برنامه ریزی هفتگی|مدیریت زمان|تکنیک پومودورو|ماتریس آیزنهاور|اهداف اسمارت|برنامه درسی روزانه|برنامه ریزی کنکور|جدول مطالعه|تمرکز|اهمال کاری",
    "planning articles|daily planning|weekly planning|time management|pomodoro technique|eisenhower matrix|SMART goals|study schedule",
  ),
  sleep: () => tr(
    "مقاله خواب|چرخه خواب|چرخه های خواب|بهترین ساعت بیدار شدن|ساعت خواب مناسب|چند ساعت خواب لازم است|محاسبه خواب|روتین قبل از خواب|کم خوابی|خواب عمیق و رم|برنامه خواب منظم",
    "sleep articles|sleep cycles|best time to wake up|how many hours of sleep|sleep calculator|bedtime routine",
  ),
  fitness: () => tr(
    "مقاله بدنسازی|برنامه بدنسازی|برنامه بدنسازی مبتدی|برنامه بدنسازی 3 روزه|برنامه بدنسازی 4 روزه|برنامه بدنسازی 5 روزه|برنامه بدنسازی بانوان|برنامه تمرینی در خانه|بدنسازی در خانه|حرکات سینه|برنامه فول بادی|تقسیم بندی عضلات|برنامه تمرینی باشگاه",
    "bodybuilding articles|bodybuilding program|beginner gym program|home workout|chest exercises|full body workout|gym split",
  ),
  nutrition: () => tr(
    "مقاله تغذیه و کالری|محاسبه کالری روزانه|کسری کالری|محاسبه BMR|محاسبه TDEE|چقدر پروتئین بخورم|شاخص توده بدنی|رژیم لاغری|رژیم حجم|کاردیو برای چربی سوزی|برنامه غذایی|کالری شمار|وزن ایده آل",
    "nutrition and calorie articles|calorie calculation|calorie deficit|BMR TDEE|how much protein|BMI|weight loss plan|bulking diet",
  ),
  trading: () => tr(
    "مقاله ترید و فارکس|آموزش فارکس|فارکس برای مبتدیان|ژورنال ترید|مدیریت سرمایه در فارکس|حجم لات|پیپ چیست|حد ضرر و حد سود|ریسک به ریوارد|ساعت بازار فارکس به وقت ایران|تقویم اقتصادی فارکس|روانشناسی ترید|معامله طلا|اسپرد چیست|لوریج و مارجین",
    "forex and trading articles|learn forex|trading journal|money management|lot size|what is a pip|stop loss|risk reward|forex market hours|economic calendar|trading psychology",
  ),
};

export function generateStaticParams() {
  return BLOG_CATEGORY_KEYS.map((cat) => ({ cat }));
}

export function generateMetadata({ params }: { params: { cat: string } }): Metadata {
  if (!isBlogCategory(params.cat)) return { title: { absolute: tr("صفحه پیدا نشد", "Page not found") }, robots: { index: false, follow: false } };
  const cat = localizedBlogCategory(params.cat);
  return blogMetadata({
    title: `${cat.title} | ${brandName()}`,
    description: cat.intro,
    canonical: blogCanonicalUrl(`/blog/category/${params.cat}`, params.cat),
    section: getHostSection(),
    ogTitle: cat.title,
    ownOgImage: true,
    keywords: (CAT_KW[params.cat]?.() ?? "").split("|").filter(Boolean),
  });
}

export default function BlogCategoryPage({ params }: { params: { cat: string } }) {
  if (!isBlogCategory(params.cat)) notFound();
  const key = params.cat;
  // دسته‌ی بخش دیگه: همین‌جا و با بخش صاحب دسته نمایش داده می‌شه (دامنه عوض نمی‌شه)
  const section = blogViewSection(getSection(), key);
  const cat = localizedBlogCategory(key);
  const posts = filterPostsForSection(postsInCategory(key), section);
  const path = `/blog/category/${key}`;

  const origin = hostOrigin(getHostSection());
  const jsonLd = [
    section
      ? {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { name: brandName(), path: "/" },
            { name: tr("مقاله‌ها", "Articles"), path: "/blog" },
            { name: cat.label, path },
          ].map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: `${origin}${it.path === "/" ? "" : it.path}` })),
        }
      : breadcrumbJsonLd([
          { name: brandName(), path: "/" },
          { name: tr("مقاله‌ها", "Articles"), path: "/blog" },
          { name: cat.label, path },
        ]),
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: cat.title,
      description: cat.intro,
      url: blogCanonicalUrl(path, key),
      inLanguage: "fa-IR",
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: posts.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: blogCanonicalUrl(`/blog/${p.slug}`, p.category),
        name: p.title,
      })),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BlogList posts={posts} intro={cat.intro} heading={cat.title} category={key} categoryLabel={cat.label} section={section} />
    </>
  );
}
