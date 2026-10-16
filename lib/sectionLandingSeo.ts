// متادیتا و JSON-LD لندینگ هر بخش روی "/" زیردامنه‌ها (فقط سرور: app/page.tsx).
// canonical و og:url همیشه ریشه‌ی خود زیردامنه‌ست (نه دامنه‌ی اصلی)، چون metadataBase لایه‌ی ریشه
// دامنه‌ی اصلیه و آدرس نسبی رو به اون می‌چسبونه.
import type { Metadata } from "next";
import { BRAND_EN, OG_BASE } from "@/lib/brand";
import { isEn } from "@/lib/i18n";
import { SECTION_META, sectionOrigin, type SectionKey } from "@/lib/sections";
import { getSectionSeo } from "@/lib/sectionLanding";
import { ORGANIZATION_ID, WEBSITE_ID, SITE_URL, faqJsonLd } from "@/lib/seo";

type JsonLd = Record<string, unknown>;

function originOf(section: SectionKey): string {
  // وقتی بخش ست شده یعنی زیردامنه‌ها روشنن؛ پشتیبان فقط برای تست/خطای پیکربندی
  return sectionOrigin(section) ?? SITE_URL;
}

export function sectionLandingMetadata(section: SectionKey): Metadata {
  const en = isEn();
  const seo = getSectionSeo(section);
  const origin = originOf(section);
  const image = { url: `${origin}/opengraph-image`, width: 1200, height: 630, alt: seo.appName };
  return {
    title: { absolute: seo.title },
    description: seo.description,
    keywords: seo.keywords,
    alternates: {
      canonical: origin,
      languages: { [en ? "en" : "fa-IR"]: origin, "x-default": origin },
      types: { "application/rss+xml": `${origin}/blog/feed.xml` },
    },
    openGraph: {
      ...OG_BASE,
      locale: en ? "en_US" : OG_BASE.locale,
      siteName: seo.appName,
      images: [image],
      url: origin,
      title: seo.title,
      description: seo.description,
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: [image.url],
    },
  };
}

const APP_ID = (origin: string) => `${origin}/#software`;

/** WebPage + SoftwareApplication مخصوص بخش + FAQPage (با همون پرسش‌های دیده‌شده در صفحه) */
export function sectionLandingJsonLd(section: SectionKey, faqs: { q: string; a: string }[]): JsonLd[] {
  const seo = getSectionSeo(section);
  const origin = originOf(section);
  const lang = isEn() ? "en" : "fa-IR";
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${origin}/#webpage`,
      url: origin,
      name: seo.title,
      description: seo.description,
      inLanguage: lang,
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": APP_ID(origin) },
      publisher: { "@id": ORGANIZATION_ID },
    },
    {
      "@context": "https://schema.org",
      "@type": ["SoftwareApplication", "WebApplication"],
      "@id": APP_ID(origin),
      name: seo.appName,
      alternateName: [`${BRAND_EN} ${SECTION_META[section].wordmark}`, `${BRAND_EN} ${SECTION_META[section].label}`],
      url: origin,
      applicationCategory: seo.category,
      operatingSystem: "Web, Android, iOS (PWA)",
      inLanguage: lang,
      description: seo.description,
      featureList: seo.featureList,
      isPartOf: { "@id": `${SITE_URL}/#software` },
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "IRR",
        description: seo.offerNote,
      },
      publisher: { "@id": ORGANIZATION_ID },
    },
    faqJsonLd(faqs),
  ];
}

