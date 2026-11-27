// JSON-LD مشترک صفحه‌های ابزار رایگان عمومی (ماشین‌حساب‌های سئو):
// BreadcrumbList + FAQPage + WebApplication اختصاصی همان ابزار.
import { BRAND_FA } from "./brand";
import { ORGANIZATION_ID, absoluteUrl, breadcrumbJsonLd, faqJsonLd } from "./seo";

export function toolJsonLd(opts: {
  path: string;
  name: string;
  description: string;
  category: "HealthApplication" | "FinanceApplication" | "LifestyleApplication";
  breadcrumb: { name: string; path: string }[];
  faqs: { q: string; a: string }[];
}): Record<string, unknown>[] {
  return [
    breadcrumbJsonLd(opts.breadcrumb),
    faqJsonLd(opts.faqs),
    {
      "@context": "https://schema.org",
      "@type": ["WebApplication", "SoftwareApplication"],
      name: opts.name,
      url: absoluteUrl(opts.path),
      description: opts.description,
      applicationCategory: opts.category,
      operatingSystem: "Web",
      browserRequirements: "نیاز به مرورگر مدرن با پشتیبانی JavaScript",
      inLanguage: "fa-IR",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "IRR" },
      publisher: { "@id": ORGANIZATION_ID },
      provider: { "@type": "Organization", name: BRAND_FA },
    },
  ];
}
