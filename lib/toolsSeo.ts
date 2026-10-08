// JSON-LD مشترک صفحه‌های ابزار رایگان
import { absoluteUrl } from "./seo";

export function webApplicationJsonLd(opts: {
  name: string;
  description: string;
  path: string;
  category: "HealthApplication" | "FinanceApplication" | "UtilitiesApplication";
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: opts.name,
    description: opts.description,
    url: absoluteUrl(opts.path),
    applicationCategory: opts.category,
    operatingSystem: "Web",
    inLanguage: "fa-IR",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "IRR" },
  };
}

export function itemListJsonLd(items: { path: string; label: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.label,
      url: absoluteUrl(t.path),
    })),
  };
}
