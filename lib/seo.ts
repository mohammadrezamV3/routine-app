import type { Metadata } from "next";
import {
  BRAND_ALT_NAMES, BRAND_BOTH, BRAND_CATEGORY_FA, BRAND_DESC, BRAND_EN, BRAND_FA,
  BRAND_SAME_AS, OG_BASE,
} from "./brand";

/**
 * تنها منبعِ آدرسِ سایت. هرجا آدرس مطلق لازم است (canonical، JSON-LD،
 * sitemap، robots) باید از این‌جا بیاید — نه هاردکد. قبلا همین یک رشته در
 * چهار فایل جدا تکرار شده بود؛ یک بار عوض‌شدنِ دامنه یعنی چهار جای فراموش‌شدنی.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://arionapp.ir").replace(/\/$/, "");

/** آدرس مطلقِ کانونیکال از یک مسیر نسبی. همیشه بدون اسلشِ انتهایی (به‌جز ریشه). */
export function absoluteUrl(path: string): string {
  if (!path || path === "/") return SITE_URL;
  const clean = `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;
  return `${SITE_URL}${clean}`;
}

/**
 * متادیتای یک صفحه‌ی عمومیِ قابل‌ایندکس.
 *
 * سه اشتباهِ تکرارشونده را یک‌جا حل می‌کند:
 *  ۱) `title.absolute` تا قالبِ «%s | Arion آریون» دوباره نام برند را به
 *     عنوانی که خودش برند دارد نچسباند (عنوانِ بلند در نتیجه بریده می‌شود).
 *  ۲) spread کردن `OG_BASE` — نکست `openGraph` را بین layout و page ادغام
 *     نمی‌کند، جایگزین می‌کند؛ بدون این، صفحه og:image خودش را از دست می‌دهد.
 *  ۳) `twitter` که اگر تعریف نشود، کارتِ لینک در شبکه‌های اجتماعی بی‌تصویر می‌ماند.
 */
export function pageMetadata({
  title,
  description,
  path,
  ogTitle,
}: {
  title: string;
  description: string;
  path: string;
  /** اگر عنوانِ کارتِ اشتراک‌گذاری باید کوتاه‌تر از عنوانِ تبِ مرورگر باشد */
  ogTitle?: string;
}): Metadata {
  const canonical = path === "/" ? "/" : `/${path.replace(/^\/+/, "")}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: { ...OG_BASE, url: canonical, title: ogTitle || title, description },
    twitter: { card: "summary_large_image", title: ogTitle || title, description, images: ["/og.png"] },
  };
}

type JsonLd = Record<string, unknown>;

/**
 * BreadcrumbList — به گوگل می‌گوید این صفحه کجای ساختار سایت است و در
 * نتیجه‌ی جست‌وجو به‌جای URL خام، مسیر خوانا نشان داده می‌شود.
 * `items` باید دقیقا همان مسیری باشد که در خودِ صفحه هم دیده می‌شود.
 */
export function breadcrumbJsonLd(items: { name: string; path: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

/**
 * FAQPage — فقط وقتی مجاز است که *دقیقا* همین پرسش/پاسخ‌ها در خود صفحه
 * دیده شوند. برای همین این تابع همان آرایه‌ای را می‌گیرد که کامپوننت
 * نمایش‌دهنده هم می‌گیرد؛ هیچ راهی نمی‌ماند که این دو از هم واگرا شوند.
 */
export function faqJsonLd(faqs: { q: string; a: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/**
 * SoftwareApplication — توصیفِ خودِ محصول.
 *
 * عمدا بدون `aggregateRating`، `review`، `offers` و تعداد دانلود: آریون
 * هنوز هیچ‌کدام از این داده‌ها را واقعی ندارد و ساختنشان هم نقضِ
 * راهنمای گوگل است هم ریسکِ جریمه‌ی دستی.
 */
export function softwareApplicationJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: BRAND_BOTH,
    alternateName: BRAND_ALT_NAMES,
    url: SITE_URL,
    // دسته‌ی درستِ schema.org برای اپِ برنامه‌ریزی/بهره‌وری. قبلا
    // LifestyleApplication بود که برای یک روتین اپ دقیق نیست.
    applicationCategory: "ProductivityApplication",
    operatingSystem: "Web",
    browserRequirements: "نیاز به مرورگر مدرن با پشتیبانی JavaScript",
    inLanguage: "fa-IR",
    description: BRAND_DESC,
    softwareHelp: absoluteUrl("/faq"),
    publisher: { "@type": "Organization", name: BRAND_EN, url: SITE_URL },
    sameAs: BRAND_SAME_AS,
  };
}

/** برای صفحه‌های محتوایی (مقاله‌های بلاگ) */
export function articleJsonLd({
  title,
  description,
  path,
  published,
  modified,
}: {
  title: string;
  description: string;
  path: string;
  published: string;
  modified?: string;
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    inLanguage: "fa-IR",
    mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(path) },
    datePublished: published,
    dateModified: modified || published,
    author: { "@type": "Organization", name: BRAND_EN, url: SITE_URL },
    publisher: {
      "@type": "Organization",
      name: BRAND_EN,
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: absoluteUrl("/icon.png") },
    },
  };
}

/** برچسبِ دسته که در چند صفحه تکرار می‌شود */
export const CATEGORY_LABEL = `${BRAND_CATEGORY_FA} ${BRAND_FA}`;
